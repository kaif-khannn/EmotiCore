import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { ArrowUpRight, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/analytics');
      const data = await res.json();
      setAnalytics(data);
      setError(null);
    } catch (err) {
      console.error('Analytics fetch failed:', err);
      setError('Could not connect to backend. Ensure the server is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchAnalytics, 5000);
    return () => clearInterval(interval);
  }, []);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="obsidian-panel p-4 shadow-2xl border-t-white/10 !bg-[#0a0a0a]/90 backdrop-blur-xl">
          <p className="text-white font-syne font-bold mb-3 tracking-tighter text-lg">{label}</p>
          <div className="space-y-2">
            {payload.map((entry, index) => (
              <div key={index} className="flex justify-between items-center gap-8 text-xs font-jakarta">
                <span className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                   <span className="text-zinc-400 font-medium">{entry.name}</span>
                </span>
                <span className="text-white font-bold">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 fade-in">
        <div className="w-12 h-12 border-4 border-white/10 border-t-white rounded-full animate-spin"></div>
        <p className="text-slate-400 font-bold tracking-widest uppercase text-sm">Loading Analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 fade-in text-center">
        <AlertCircle size={48} className="text-red-400" />
        <h3 className="text-xl font-bold text-red-400 uppercase tracking-widest">Connection Error</h3>
        <p className="text-slate-400 text-sm max-w-md">{error}</p>
      </div>
    );
  }

  const isEmpty = !analytics || analytics.total_inferences === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 fade-in text-center">
        <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <AlertCircle size={36} className="text-slate-500" />
        </div>
        <h3 className="text-2xl font-black font-outfit text-white uppercase tracking-widest">No Data Yet</h3>
        <p className="text-slate-400 text-sm max-w-md leading-relaxed">
          Run your first emotion analysis through any module. Your analytics will populate here in real time.
        </p>
      </div>
    );
  }

  // Extract all unique emotion keys from timeseries for dynamic area rendering
  const emotionKeys = new Set();
  (analytics.emotion_timeseries || []).forEach(entry => {
    Object.keys(entry).forEach(k => { if (k !== 'day') emotionKeys.add(k); });
  });

  const emotionColors = {
    Happy: 'var(--accent-vibrant-yellow)', 
    Sad: 'var(--accent-primary)', 
    Angry: 'var(--accent-secondary)', 
    Neutral: '#52525b',
    Fear: '#a855f7', 
    Surprise: '#fb923c', 
    Disgust: '#10b981', 
    Joy: 'var(--accent-vibrant-yellow)',
    Unknown: '#3f3f46'
  };

  return (
    <div className="flex flex-col gap-6 w-full fade-in p-4 xl:p-8 max-w-7xl mx-auto">
      
      {/* Primary Area Chart */}
      <div className="obsidian-panel p-8 md:p-10 pb-4 rounded-[2.5rem] w-full min-h-[450px] border-t-white/10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowUpRight className="text-zinc-600" size={32} />
          </div>
          {analytics.emotion_timeseries.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minHeight={380}>
            <AreaChart data={analytics.emotion_timeseries} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <defs>
                {[...emotionKeys].map(emo => (
                  <linearGradient key={emo} id={`color${emo}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={emotionColors[emo] || '#888'} stopOpacity={0.4}/>
                    <stop offset="95%" stopColor={emotionColors[emo] || '#888'} stopOpacity={0}/>
                  </linearGradient>
                ))}
              </defs>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#52525b', fontSize: 11, fontWeight: 'bold'}} dy={15} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#52525b', fontSize: 11, fontWeight: 'bold'}} dx={-10} />
              <Tooltip cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} content={<CustomTooltip />} />
              {[...emotionKeys].map(emo => (
                <Area key={emo} type="monotone" dataKey={emo} stroke={emotionColors[emo] || '#888'} strokeWidth={4} fillOpacity={1} fill={`url(#color${emo})`} isAnimationActive={true} animationDuration={1500} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[380px] text-zinc-600 text-xs font-bold tracking-[0.2em] uppercase">
              Perception metrics pending analysis...
            </div>
          )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mt-2">
        
        {/* Total Inferences */}
        <div className="obsidian-panel p-8 bg-[#0a0a0a] border-t-white/10 rounded-[2.5rem] flex flex-col justify-between h-[220px] shadow-2xl hover:bg-white/5 transition-all group">
           <div className="flex justify-between items-start">
              <div className="space-y-1">
                 <span className="text-zinc-500 text-[10px] uppercase tracking-[0.2em] font-bold">Total Inferences</span>
                 <h3 className="text-5xl font-syne text-white tracking-tighter font-extrabold">{analytics.total_inferences.toLocaleString()}</h3>
              </div>
              <div className="px-3 py-1 bg-emerald-500/10 rounded-full text-emerald-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></div> Up
              </div>
           </div>
           <div className="w-full h-[60px] opacity-40 group-hover:opacity-80 transition-opacity">
               {analytics.inference_history.length > 1 ? (
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.inference_history}>
                     <defs>
                        <linearGradient id="spark1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--accent-secondary)" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="var(--accent-secondary)" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <Area type="monotone" dataKey="val" stroke="var(--accent-secondary)" strokeWidth={3} fillOpacity={1} fill="url(#spark1)" dot={false} />
                  </AreaChart>
               </ResponsiveContainer>
               ) : <div className="w-full h-full flex items-center justify-center text-zinc-700 text-[10px]">—</div>}
           </div>
        </div>

        {/* Avg Confidence */}
        <div className="obsidian-panel p-8 bg-[#0a0a0a] border-t-white/10 rounded-[2.5rem] flex flex-col justify-between h-[220px] shadow-2xl hover:bg-white/5 transition-all group">
           <div className="flex justify-between items-start">
              <div className="space-y-1">
                 <span className="text-zinc-500 text-[10px] uppercase tracking-[0.2em] font-bold">Avg Confidence</span>
                 <h3 className="text-5xl font-syne text-white tracking-tighter font-extrabold">{analytics.avg_confidence}%</h3>
              </div>
              <div className="px-3 py-1 bg-cyan-500/10 rounded-full text-cyan-400 text-[10px] font-bold uppercase tracking-widest">
                  Stable
              </div>
           </div>
           <div className="w-full h-[60px] opacity-40 group-hover:opacity-80 transition-opacity">
               {analytics.confidence_history.length > 1 ? (
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.confidence_history}>
                     <defs>
                        <linearGradient id="spark2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <Area type="monotone" dataKey="val" stroke="var(--accent-primary)" strokeWidth={3} fillOpacity={1} fill="url(#spark2)" dot={false} />
                  </AreaChart>
               </ResponsiveContainer>
               ) : <div className="w-full h-full flex items-center justify-center text-zinc-700 text-[10px]">—</div>}
           </div>
        </div>

        {/* Activity Distribution */}
        <div className="obsidian-panel p-8 bg-[#0a0a0a] border-t-white/10 rounded-[2.5rem] flex flex-col justify-between h-[220px] shadow-2xl hover:bg-white/5 transition-all relative overflow-hidden">
           <div className="flex justify-between items-center w-full mb-4">
              <span className="text-zinc-500 text-[10px] uppercase tracking-[0.2em] font-bold">Weekly Distribution</span>
           </div>
           <div className="flex-1 w-full flex items-end">
               <ResponsiveContainer width="100%" height="90%">
                 <BarChart data={analytics.activity_by_day} margin={{top: 0, right: 0, left: 0, bottom: 0}} barSize={14}>
                   <defs>
                     <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity={1}/>
                       <stop offset="100%" stopColor="var(--accent-secondary)" stopOpacity={0.8}/>
                     </linearGradient>
                   </defs>
                   <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#52525b', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                   <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ backgroundColor: 'rgba(10,10,10,0.95)', border: 'none', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', color: '#fff', fontSize: '10px', fontBold: true }} />
                   <Bar dataKey="v" radius={[4, 4, 4, 4]}>
                      {(analytics.activity_by_day || []).map((entry, index) => {
                        const maxVal = Math.max(...(analytics.activity_by_day || []).map(d => d.v));
                        return <Cell key={`cell-${index}`} fill={entry.v === maxVal && entry.v > 0 ? "url(#barGradient)" : "#27272a"} />;
                      })}
                   </Bar>
                 </BarChart>
               </ResponsiveContainer>
           </div>
        </div>

      </div>
    </div>
  );
}
