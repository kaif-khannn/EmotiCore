import React, { useState } from 'react';
import { Send, Zap, Brain, MessageSquare, ArrowLeft, Activity, Grid } from 'lucide-react';

export default function TextEmotion({ onReturnHome }) {
  const [text, setText] = useState('');
  const [viewState, setViewState] = useState('input'); // 'input', 'processing', 'result'
  const [result, setResult] = useState(null);
  const [feedbackStatus, setFeedbackStatus] = useState(null); // null, 'correct', 'incorrect', 'submitted'
  const [selectedCorrection, setSelectedCorrection] = useState('');

  const EMOTIONS = ["happy", "sad", "angry", "fear", "neutral", "surprise", "disgust"];

  const handleFeedback = async (isCorrect, correction = null) => {
    try {
      await fetch('http://127.0.0.1:8000/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modality: 'text',
          predicted: result.emotion.toLowerCase(),
          corrected: isCorrect ? result.emotion.toLowerCase() : correction.toLowerCase(),
          raw_input: text
        })
      });
      setFeedbackStatus('submitted');
    } catch (error) {
      console.error('Feedback submission failed:', error);
    }
  };

  const handleAnalyze = async () => {

    if (!text.trim()) return;
    setViewState('processing');
    try {
      const response = await fetch('http://127.0.0.1:8000/api/predict/text', {
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
                    <h3 className="text-sm font-bold font-jakarta uppercase tracking-[0.2em] text-zinc-500 mb-6 px-1">Source Input</h3>
                    
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
                         className={`px-10 py-5 rounded-2xl flex items-center gap-4 tracking-[0.1em] font-bold font-jakarta uppercase transition-all shadow-2xl ${
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
                              <h2 className="text-3xl md:text-5xl font-extrabold font-syne text-white tracking-tighter uppercase leading-none truncate">{result.emotion}</h2>
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
                                 {Object.entries(result.probabilities || result.breakdown || {}).sort((a,b)=>b[1]-a[1]).map(([emo, val]) => (
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

                        {/* Reinforcement Feedback Section */}
                        <div className="mt-12 p-8 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 shadow-inner">
                           {feedbackStatus === 'submitted' ? (
                              <div className="flex items-center gap-4 text-emerald-400 font-syne font-bold uppercase tracking-[0.2em] text-xs">
                                 <Activity size={20} className="animate-pulse" />
                                 Neural Pattern Adjusted. Thank you for the correction.
                              </div>
                           ) : feedbackStatus === 'incorrect' ? (
                              <div className="flex flex-col md:flex-row items-center gap-6 w-full">
                                 <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] shrink-0">Select Correct Emotion:</span>
                                 <div className="flex flex-wrap gap-2 flex-1">
                                    {EMOTIONS.filter(e => e !== result.emotion.toLowerCase()).map(emo => (
                                       <button 
                                          key={emo}
                                          onClick={() => handleFeedback(false, emo)}
                                          className="px-4 py-2 rounded-full border border-white/10 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:bg-white hover:text-black hover:border-white transition-all"
                                       >
                                          {emo}
                                       </button>
                                    ))}
                                 </div>
                                 <button onClick={() => setFeedbackStatus(null)} className="text-zinc-600 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest underline underline-offset-4">Cancel</button>
                              </div>
                           ) : (
                              <>
                                 <div className="flex flex-col gap-1">
                                    <h4 className="text-white font-bold font-syne tracking-widest uppercase text-xs">Is this prediction accurate?</h4>
                                    <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-[0.1em]">Help refine our neural heuristics</p>
                                 </div>
                                 <div className="flex gap-4">
                                    <button 
                                       onClick={() => handleFeedback(true)}
                                       className="px-8 py-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-black transition-all font-bold text-[10px] uppercase tracking-widest"
                                    >
                                       Correct
                                    </button>
                                    <button 
                                       onClick={() => setFeedbackStatus('incorrect')}
                                       className="px-8 py-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-black transition-all font-bold text-[10px] uppercase tracking-widest"
                                    >
                                       Incorrect
                                    </button>
                                 </div>
                              </>
                           )}
                        </div>

                        <div className="mt-16 pt-10 border-t border-white/5 flex justify-between items-center">
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
                          
                          {onReturnHome && (
                              <button 
                                 onClick={onReturnHome}
                                 className="group flex items-center gap-4 text-zinc-500 hover:text-white transition-all font-syne font-bold tracking-[0.2em] uppercase text-xs"
                              >
                                 <span className="hidden md:inline">Return to All Modules</span>
                                 <span className="md:hidden">Modules</span>
                                 <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white group-hover:text-black transition-all">
                                    <Grid size={16} />
                                 </div>
                              </button>
                          )}
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
