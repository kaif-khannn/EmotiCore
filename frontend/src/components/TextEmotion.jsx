import React, { useState } from 'react';
import { Send, Zap, Brain, MessageSquare, ArrowLeft, Activity, LayoutGrid } from 'lucide-react';

export default function TextEmotion({ onReturnHome }) {
  const [text, setText] = useState('');
  const [viewState, setViewState] = useState('input'); // 'input', 'processing', 'result'
  const [result, setResult] = useState(null);
  const [feedbackStatus, setFeedbackStatus] = useState(null); // null, 'correct', 'incorrect', 'submitted'
  const [selectedCorrection, setSelectedCorrection] = useState('');

  const EMOTIONS = ["happy", "sad", "angry", "fear", "neutral", "surprise", "disgust"];

  const handleFeedback = async (isCorrect, correction = null) => {
    try {
      await fetch('/api/feedback', {
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
      const response = await fetch('/api/predict/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error (${response.status}): ${errorText.substring(0, 100)}`);
      }
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
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto pt-4 h-full font-jakarta">
      <div className="flex items-center justify-between mb-6 fade-in px-2">
        <div className="flex items-center gap-6">
          <div className="p-5 obsidian-panel border-white/10 bg-white/5 flex items-center justify-center text-cyan-400 shadow-2xl">
            <MessageSquare size={36} />
          </div>
          <div>
            <h2 className="text-4xl font-extrabold font-syne text-white tracking-tight leading-none">Semantic <span className="gradient-text">Analysis</span></h2>
            <p className="text-zinc-500 text-[10px] font-bold tracking-[0.3em] uppercase mt-3">Neural Sentiment Routing</p>
          </div>
        </div>

      </div>

      {/* Massive Single Module Card - Optimized for Expansion & Containment */}
      <div className="relative w-full rounded-[2rem] shadow-[0_40px_80px_rgba(0,0,0,0.9)] transition-all duration-700 bg-[#0a0a0a] border-t border-white/10 overflow-hidden max-h-[85vh] sm:max-h-[75vh] flex flex-col">
          
           {/* Glowing Animated Border only active when processing */}
           {viewState === 'processing' && (
              <>
                <div className="absolute top-1/2 left-1/2 w-[200%] h-[200%] bg-[conic-gradient(transparent_0deg,transparent_270deg,var(--accent-primary)_360deg)] animate-[spin_1.5s_linear_infinite] origin-center -translate-x-1/2 -translate-y-1/2 z-0 opacity-50"></div>
                <div className="absolute inset-[1px] bg-[#0a0a0a] rounded-[2rem] z-10"></div>
              </>
           )}

           {/* Foreground App Content Layer */}
           <div className="relative z-20 w-full flex flex-col p-6 md:p-14 min-h-[400px] md:min-h-[450px] overflow-y-auto custom-scrollbar flex-1">
              
              {viewState === 'input' && (
                 <div className="flex flex-col h-full fade-in flex-1">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-6 px-1">Source Input</h3>
                    
                    <textarea
                       placeholder="Initialize narrative stream..."
                       value={text}
                       onChange={(e) => setText(e.target.value)}
                       className="flex-1 w-full bg-white/5 border border-white/5 rounded-3xl p-8 text-xl text-white placeholder-zinc-700 outline-none focus:border-cyan-500/30 shadow-2xl resize-none leading-relaxed transition-all mb-10"
                    />
                    
                    <div className="flex justify-end">
                       <button 
                         onClick={handleAnalyze}
                         disabled={!text.trim()}
                         className={`px-10 py-5 rounded-2xl flex items-center gap-4 tracking-[0.1em] font-bold uppercase transition-all shadow-2xl ${
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
                           <p className="text-zinc-500 max-w-sm text-sm leading-relaxed">{result.message}</p>
                        </div>
                     </div>
                   ) : (
                    <div className="flex-1 flex flex-col">
                        {/* HERO RESULT SECTION */}
                        <div className="relative p-8 md:p-10 rounded-[2.5rem] bg-white/[0.03] border border-white/10 mb-10 overflow-hidden group shadow-2xl">
                           <div className={`absolute -right-20 -top-20 w-80 h-80 rounded-full blur-[100px] opacity-20 transition-all duration-1000 group-hover:scale-110 ${getEmotionColor(result.emotion).split(' ')[0]}`}></div>
                           <div className={`absolute -left-20 -bottom-20 w-80 h-80 rounded-full blur-[100px] opacity-10 transition-all duration-1000 group-hover:scale-110 ${getEmotionColor(result.emotion).split(' ')[0]}`}></div>
                           
                           <div className="relative z-10 flex flex-col items-center text-center">
                              <h3 className="text-[9px] font-black text-white/40 uppercase tracking-[0.5em] mb-4">Dominant Resonance</h3>
                              
                              <div className="space-y-2 mb-6">
                                 <h2 className="text-4xl md:text-5xl font-black font-syne text-white tracking-tighter uppercase leading-none drop-shadow-2xl italic">
                                    {result.emotion}
                                 </h2>
                                 <div className="flex items-center justify-center gap-3">
                                    <div className={`h-1 w-8 rounded-full ${getEmotionColor(result.emotion).split(' ')[0]}`}></div>
                                    <span className="text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Neural Lock</span>
                                    <div className={`h-1 w-8 rounded-full ${getEmotionColor(result.emotion).split(' ')[0]}`}></div>
                                 </div>
                              </div>

                              <div className="flex flex-col items-center">
                                 <div className="text-5xl md:text-6xl font-black font-syne text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20 tracking-tighter leading-snug mb-1 pt-2">
                                    {((result.confidence || 0) * 100).toFixed(1)}%
                                 </div>
                                  <span className={`font-bold uppercase tracking-[0.3em] text-[10px] ${getEmotionColor(result.emotion).includes('cyan') ? 'text-cyan-400' : getEmotionColor(result.emotion).includes('amber') || getEmotionColor(result.emotion).includes('yellow') ? 'text-amber-400' : getEmotionColor(result.emotion).includes('rose') ? 'text-rose-400' : 'text-white/40'}`}>Confidence Score</span>
                              </div>
                           </div>
                        </div>
                        
                        <div className="space-y-10 flex-1">
                           <div>
                              <div className="flex items-center gap-4 mb-8">
                                 <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Intensity distribution</h3>
                                 <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>

                                 <button 
                                    onClick={() => { setViewState('input'); setResult(null); setFeedbackStatus(null); setText(''); }}
                                    className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center gap-2"
                                 >
                                    <Zap size={14} /> Retry
                                 </button>
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 md:gap-x-16 gap-y-6 md:gap-y-10">
                                 {Object.entries(result.probabilities || result.breakdown || {}).sort((a,b)=>b[1]-a[1]).map(([emo, val]) => (
                                     <div key={emo} className="flex flex-col gap-3 group">
                                         <div className="flex justify-between items-end px-1">
                                             <span className="text-zinc-400 font-black font-syne uppercase tracking-[0.2em] text-[11px] group-hover:text-white transition-all">{emo}</span>
                                             <span className="text-zinc-500 font-bold text-[10px]">{(val * 100).toFixed(1)}%</span>
                                         </div>
                                         <div className="w-full bg-white/[0.03] rounded-full h-3 overflow-hidden p-[2px] border border-white/5 shadow-inner">
                                             <div 
                                               className={`h-full rounded-full transition-all duration-[2.5s] ease-out shadow-[0_0_20px_rgba(0,0,0,0.5)] ${getEmotionColor(emo)}`}
                                               style={{ width: `${val * 100}%` }}
                                             >
                                                <div className="w-full h-1/2 bg-white/20 rounded-t-full"></div>
                                             </div>
                                         </div>
                                     </div>
                                 ))}
                              </div>
                            </div>
                         </div>

                        {/* Reinforcement Feedback Section */}
                        <div className="mt-12 p-8 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col items-center gap-8 shadow-inner">
                           {feedbackStatus === 'submitted' ? (
                              <div className="flex flex-col items-center gap-6 w-full fade-in">
                                 <div className="flex items-center gap-4 text-emerald-400 font-syne font-bold uppercase tracking-[0.2em] text-xs">
                                    <Activity size={20} className="animate-pulse" />
                                    Neural Pattern Adjusted. Thank you.
                                 </div>
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
                              <div className="flex flex-col md:flex-row items-center justify-between gap-6 w-full">
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
                              </div>
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
