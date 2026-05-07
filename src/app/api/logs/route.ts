import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const container = searchParams.get('container');
  const tail = parseInt(searchParams.get('tail') || '150');

  if (!container) {
    return NextResponse.json({ error: 'container param required' }, { status: 400 });
  }

  // Sanitize: only allow alphanumeric, dash, underscore, dot
  if (!/^[a-zA-Z0-9_\-\.]+$/.test(container)) {
    return NextResponse.json({ error: 'invalid container name' }, { status: 400 });
  }

  try {
    // stderr goes to stdout so we capture everything (docker logs writes to stderr by default)
    const { stdout } = await execAsync(
      `docker logs --tail ${tail} --timestamps "${container}" 2>&1`,
      { maxBuffer: 5 * 1024 * 1024 }
    );
    return NextResponse.json({ logs: stdout });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('docker.sock') || msg.includes('connect')) {
      return NextResponse.json(
        { error: 'Docker socket not available.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
