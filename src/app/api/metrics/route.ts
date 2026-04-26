import { NextResponse } from 'next/server';
import os from 'os';

export async function GET() {
  try {
    // 1. Hitung RAM Real
    const totalRam = os.totalmem();
    const freeRam = os.freemem();
    const ramUsage = Math.round(((totalRam - freeRam) / totalRam) * 100);

    // 2. Hitung CPU Real (menggunakan load average 1 menit)
    // loadavg returns [1m, 5m, 15m] load. Kita bagi dengan jumlah CPU core.
    const cpus = os.cpus().length;
    const load = os.loadavg()[0];
    const cpuUsage = Math.min(Math.round((load / cpus) * 100), 100);

    // 3. Dapatkan List Proses Realtime (Top 10 by RAM)
    // Kita gunakan ps aux agar lebih detail
    const { stdout: psOutput } = await execAsync('ps aux --sort=-%mem | head -n 11');

    return NextResponse.json({
      cpu: cpuUsage,
      ram: ramUsage,
      processes: psOutput,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch real metrics' }, { status: 500 });
  }
}

// Webhook auto-deploy test trigger
