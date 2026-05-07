import { NextResponse } from 'next/server';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { appendMetric } from '../history/route';

const execAsync = promisify(exec);

export async function GET() {
  try {
    const totalRamBytes = os.totalmem();
    const freeRamBytes = os.freemem();
    const usedRamBytes = totalRamBytes - freeRamBytes;
    const ramUsage = Math.round((usedRamBytes / totalRamBytes) * 100);
    const totalRamGB = (totalRamBytes / 1024 / 1024 / 1024).toFixed(1);
    const usedRamGB = (usedRamBytes / 1024 / 1024 / 1024).toFixed(1);

    const cpus = os.cpus().length;
    const load1 = os.loadavg()[0];
    const cpuUsage = Math.min(Math.round((load1 / cpus) * 100), 100);

    let diskPercent = 0;
    let diskUsed = '?';
    let diskTotal = '?';
    try {
      const { stdout } = await execAsync('df -h / | tail -1');
      const parts = stdout.trim().split(/\s+/);
      diskTotal = parts[1];
      diskUsed = parts[2];
      diskPercent = parseInt(parts[4]);
    } catch { /* ignore */ }

    let psOutput = 'Tidak ada data proses';
    try {
      const { stdout } = await execAsync('ps aux | head -n 15');
      psOutput = stdout;
    } catch {
      try {
        const { stdout } = await execAsync('cat /proc/*/status 2>/dev/null | grep -E "Name:|VmRSS:" | paste - - | sort -k4 -rn | head -n 10');
        psOutput = stdout || 'Proses tidak bisa dibaca';
      } catch {
        psOutput = 'ps command tidak tersedia';
      }
    }

    appendMetric(cpuUsage, ramUsage);

    return NextResponse.json({
      cpu: cpuUsage,
      load: load1.toFixed(2),
      cpuCores: cpus,
      ram: ramUsage,
      ramUsedGB: usedRamGB,
      ramTotalGB: totalRamGB,
      disk: diskPercent,
      diskUsed,
      diskTotal,
      processes: psOutput,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch metrics: ' + String(error) }, { status: 500 });
  }
}
