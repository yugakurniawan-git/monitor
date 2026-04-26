import { NextResponse } from 'next/server';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    // 1. Hitung RAM Real
    const totalRam = os.totalmem();
    const freeRam = os.freemem();
    const ramUsage = Math.round(((totalRam - freeRam) / totalRam) * 100);

    // 2. Hitung CPU Real (load average 1 menit)
    const cpus = os.cpus().length;
    const load = os.loadavg()[0];
    const cpuUsage = Math.min(Math.round((load / cpus) * 100), 100);

    // 3. Dapatkan List Proses - kompatibel dengan Alpine Linux (BusyBox ps)
    let psOutput = 'Tidak ada data proses';
    try {
      // BusyBox ps tidak support --sort, pakai ps aux biasa lalu sort manual
      const { stdout } = await execAsync('ps aux | head -n 15');
      psOutput = stdout;
    } catch {
      // Fallback: gunakan /proc jika ps gagal
      try {
        const { stdout } = await execAsync('cat /proc/*/status 2>/dev/null | grep -E "Name:|VmRSS:" | paste - - | sort -k4 -rn | head -n 10');
        psOutput = stdout || 'Proses tidak bisa dibaca';
      } catch {
        psOutput = 'ps command tidak tersedia di sistem ini';
      }
    }

    return NextResponse.json({
      cpu: cpuUsage,
      ram: ramUsage,
      processes: psOutput,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch real metrics: ' + String(error) }, { status: 500 });
  }
}
