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
      Happy: 'bg-[#34c759] shadow-[0_0_15px_rgba(52,199,89,0.5)]',
      Sad: 'bg-indigo-400 shadow-[0_0_15px_rgba(0,243,255,0.4)]',
      Angry: 'bg-pink-500 shadow-[0_0_15px_rgba(255,0,85,0.4)]',
      Neutral: 'bg-slate-400',
      Fear: 'bg-purple-500 shadow-[0_0_15px_rgba(156,39,176,0.4)]',
      Surprise: 'bg-amber-400 shadow-[0_0_15px_rgba(252,238,10,0.4)]',
      Disgust: 'bg-emerald-600'
    };
    return colors[emotion] || 'bg-indigo-400';
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto pt-4">
      <div className="flex items-center gap-4 mb-4 fade-in">
        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.5)]">
          <MessageSquare className="text-indigo-400" size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-black font-outfit text-white tracking-wide">Semantic Text Analysis</h2>
          <p className="text-slate-400 text-sm font-bold tracking-widest uppercase mt-1">DistilRoBERTa Emotion Routing</p>
        </div>
      </div>

      {/* Massive Single Module Card */}
      <div className="relative w-full min-h-[500px] rounded-[2rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.9)] transition-all duration-500">
          
          {/* Base Glass Background Layer */}
          <div className="absolute inset-0 bg-[#1c1c1e] border border-white/5 opacity-40 backdrop-blur-2xl z-0"></div>

          {/* Glowing Animated Border only active when processing */}
          {viewState === 'processing' && (
             <>
               <div className="absolute top-1/2 left-1/2 w-[200%] h-[200%] bg-[conic-gradient(transparent_0deg,transparent_270deg,#ff9500_360deg)] animate-[spin_2s_linear_infinite] origin-center -translate-x-1/2 -translate-y-1/2 z-0"></div>
               {/* Inner hollow mask so only border glows */}
               <div className="absolute inset-[2px] bg-[#111111]/95 rounded-[2rem] z-10 backdrop-blur-3xl"></div>
             </>
          )}
          {viewState !== 'processing' && (
             <div className="absolute inset-0 bg-[#1c1c1e]/60 backdrop-blur-3xl z-10 border border-[#2a2a2c] rounded-[2rem]"></div>
          )}

          {/* Foreground App Content Layer */}
          <div className="relative z-20 w-full h-full flex flex-col p-8 md:p-12 min-h-[500px]">
             
             {viewState === 'input' && (
                <div className="flex flex-col h-full fade-in flex-1">
                   <h3 className="text-2xl font-black font-outfit uppercase tracking-widest text-white mb-4 drop-shadow-lg">INPUT TEXT</h3>
                   <p className="text-[#8e8e93] text-sm uppercase font-bold tracking-[0.15em] mb-8 leading-relaxed max-w-2xl">
                     ENTER ANY PARAGRAPH, SENTENCE, OR PHRASE. OUR DISTILROBERTA MODEL WILL ANALYZE THE EMOTIONAL UNDERTONES INSTANTLY.
                   </p>
                   
                   <textarea
                      placeholder="E.g., I just received the best news today and I can't wait to celebrate!"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      className="flex-1 w-full bg-[#111111]/80 border border-t-[rgba(255,255,255,0.1)] border-x-transparent border-b-transparent rounded-2xl p-6 text-xl text-white placeholder-slate-600 outline-none focus:border-indigo-500/50 shadow-inner resize-none font-inter leading-relaxed transition-all"
                   />
                   
                   <div className="flex justify-end mt-8">
                      <button 
                        onClick={handleAnalyze}
                        disabled={!text.trim()}
                        className={`px-8 py-5 rounded-full flex items-center gap-3 tracking-widest font-bold uppercase transition-all shadow-lg text-white ${
                            text.trim() ? "bg-[#ff9500]/15 hover:bg-[#ff9500]/30 border border-[#ff9500]/40 border-t-[#ff9500]/70 shadow-[0_10px_30px_rgba(255,149,0,0.3)] hover:shadow-[0_15px_40px_rgba(255,149,0,0.5)] hover:scale-105" : "bg-white/5 text-slate-500 cursor-not-allowed border border-white/10"
                        }`}
                      >
                         <Send size={20} /> ANALYZE EMOTION
                      </button>
                   </div>
                </div>
             )}

             {viewState === 'processing' && (
                <div className="flex flex-col h-full fade-in flex-1 items-center justify-center gap-10">
                   {/* Massive Rotating Logo Graphic */}
                   <div className="relative">
                      <div className="absolute inset-0 bg-[#ff9500]/20 blur-2xl rounded-full scale-150 animate-pulse"></div>
                      <svg width="0" height="0">
                        <linearGradient id="glowBrain" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop stopColor="#ff9500" offset="0%" />
                          <stop stopColor="#ff3b30" offset="100%" />
                        </linearGradient>
                      </svg>
                      <Brain size={100} className="text-transparent drop-shadow-[0_0_30px_rgba(255,149,0,0.8)] animate-[spin_4s_linear_infinite]" style={{ stroke: 'url(#glowBrain)' }} strokeWidth={1} />
                   </div>
                   
                   <p className="animate-pulse tracking-[0.3em] text-[#ff9500] font-black font-outfit text-xl uppercase drop-shadow-[0_0_10px_#ff9500]">
                      Extracting Latent Sentiments...
                   </p>
                </div>
             )}

             {viewState === 'result' && result && (
                <div className="flex flex-col h-full fade-in flex-1 justify-between">
                   {result.error ? (
                     <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
                        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                           <Zap size={40} className="text-red-400" />
                        </div>
                        <h3 className="text-2xl font-black font-outfit text-red-400 uppercase tracking-widest">Analysis Failed</h3>
                        <p className="text-slate-400 max-w-md text-sm leading-relaxed">{result.message}</p>
                     </div>
                   ) : (
                   <div>
                       <div className="flex justify-between items-start mb-10 border-b border-white/10 pb-8">
                          <div>
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Primary Emotion Detected</h3>
                            <div className="flex items-center gap-4">
                              <h2 className="text-6xl font-black font-outfit text-white drop-shadow-lg uppercase tracking-tight">{result.emotion || 'Processing'}</h2>
                            </div>
                          </div>
                          
                          <div className="text-right">
                             <h3 className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Confidence Level</h3>
                             <p className="text-4xl font-black text-white">{((result.confidence || 0) * 100).toFixed(1)}%</p>
                          </div>
                       </div>
                       
                       <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.1em] mb-4">Underlying Emotion Tensor Vector</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                           {Object.entries(result.probabilities || {}).sort((a,b)=>b[1]-a[1]).map(([emo, val]) => (
                               <div key={emo} className="flex flex-col gap-2">
                                  <div className="flex justify-between text-sm">
                                      <span className="text-slate-300 font-bold uppercase tracking-widest">{emo}</span>
                                      <span className="text-slate-400 font-bold">{(val * 100).toFixed(1)}%</span>
                                  </div>
                                  <div className="w-full bg-[#111111] rounded-full h-3 border border-white/5 shadow-inner overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full transition-all duration-1000 ease-out ${getEmotionColor(emo)}`}
                                        style={{ width: `${val * 100}%` }}
                                      ></div>
                                  </div>
                               </div>
                           ))}
                       </div>
                   </div>
                   )}

                   <div className="flex justify-start mt-12 bg-black/20 p-6 rounded-3xl border border-white/5 backdrop-blur-md">
                      <button 
                         onClick={() => {
                            setViewState('input');
                            setResult(null);
                         }} 
                         className="flex items-center gap-3 text-[#ff9500] hover:text-white transition-colors font-bold tracking-widest uppercase text-sm"
                      >
                         <ArrowLeft size={18} /> Process Another Text Stream
                      </button>
                   </div>
                </div>
             )}

          </div>
      </div>
    </div>
  );
}
