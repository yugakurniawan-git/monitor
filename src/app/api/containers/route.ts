import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    const { stdout } = await execAsync(
      'docker ps --format \'{{json .}}\' 2>&1'
    );

    const containers = stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const c = JSON.parse(line);
        // Extract human-readable name from Coolify container names
        // e.g. "bantukos-wa-bot-npom4pqtbvr2lt3aejtw44ei-203317739376" -> "bantukos-wa-bot"
        const raw: string = c.Names || '';
        const label = raw
          .replace(/-[a-z0-9]{20,}-\d+$/, '')  // strip Coolify suffix
          .replace(/^\//, '');
        return {
          id: c.ID,
          name: raw.replace(/^\//, ''),
          label: label || raw,
          image: c.Image,
          status: c.Status,
          state: c.State,
        };
      });

    return NextResponse.json({ containers });
  } catch (error) {
    const msg = String(error);
    if (msg.includes('docker.sock') || msg.includes('connect')) {
      return NextResponse.json(
        { error: 'Docker socket not available. Mount /var/run/docker.sock into the container.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
