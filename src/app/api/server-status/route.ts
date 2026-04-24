import { NextResponse } from 'next/server';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    const totalRam = Math.round(os.totalmem() / 1024 / 1024);
    const freeRam = Math.round(os.freemem() / 1024 / 1024);
    const usedRam = totalRam - freeRam;
    const usedPercentage = Math.round((usedRam / totalRam) * 100);

    // Dapatkan 5 aplikasi terberat (hanya nama aplikasi dan % CPU/RAM)
    const { stdout: psOutput } = await execAsync('ps -o comm,%cpu,%mem --sort=-%mem | head -n 6');

    const cleanOutput = 
"[KONDISI SERVER FISIK]\\n" +
"RAM Total: " + totalRam + " MB\\n" +
"RAM Terpakai: " + usedRam + " MB (" + usedPercentage + "%)\\n" +
"RAM Sisa: " + freeRam + " MB\\n\\n" +
"[APLIKASI YANG SEDANG BERJALAN (Berdasarkan RAM Terbesar)]\\n" +
psOutput;

    return new NextResponse(cleanOutput, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error) {
    return new NextResponse('Gagal mengambil data server: ' + String(error), { status: 500 });
  }
}
