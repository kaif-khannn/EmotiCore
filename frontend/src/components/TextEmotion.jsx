import React, { useState } from 'react';
import { Send, Zap, Brain, MessageSquare, ArrowLeft, Activity } from 'lucide-react';

export default function TextEmotion() {
  const [text, setText] = useState('');
  const [viewState, setViewState] = useState('input'); // 'input', 'processing', 'result'
  const [result, setResult] = useState(null);

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setViewState('processing');
    try {
      const response = await fetch('http://localhost:8000/api/predict/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await response.json();
      setResult(data);
      // Ensure the processing animation plays for at least 1.5 seconds for visual effect
      setTimeout(() => { setViewState('result'); }, 1500);
    } catch (error) {
      console.error('Text analysis failed:', error);
      setResult({ error: true, message: error.message || 'Backend unreachable. Ensure the server is running on port 8000.' });
      setViewState('result');
    }
  };

  const getEmotionColor = (emotion) => {
    const colors = {
      Happy: 'bg-amber-400 shadow-[0_0_20px_rgba(252,238,10,0.3)]',
      Sad: 'bg-cyan-400 shadow-[0_0_20px_rgba(0,243,255,0.3)]',
      Angry: 'bg-rose-500 shadow-[0_0_20px_rgba(255,0,85,0.3)]',
      Neutral: 'bg-zinc-500',
      Fear: 'bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]',
      Surprise: 'bg-orange-400 shadow-[0_0_20px_rgba(251,146,60,0.3)]',
      Disgust: 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
    };
    return colors[emotion] || 'bg-cyan-400';
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto pt-4">
      <div className="flex items-center gap-6 mb-6 fade-in">
        <div className="p-5 obsidian-panel border-white/10 bg-white/5 flex items-center justify-center text-cyan-400 shadow-2xl">
          <MessageSquare size={36} />
        </div>
        <div>
          <h2 className="text-4xl font-extrabold font-syne text-white tracking-tight">Semantic <span className="gradient-text">Analysis</span></h2>
          <p className="text-zinc-500 text-[10px] font-bold tracking-[0.3em] uppercase mt-2">Neural Sentiment Routing</p>
        </div>
      </div>

      {/* Massive Single Module Card - Optimized for Expansion & Containment */}
      <div className="relative w-full rounded-[2rem] shadow-[0_40px_80px_rgba(0,0,0,0.9)] transition-all duration-700 bg-[#0a0a0a] border-t border-white/10 overflow-hidden">
          
           {/* Glowing Animated Border only active when processing */}
           {viewState === 'processing' && (
              <>
                <div className="absolute top-1/2 left-1/2 w-[200%] h-[200%] bg-[conic-gradient(transparent_0deg,transparent_270deg,var(--accent-primary)_360deg)] animate-[spin_1.5s_linear_infinite] origin-center -translate-x-1/2 -translate-y-1/2 z-0 opacity-50"></div>
                <div className="absolute inset-[1px] bg-[#0a0a0a] rounded-[2rem] z-10"></div>
              </>
           )}

           {/* Foreground App Content Layer */}
           <div className="relative z-20 w-full flex flex-col p-10 md:p-16 min-h-[500px] font-jakarta">
              
              {viewState === 'input' && (
                 <div className="flex flex-col h-full fade-in flex-1">
                    <h3 className="text-sm font-bold font-syne uppercase tracking-[0.3em] text-zinc-500 mb-6 px-1">Source Input</h3>
                    
                    <textarea
                       placeholder="Initialize narrative stream..."
                       value={text}
                       onChange={(e) => setText(e.target.value)}
                       className="flex-1 w-full bg-white/5 border border-white/5 rounded-3xl p-8 text-2xl text-white placeholder-zinc-700 outline-none focus:border-cyan-500/30 shadow-2xl resize-none leading-relaxed transition-all font-jakarta mb-10"
                    />
                    
                    <div className="flex justify-end">
                       <button 
                         onClick={handleAnalyze}
                         disabled={!text.trim()}
                         className={`px-10 py-5 rounded-2xl flex items-center gap-4 tracking-[0.2em] font-extrabold font-syne uppercase transition-all shadow-2xl ${
                             text.trim() ? "bg-white text-black hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(0,243,255,0.4)] hover:scale-[1.02]" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                         }`}
                       >
                          Analyze <Send size={20} />
                       </button>
                    </div>
                 </div>
              )}

             {viewState === 'processing' && (
                <div className="flex flex-col h-full fade-in flex-1 items-center justify-center gap-12">
                   <div className="relative">
                      <div className="absolute inset-0 bg-cyan-400/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
                      <Brain size={120} className="text-cyan-400 drop-shadow-[0_0_30px_rgba(0,243,255,0.5)] animate-pulse" strokeWidth={1} />
                   </div>
                   
                   <div className="space-y-4 text-center">
                      <p className="tracking-[0.4em] text-white font-extrabold font-syne text-xl uppercase italic">
                         Parsing Neural Intent
                      </p>
                      <div className="flex gap-2 justify-center">
                         <div className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce"></div>
                         <div className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                         <div className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      </div>
                   </div>
                </div>
             )}

             {viewState === 'result' && result && (
                <div className="flex flex-col h-full fade-in flex-1">
                   {result.error ? (
                     <div className="flex-1 flex flex-col items-center justify-center gap-8 text-center">
                        <div className="w-24 h-24 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-2xl">
                           <Zap size={48} />
                        </div>
                        <div className="space-y-3">
                           <h3 className="text-3xl font-syne font-extrabold text-white uppercase tracking-tighter">Analysis Interrupted</h3>
                           <p className="text-zinc-500 max-w-sm text-sm leading-relaxed font-jakarta">{result.message}</p>
                        </div>
                     </div>
                   ) : (
                   <div className="flex-1 flex flex-col">
                       <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 border-b border-white/5 pb-10 gap-6">
                          <div>
                            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mb-3">Dominant Sentiment</h3>
                            <div className="flex items-center gap-6">
                              <h2 className="text-7xl md:text-8xl font-extrabold font-syne text-white tracking-tighter uppercase">{result.emotion}</h2>
                              <div className={`w-4 h-4 rounded-full ${getEmotionColor(result.emotion)} animate-pulse`}></div>
                            </div>
                          </div>
                          
                          <div className="md:text-right pt-4 md:pt-0">
                             <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mb-3">Confidence Variance</h3>
                             <p className="text-5xl font-extrabold font-syne text-cyan-400 tracking-tighter">{((result.confidence || 0) * 100).toFixed(1)}%</p>
                          </div>
                       </div>
                       
                       <div className="space-y-10 flex-1">
                          <div>
                             <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-6">Probability Distribution</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
                                 {Object.entries(result.probabilities || {}).sort((a,b)=>b[1]-a[1]).map(([emo, val]) => (
                                     <div key={emo} className="flex flex-col gap-3 group">
                                        <div className="flex justify-between items-end">
                                            <span className="text-zinc-400 font-bold font-syne uppercase tracking-widest text-[11px] group-hover:text-white transition-colors">{emo}</span>
                                            <span className="text-zinc-500 font-bold font-jakarta text-xs">{(val * 100).toFixed(1)}%</span>
                                        </div>
                                        <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                                            <div 
                                              className={`h-full rounded-full transition-all duration-[1.5s] cubic-bezier(0.16, 1, 0.3, 1) ${getEmotionColor(emo)}`}
                                              style={{ width: `${val * 100}%` }}
                                            ></div>
                                        </div>
                                     </div>
                                 ))}
                             </div>
                          </div>
                       </div>

                       <div className="mt-16 pt-10 border-t border-white/5 flex justify-start">
                          <button 
                             onClick={() => {
                                setViewState('input');
                                setResult(null);
                             }} 
                             className="group flex items-center gap-4 text-white hover:text-cyan-400 transition-all font-syne font-bold tracking-[0.2em] uppercase text-xs"
                          >
                             <div className="p-2 rounded-lg bg-white/5 group-hover:bg-cyan-400 group-hover:text-black transition-all">
                                <ArrowLeft size={16} />
                             </div>
                             Refresh Narrative Input
                          </button>
                       </div>
                   </div>
                   )}
                </div>
             )}

          </div>
      </div>
    </div>
  );
}
