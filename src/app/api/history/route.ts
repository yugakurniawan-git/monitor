import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'fs';
import os from 'os';

const LOG_FILE = '/tmp/metrics-history.log';
const MAX_LINES = 1440; // Simpan 4 jam data (setiap 10 detik = 6 entry/menit * 60 * 4)

export interface MetricEntry {
  ts: string;
  cpu: number;
  ram: number;
}

// Fungsi untuk menulis entry baru ke log file
export function appendMetric(cpu: number, ram: number) {
  const entry: MetricEntry = {
    ts: new Date().toISOString(),
    cpu,
    ram
  };
  appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');

  // Trim file jika terlalu besar (jaga hanya MAX_LINES terakhir)
  if (existsSync(LOG_FILE)) {
    const content = readFileSync(LOG_FILE, 'utf8');
    const lines = content.split('\n').filter(Boolean);
    if (lines.length > MAX_LINES) {
      writeFileSync(LOG_FILE, lines.slice(-MAX_LINES).join('\n') + '\n');
    }
  }
}

// Fungsi untuk membaca dan menganalisis history
function analyzeHistory() {
  if (!existsSync(LOG_FILE)) {
    return { raw: [], summary: 'Belum ada data historis. Sistem baru saja dimulai.' };
  }

  const content = readFileSync(LOG_FILE, 'utf8');
  const lines = content.split('\n').filter(Boolean);
  const entries: MetricEntry[] = lines.map(l => JSON.parse(l));

  if (entries.length === 0) {
    return { raw: [], summary: 'Belum ada data historis.' };
  }

  // Analisis data
  const cpuValues = entries.map(e => e.cpu);
  const ramValues = entries.map(e => e.ram);

  const maxCpu = Math.max(...cpuValues);
  const maxCpuEntry = entries.find(e => e.cpu === maxCpu);
  
  const maxRam = Math.max(...ramValues);
  const maxRamEntry = entries.find(e => e.ram === maxRam);

  // Cari event-event kritis (CPU > 80% atau RAM > 80%)
  const criticalEvents = entries.filter(e => e.cpu > 80 || e.ram > 80);

  const summary =
    "=== RINGKASAN HISTORIS SERVER ===\n" +
    "Periode data: " + entries[0].ts + " s/d " + entries[entries.length - 1].ts + "\n" +
    "Total data points: " + entries.length + "\n\n" +
    "CPU Tertinggi: " + maxCpu + "% pada " + (maxCpuEntry ? maxCpuEntry.ts : '-') + "\n" +
    "RAM Tertinggi: " + maxRam + "% pada " + (maxRamEntry ? maxRamEntry.ts : '-') + "\n\n" +
    "=== EVENT KRITIS (CPU/RAM > 80%) ===\n" +
    (criticalEvents.length === 0
      ? "Tidak ada event kritis dalam periode ini.\n"
      : criticalEvents.slice(-20).map(e => e.ts + " | CPU: " + e.cpu + "% | RAM: " + e.ram + "%").join('\n') + '\n') +
    "\n=== DATA TERBARU (30 Terakhir) ===\n" +
    entries.slice(-30).map(e => e.ts + " | CPU: " + e.cpu + "% | RAM: " + e.ram + "%").join('\n');

  return { raw: entries.slice(-50), summary };
}

export async function GET() {
  try {
    const { raw, summary } = analyzeHistory();
    
    // Ambil data system saat ini juga
    const totalRam = os.totalmem();
    const freeRam = os.freemem();
    const ramNow = Math.round(((totalRam - freeRam) / totalRam) * 100);
    const cpuNow = Math.min(Math.round((os.loadavg()[0] / os.cpus().length) * 100), 100);

    // Tulis entry baru
    appendMetric(cpuNow, ramNow);

    return NextResponse.json({
      summary,
      latestEntries: raw,
      current: { cpu: cpuNow, ram: ramNow }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read history: ' + String(error) }, { status: 500 });
  }
}
