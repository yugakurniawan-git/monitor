import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

function friendlyLabel(name: string, projectName: string, image: string): string {
  // 1. Use Coolify projectName if available and non-generic
  if (projectName) {
    // bantukoscom -> bantukos.com, monitoryugakurniawancom -> monitor
    const p = projectName
      .replace(/com$/, '.com')
      .replace(/yugakurniawancom$/, '')
      .replace(/-$/, '');
    if (p && p !== 'coolify') return p;
  }

  // 2. Strip Coolify UUID suffix from container name
  // e.g. "bantukos-wa-bot-npom4pqtbvr2lt3aejtw44ei-203317739376" -> "bantukos-wa-bot"
  const stripped = name
    .replace(/-[a-z0-9]{20}-\d{8,}$/, '')   // Coolify compose UUID + timestamp
    .replace(/-[a-z0-9]{24,}$/, '')           // pure UUID suffix
    .replace(/^\//, '');

  if (stripped && stripped !== name) return stripped;

  // 3. Fallback: use image name
  const img = image.split(':')[0].split('/').pop() || name;
  return img;
}

export async function GET() {
  try {
    // Get basic container list
    const { stdout: psOut } = await execAsync(
      "docker ps --format '{{json .}}' 2>&1"
    );

    const ids = psOut
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(l => JSON.parse(l).ID);

    if (ids.length === 0) return NextResponse.json({ containers: [] });

    // Get labels via inspect
    const { stdout: inspectOut } = await execAsync(
      `docker inspect ${ids.join(' ')} --format '{{.ID}}|{{index .Config.Labels "coolify.projectName"}}' 2>/dev/null`
    );

    const labelMap: Record<string, string> = {};
    inspectOut.trim().split('\n').filter(Boolean).forEach(line => {
      const [id, proj] = line.split('|');
      if (id) labelMap[id] = proj || '';
    });

    const containers = psOut
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const c = JSON.parse(line);
        const projectName = labelMap[c.ID] || '';
        const name = (c.Names as string).replace(/^\//, '');
        const label = friendlyLabel(name, projectName, c.Image as string);
        return {
          id: c.ID,
          name,
          label,
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
