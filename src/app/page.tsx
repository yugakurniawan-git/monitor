'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Server, HardDrive, Cpu, Terminal, Send, Sparkles, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Mock Data Generator
const generateMockData = () => {
  return Array.from({ length: 15 }).map((_, i) => ({
    time: `-${15 - i}m`,
    cpu: Math.floor(Math.random() * 30) + 10,
    ram: Math.floor(Math.random() * 20) + 40,
  }));
};

export default function MonitorDashboard() {
  const [data, setData] = useState(generateMockData());
  const [messages, setMessages] = useState([
    { id: 1, role: 'ai', text: 'Sistem terpantau stabil. RAM berada di 45%. Ada yang ingin dianalisa?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Fetch real-time updates from n8n
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('https://n8n.yugakurniawan.com/webhook/metrics');
        if (response.ok) {
          const newData = await response.json();
          // Assuming webhook returns: { "cpu": 15, "ram": 50 }
          setData((prev) => {
            const nextData = [...prev.slice(1)];
            nextData.push({
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              cpu: newData.cpu || 0,
              ram: newData.ram || 0,
            });
            return nextData;
          });
        }
      } catch (error) {
        console.error("Gagal mengambil data metrik dari n8n", error);
      }
    };

    fetchMetrics(); // Call immediately
    const interval = setInterval(fetchMetrics, 10000); // Fetch every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input;
    const newMsg = { id: Date.now(), role: 'user', text: userText };
    setMessages((prev) => [...prev, newMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await fetch('https://n8n.yugakurniawan.com/webhook/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Assuming webhook returns: { "reply": "teks balasan ai" }
        setMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, role: 'ai', text: data.reply || "Webhook n8n tidak mengembalikan format { reply: '...' }." }
        ]);
      } else {
         throw new Error("Webhook mengembalikan error status.");
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'ai', text: "Gagal terhubung ke n8n. Pastikan workflow Webhook Chat sudah Aktif (Active) atau di-test." }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans selection:bg-sky-500/30">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
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
          System Healthy
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Metrics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700"></div>
              <div className="flex justify-between items-center relative z-10">
                <span className="text-slate-400 font-medium">CPU Usage</span>
                <Cpu className="w-5 h-5 text-sky-400" />
              </div>
              <div className="relative z-10">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-4xl font-bold">{data[data.length - 1].cpu}%</h2>
                  <span className="text-xs text-emerald-400">+2%</span>
                </div>
                <div className="w-full bg-slate-800/50 h-1.5 rounded-full mt-4 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-sky-400 to-blue-500 h-full rounded-full transition-all duration-500"
                    style={{ width: data[data.length - 1].cpu + '%' }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700"></div>
              <div className="flex justify-between items-center relative z-10">
                <span className="text-slate-400 font-medium">RAM Usage</span>
                <Server className="w-5 h-5 text-purple-400" />
              </div>
              <div className="relative z-10">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-4xl font-bold">{data[data.length - 1].ram}%</h2>
                  <span className="text-xs text-slate-500">1.0GB / 1.9GB</span>
                </div>
                <div className="w-full bg-slate-800/50 h-1.5 rounded-full mt-4 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-purple-400 to-pink-500 h-full rounded-full transition-all duration-500"
                    style={{ width: data[data.length - 1].ram + '%' }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700"></div>
              <div className="flex justify-between items-center relative z-10">
                <span className="text-slate-400 font-medium">Disk Space</span>
                <HardDrive className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="relative z-10">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-4xl font-bold">42%</h2>
                  <span className="text-xs text-slate-500">12GB / 28GB</span>
                </div>
                <div className="w-full bg-slate-800/50 h-1.5 rounded-full mt-4 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-emerald-400 to-teal-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: '42%' }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Chart Section */}
          <div className="glass-panel p-6 rounded-3xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5 text-slate-400" />
                Resource Timeline
              </h3>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-sky-400"></div>CPU</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-400"></div>RAM</div>
              </div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="time" stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Line type="monotone" dataKey="cpu" stroke="#38bdf8" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#38bdf8' }} />
                  <Line type="monotone" dataKey="ram" stroke="#c084fc" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#c084fc' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column: AI Assistant */}
        <div className="glass-panel rounded-3xl flex flex-col h-[calc(100vh-10rem)] lg:h-auto min-h-[500px]">
          <div className="p-5 border-b border-white/5 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">AI SysAdmin</h3>
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Online
              </p>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
            {messages.map((msg) => (
              <div key={msg.id} className={'flex ' + (msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ' + (
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
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-white/5">
            <form onSubmit={handleSendMessage} className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tanya AI tentang kondisi server..."
                className="w-full glass-input rounded-xl py-3 pl-4 pr-12 text-sm text-white placeholder-slate-400 transition-all"
              />
              <button 
                type="submit"
                disabled={!input.trim() || isTyping}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-sky-500/20 text-sky-400 hover:bg-sky-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-200/70 leading-tight">
                Menunggu n8n. Jika error, pastikan Webhook di n8n sudah dibuat dan URL-nya tepat.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
