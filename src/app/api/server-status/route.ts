import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    // Jalankan perintah Linux dengan aman dari dalam Node.js
    const { stdout: topOutput } = await execAsync('top -b -n 1 | head -n 15');
    const { stdout: freeOutput } = await execAsync('free -m');
    
    const combinedOutput = \`=== TOP PROCESSES ===\\n\${topOutput}\\n\\n=== RAM USAGE ===\\n\${freeOutput}\`;
    
    return new NextResponse(combinedOutput, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error) {
    return new NextResponse('Gagal mengambil data server: ' + String(error), { status: 500 });
  }
}
