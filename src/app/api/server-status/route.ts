import { NextResponse } from 'next/server';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync } from 'fs';

const execAsync = promisify(exec);
const LOG_FILE = '/tmp/metrics-history.log';

export async function GET() {
  try {
    // 1. RAM
    const totalRam = Math.round(os.totalmem() / 1024 / 1024);
    const freeRam = Math.round(os.freemem() / 1024 / 1024);
    const usedRam = totalRam - freeRam;
    const ramPercent = Math.round((usedRam / totalRam) * 100);

    // 2. CPU (load average)
    const cpus = os.cpus().length;
    const load = os.loadavg()[0];
    const cpuPercent = Math.min(Math.round((load / cpus) * 100), 100);

    // 3. Proses (Alpine-compatible)
    let psOutput = 'Tidak ada data proses';
    try {
      const { stdout } = await execAsync('ps aux | head -n 12');
      psOutput = stdout;
    } catch {
      psOutput = 'ps tidak tersedia';
    }

    // 4. Ringkasan historis dari log file
    let historySummary = 'Belum ada data historis (sistem baru dimulai atau log belum tersedia).';
    if (existsSync(LOG_FILE)) {
      const content = readFileSync(LOG_FILE, 'utf8');
      const lines = content.split('\n').filter(Boolean);
      if (lines.length > 0) {
        const entries = lines.map(l => JSON.parse(l));
        const cpuValues = entries.map((e: {cpu: number}) => e.cpu);
        const ramValues = entries.map((e: {ram: number}) => e.ram);
        const maxCpu = Math.max(...cpuValues);
        const maxCpuEntry = entries.find((e: {cpu: number}) => e.cpu === maxCpu);
        const maxRam = Math.max(...ramValues);
        const maxRamEntry = entries.find((e: {ram: number}) => e.ram === maxRam);
        const criticals = entries.filter((e: {cpu: number, ram: number}) => e.cpu > 80 || e.ram > 80);

        historySummary =
          "Periode log: " + entries[0].ts + " s/d " + entries[entries.length - 1].ts + "\n" +
          "Total titik data: " + entries.length + "\n" +
          "CPU tertinggi: " + maxCpu + "% pada " + (maxCpuEntry ? maxCpuEntry.ts : '-') + "\n" +
          "RAM tertinggi: " + maxRam + "% pada " + (maxRamEntry ? maxRamEntry.ts : '-') + "\n" +
          "Event kritis (CPU/RAM > 80%): " + criticals.length + " kali\n" +
          (criticals.length > 0
            ? "Detail event kritis:\n" + criticals.slice(-10).map((e: {ts: string, cpu: number, ram: number}) => e.ts + " | CPU: " + e.cpu + "% | RAM: " + e.ram + "%").join('\n')
            : "Tidak ada event kritis yang tercatat.");
      }
    }

    const cleanOutput =
      "[KONDISI SERVER SAAT INI]\n" +
      "CPU Usage: " + cpuPercent + "% (load avg 1 menit)\n" +
      "RAM Total: " + totalRam + " MB\n" +
      "RAM Terpakai: " + usedRam + " MB (" + ramPercent + "%)\n" +
      "RAM Sisa: " + freeRam + " MB\n\n" +
      "[PROSES AKTIF]\n" +
      psOutput + "\n" +
      "[RIWAYAT PERFORMA SERVER]\n" +
      historySummary;

    return new NextResponse(cleanOutput, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error) {
    return new NextResponse('Gagal mengambil data server: ' + String(error), { status: 500 });
  }
}
