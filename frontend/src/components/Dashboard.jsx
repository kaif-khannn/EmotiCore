import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { ArrowUpRight, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/analytics');
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
        <div className="bg-[#1c1c1e]/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl">
          <p className="text-white font-bold mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex justify-between gap-6 text-sm mb-1">
              <span style={{ color: entry.color }}>{entry.name}</span>
              <span className="text-white font-bold">{entry.value}</span>
            </div>
          ))}
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
    Happy: '#34c759', Sad: '#30B5FF', Angry: '#ff0055', Neutral: '#8e8e93',
    Fear: '#9C27B0', Surprise: '#ffcc00', Disgust: '#10b981', Joy: '#34c759',
    Unknown: '#555'
  };

  return (
    <div className="flex flex-col gap-6 w-full fade-in p-4 xl:p-8 max-w-7xl mx-auto">
      
      {/* Primary Area Chart */}
      <div className="glass-panel p-6 pb-2 pt-10 rounded-[2rem] w-full min-h-[400px] border border-white/5 bg-[#18181a] shadow-2xl relative">
          {analytics.emotion_timeseries.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minHeight={350}>
            <AreaChart data={analytics.emotion_timeseries} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                {[...emotionKeys].map(emo => (
                  <linearGradient key={emo} id={`color${emo}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={emotionColors[emo] || '#888'} stopOpacity={0.7}/>
                    <stop offset="95%" stopColor={emotionColors[emo] || '#888'} stopOpacity={0}/>
                  </linearGradient>
                ))}
              </defs>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#8e8e93', fontSize: 11}} dy={15} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#8e8e93', fontSize: 11}} dx={-10} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={<CustomTooltip />} />
              {[...emotionKeys].map(emo => (
                <Area key={emo} type="monotone" dataKey={emo} stroke={emotionColors[emo] || '#888'} strokeWidth={3} fillOpacity={1} fill={`url(#color${emo})`} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[350px] text-slate-500 text-sm font-bold tracking-widest uppercase">
              Chart populates as you run analyses
            </div>
          )}
      </div>

      {/* Triplet Mini-Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        
        {/* Total Inferences */}
        <div className="glass-panel p-6 bg-[#18181a] border border-white/5 rounded-[2rem] flex flex-col justify-between h-[180px] shadow-xl hover:bg-white/5 transition-all cursor-crosshair">
           <div className="flex items-center gap-3">
              <span className="text-slate-400 text-sm font-inter">Total Inferences</span>
              <span className="text-[#34c759] text-xs font-bold flex items-center gap-1"><ArrowUpRight size={14}/> Live</span>
           </div>
           <div className="flex justify-between items-end mt-4">
              <h3 className="text-4xl font-outfit text-white tracking-wide font-medium">{analytics.total_inferences.toLocaleString()}</h3>
              <div className="w-[120px] h-[60px]">
                  {analytics.inference_history.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={analytics.inference_history}>
                        <defs>
                           <linearGradient id="spark1" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#d1359c" stopOpacity={0.6}/>
                             <stop offset="95%" stopColor="#d1359c" stopOpacity={0}/>
                           </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="val" stroke="#d1359c" strokeWidth={2} fillOpacity={1} fill="url(#spark1)" dot={false} isAnimationActive={true} />
                     </AreaChart>
                  </ResponsiveContainer>
                  ) : <div className="w-full h-full flex items-center justify-center text-slate-600 text-[10px]">—</div>}
              </div>
           </div>
        </div>

        {/* Avg Confidence */}
        <div className="glass-panel p-6 bg-[#18181a] border border-white/5 rounded-[2rem] flex flex-col justify-between h-[180px] shadow-xl hover:bg-white/5 transition-all cursor-crosshair">
           <div className="flex items-center gap-3">
              <span className="text-slate-400 text-sm font-inter">Avg Confidence</span>
              <span className="text-[#34c759] text-xs font-bold flex items-center gap-1"><ArrowUpRight size={14}/> Live</span>
           </div>
           <div className="flex justify-between items-end mt-4">
              <h3 className="text-4xl font-outfit text-white tracking-wide font-medium">{analytics.avg_confidence}%</h3>
              <div className="w-[120px] h-[60px]">
                  {analytics.confidence_history.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={analytics.confidence_history}>
                        <defs>
                           <linearGradient id="spark2" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#30B5FF" stopOpacity={0.6}/>
                             <stop offset="95%" stopColor="#30B5FF" stopOpacity={0}/>
                           </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="val" stroke="#30B5FF" strokeWidth={2} fillOpacity={1} fill="url(#spark2)" dot={false} isAnimationActive={true} />
                     </AreaChart>
                  </ResponsiveContainer>
                  ) : <div className="w-full h-full flex items-center justify-center text-slate-600 text-[10px]">—</div>}
              </div>
           </div>
        </div>

        {/* Activity Volume */}
        <div className="glass-panel p-6 bg-[#18181a] border border-white/5 rounded-[2rem] flex flex-col justify-between h-[180px] shadow-xl hover:bg-white/5 transition-all cursor-crosshair relative">
           <div className="flex justify-between items-center w-full mb-2">
              <span className="text-slate-400 text-sm font-inter">System Activity</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase">This Week</span>
           </div>
           <div className="flex-1 w-full flex items-end">
               <ResponsiveContainer width="100%" height="90%">
                 <BarChart data={analytics.activity_by_day} margin={{top: 10, right: 0, left: 0, bottom: 0}} barSize={12}>
                   <defs>
                     <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="0%" stopColor="#ff0055" stopOpacity={0.8}/>
                       <stop offset="100%" stopColor="#30B5FF" stopOpacity={0.8}/>
                     </linearGradient>
                   </defs>
                   <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#8e8e93', fontSize: 10}} dy={10} />
                   <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'rgba(28,28,30,0.9)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                   <Bar dataKey="v" radius={[6, 6, 6, 6]}>
                      {(analytics.activity_by_day || []).map((entry, index) => {
                        const maxVal = Math.max(...(analytics.activity_by_day || []).map(d => d.v));
                        return <Cell key={`cell-${index}`} fill={entry.v === maxVal && entry.v > 0 ? "url(#barGradient)" : "#2c2c2e"} />;
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
