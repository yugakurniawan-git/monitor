'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Activity, Server, HardDrive, Cpu, Terminal, Send, Sparkles, AlertTriangle, ChevronDown, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type MetricPoint = { time: string; cpu: number; ram: number };
type Container = { id: string; name: string; label: string; image: string; status: string; state: string };
type Metrics = {
  cpu: number; load: string; cpuCores: number;
  ram: number; ramUsedGB: string; ramTotalGB: string;
  disk: number; diskUsed: string; diskTotal: string;
  processes: string; timestamp: string;
};

const generateMockData = (): MetricPoint[] =>
  Array.from({ length: 15 }).map((_, i) => ({
    time: `-${15 - i}m`,
    cpu: Math.floor(Math.random() * 30) + 10,
    ram: Math.floor(Math.random() * 20) + 40,
  }));

function cpuColor(pct: number) {
  if (pct >= 90) return 'text-red-400';
  if (pct >= 70) return 'text-amber-400';
  return 'text-white';
}

function diskColor(pct: number) {
  if (pct >= 85) return 'text-red-400';
  if (pct >= 70) return 'text-amber-400';
  return 'text-white';
}

export default function MonitorDashboard() {
  const [chartData, setChartData] = useState<MetricPoint[]>(generateMockData());
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [processes, setProcesses] = useState('Memuat data proses...');

  const [containers, setContainers] = useState<Container[]>([]);
  const [selectedContainer, setSelectedContainer] = useState('');
  const [logs, setLogs] = useState('');
  const [logsLoading, setLogsLoading] = useState(false);
  const [dockerError, setDockerError] = useState('');
  const logRef = useRef<HTMLPreElement>(null);

  const [messages, setMessages] = useState([
    { id: 1, role: 'ai', text: 'Sistem terpantau. Ada yang ingin dianalisa?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Fetch server metrics every 10s
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/metrics');
        if (!res.ok) return;
        const data: Metrics = await res.json();
        setMetrics(data);
        setProcesses(data.processes || 'Tidak ada data');
        setChartData(prev => {
          const next = [...prev.slice(1)];
          next.push({
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            cpu: data.cpu,
            ram: data.ram,
          });
          return next;
        });
      } catch { /* ignore */ }
    };
    fetchMetrics();
    const iv = setInterval(fetchMetrics, 15000);
    return () => clearInterval(iv);
  }, []);

  // Fetch container list every 15s
  useEffect(() => {
    const fetchContainers = async () => {
      try {
        const res = await fetch('/api/containers');
        const data = await res.json();
        if (data.error) { setDockerError(data.error); return; }
        setDockerError('');
        setContainers(data.containers || []);
        if (!selectedContainer && data.containers?.length > 0) {
          setSelectedContainer(data.containers[0].name);
        }
      } catch { /* ignore */ }
    };
    fetchContainers();
    const iv = setInterval(fetchContainers, 30000);
    return () => clearInterval(iv);
  }, []);

  // Fetch logs when container changes or every 8s
  useEffect(() => {
    if (!selectedContainer) return;
    const fetchLogs = async () => {
      setLogsLoading(true);
      try {
        const res = await fetch(`/api/logs?container=${encodeURIComponent(selectedContainer)}&tail=150`);
        const data = await res.json();
        if (data.error) { setLogs('Error: ' + data.error); }
        else { setLogs(data.logs || '(kosong)'); }
      } catch { /* ignore */ }
      setLogsLoading(false);
    };
    fetchLogs();
    const iv = setInterval(fetchLogs, 30000);
    return () => clearInterval(iv);
  }, [selectedContainer]);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userText = input;
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: userText }]);
    setInput('');
    setIsTyping(true);
    try {
      const res = await fetch('https://n8n.yugakurniawan.com/webhook/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
      });
      if (res.ok) {
        const text = await res.text();
        let aiText = text;
        try { const d = JSON.parse(text); if (d.reply) aiText = d.reply; } catch { /* plain text */ }
        setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: aiText }]);
      } else {
        throw new Error('Status ' + res.status);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: 'Error: ' + msg }]);
    } finally {
      setIsTyping(false);
    }
  };

  const cpu = metrics?.cpu ?? chartData[chartData.length - 1].cpu;
  const ram = metrics?.ram ?? chartData[chartData.length - 1].ram;
  const disk = metrics?.disk ?? 0;

  return (
    <div className="min-h-screen p-4 md:p-6 font-sans selection:bg-sky-500/30">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-sky-500/10 rounded-xl border border-sky-500/20">
            <Activity className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              NEXUS Monitor
            </h1>
            <p className="text-sm text-slate-400">yugakurniawan.com / production</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-sm text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Live
        </div>
      </header>

      {/* Top row: resource cards + chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-3 gap-4">
            {/* CPU */}
            <div className="glass-panel p-5 rounded-2xl flex flex-col gap-3 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />
              <div className="flex justify-between items-center relative z-10">
                <span className="text-slate-400 font-medium text-sm">CPU Usage</span>
                <Cpu className="w-4 h-4 text-sky-400" />
              </div>
              <div className="relative z-10">
                <div className="flex items-baseline gap-2">
                  <h2 className={`text-4xl font-bold ${cpuColor(cpu)}`}>{cpu}%</h2>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  load {metrics?.load ?? '—'} / {metrics?.cpuCores ?? '?'} core
                </p>
                <div className="w-full bg-slate-800/50 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div className="bg-gradient-to-r from-sky-400 to-blue-500 h-full rounded-full transition-all duration-500" style={{ width: cpu + '%' }} />
                </div>
              </div>
            </div>

            {/* RAM */}
            <div className="glass-panel p-5 rounded-2xl flex flex-col gap-3 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />
              <div className="flex justify-between items-center relative z-10">
                <span className="text-slate-400 font-medium text-sm">RAM Usage</span>
                <Server className="w-4 h-4 text-purple-400" />
              </div>
              <div className="relative z-10">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-4xl font-bold">{ram}%</h2>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {metrics?.ramUsedGB ?? '?'}GB / {metrics?.ramTotalGB ?? '?'}GB
                </p>
                <div className="w-full bg-slate-800/50 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-400 to-pink-500 h-full rounded-full transition-all duration-500" style={{ width: ram + '%' }} />
                </div>
              </div>
            </div>

            {/* Disk */}
            <div className="glass-panel p-5 rounded-2xl flex flex-col gap-3 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />
              <div className="flex justify-between items-center relative z-10">
                <span className="text-slate-400 font-medium text-sm">Disk Usage</span>
                <HardDrive className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="relative z-10">
                <div className="flex items-baseline gap-2">
                  <h2 className={`text-4xl font-bold ${diskColor(disk)}`}>{disk || '—'}%</h2>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {metrics?.diskUsed ?? '?'} / {metrics?.diskTotal ?? '?'}
                </p>
                <div className="w-full bg-slate-800/50 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${disk >= 85 ? 'bg-gradient-to-r from-red-500 to-rose-600' : disk >= 70 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-emerald-400 to-teal-500'}`}
                    style={{ width: (disk || 0) + '%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="glass-panel p-6 rounded-3xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-300">
                <Activity className="w-4 h-4 text-slate-400" /> Resource Timeline
              </h3>
              <div className="flex gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />CPU</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" />RAM</span>
              </div>
            </div>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="time" stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} />
                  <Line type="monotone" dataKey="cpu" stroke="#38bdf8" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="ram" stroke="#c084fc" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right: Process list + AI Chat */}
        <div className="space-y-6">
          {/* Processes */}
          <div className="glass-card p-5 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              <span className="text-[10px] text-white/40 ml-1 font-mono uppercase tracking-widest">Active Processes</span>
            </div>
            <pre className="font-mono text-[10px] text-green-400/90 overflow-x-auto whitespace-pre leading-relaxed bg-black/20 p-3 rounded-lg max-h-48 overflow-y-auto">
              {processes}
            </pre>
          </div>

          {/* AI Chat */}
          <div className="glass-card rounded-2xl flex flex-col min-h-[400px] border border-white/10">
            <div className="p-4 border-b border-white/5 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">AI SysAdmin</h3>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
                </p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className={'flex ' + (msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={'max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ' + (
                    msg.role === 'user'
                      ? 'bg-sky-500/20 border border-sky-500/30 text-sky-50 rounded-tr-sm'
                      : 'glass-input text-slate-200 rounded-tl-sm'
                  )}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="glass-input rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-white/5">
              <form onSubmit={handleSendMessage} className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Tanya AI tentang server..."
                  className="w-full glass-input rounded-xl py-2.5 pl-3 pr-10 text-xs text-white placeholder-slate-400"
                />
                <button type="submit" disabled={!input.trim() || isTyping}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-sky-500/20 text-sky-400 hover:bg-sky-500/40 disabled:opacity-40 transition-colors">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Container Logs Panel — full width */}
      <div className="glass-panel rounded-3xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-slate-400" />
            <h3 className="font-semibold text-slate-200">Container Logs</h3>
            {logsLoading && <RefreshCw className="w-3.5 h-3.5 text-slate-500 animate-spin" />}
          </div>

          <div className="flex items-center gap-3">
            {dockerError && (
              <div className="flex items-center gap-1.5 text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>Docker socket belum di-mount</span>
              </div>
            )}

            {/* Container dropdown */}
            <div className="relative">
              <select
                value={selectedContainer}
                onChange={e => setSelectedContainer(e.target.value)}
                disabled={!!dockerError || containers.length === 0}
                className="appearance-none glass-input text-xs text-white rounded-xl pl-3 pr-8 py-2 cursor-pointer disabled:opacity-40 min-w-[200px]"
              >
                {containers.length === 0 && <option value="">— pilih container —</option>}
                {containers.map(c => (
                  <option key={c.id} value={c.name} className="bg-slate-900">
                    {c.state === 'running' ? '🟢' : '🔴'} {c.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <pre
          ref={logRef}
          className="font-mono text-[11px] text-green-300/80 bg-black/30 p-4 h-80 overflow-y-auto whitespace-pre leading-relaxed"
        >
          {dockerError
            ? `# Docker socket tidak tersedia.\n# Untuk mengaktifkan log viewer, mount socket ke container:\n#   /var/run/docker.sock -> /var/run/docker.sock\n\n${dockerError}`
            : logs || '# Pilih container untuk melihat logs...'}
        </pre>
      </div>
    </div>
  );
}
