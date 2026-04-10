import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Mic, Square, Upload, Play, Zap, Brain, ArrowLeft, Grid } from 'lucide-react';

export default function AudioEmotion({ onReturnHome }) {
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [file, setFile] = useState(null);
  
  const [viewState, setViewState] = useState('input'); // 'input', 'processing', 'result'
  const [result, setResult] = useState(null);
  const [feedbackStatus, setFeedbackStatus] = useState(null);
  const EMOTIONS = ["happy", "sad", "angry", "fear", "neutral", "surprise", "disgust"];

  const handleFeedback = async (isCorrect, correction = null) => {
    try {
      await fetch('http://127.0.0.1:8000/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modality: 'audio',
          predicted: result.emotion.toLowerCase(),
          corrected: isCorrect ? result.emotion.toLowerCase() : correction.toLowerCase(),
          raw_input: file ? file.name : "Recorded Fragment"
        })
      });
      setFeedbackStatus('submitted');
    } catch (error) {
      console.error('Feedback submission failed:', error);
    }
  };

  const [recordTimer, setRecordTimer] = useState(0);
  const timerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      recorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
        setAudioURL(URL.createObjectURL(audioBlob));
        chunksRef.current = [];
        stream.getTracks().forEach(track => track.stop());
      };

      chunksRef.current = [];
      recorder.start();
      mediaRecorderRef.current = recorder;
      
      setRecording(true);
      setAudioURL(null);
      setFile(null);
      setRecordTimer(0);
      timerRef.current = setInterval(() => setRecordTimer((prev) => prev + 1), 1000);
    } catch (err) {
      console.error("Microphone access denied or failing:", err);
      alert('Microphone access denied. Please enable microphone permissions in your browser settings.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    clearInterval(timerRef.current);
  };

  const handleFileUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setAudioURL(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleAnalyze = async () => {
    if (!audioURL) return;
    setViewState('processing');
    try {
      const res = await fetch(audioURL);
      const fetchRes = await res.blob();
      
      const formData = new FormData();
      formData.append('file', fetchRes, 'audio.wav');

      const response = await axios.post('http://127.0.0.1:8000/api/predict/audio', formData, {
         headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.error) {
         throw new Error(response.data.error);
      }
      setResult(response.data);
      setTimeout(() => { setViewState('result'); }, 1500);
    } catch (err) {
      console.error('Audio analysis failed:', err);
      setResult({ error: true, message: err.message || 'Backend unreachable. Ensure the server is running on port 8000.' });
      setViewState('result');
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
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
    return colors[emotion] || 'bg-rose-400';
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto pt-4">
      <div className="flex items-center gap-6 mb-6 fade-in">
        <div className="p-5 obsidian-panel border-white/10 bg-white/5 flex items-center justify-center text-rose-400 shadow-2xl">
          <Mic size={36} />
        </div>
        <div>
          <h2 className="text-4xl font-extrabold font-syne text-white tracking-tight">Vocal <span className="gradient-text">Prosody</span></h2>
          <p className="text-zinc-500 text-[10px] font-bold tracking-[0.3em] uppercase mt-2">Neural Frequency Analysis</p>
        </div>
      </div>

      {/* Massive Single Module Card */}
      {/* Massive Single Module Card - Optimized for Expansion & Containment */}
      <div className="relative w-full rounded-[2rem] shadow-[0_40px_80px_rgba(0,0,0,0.9)] transition-all duration-700 bg-[#0a0a0a] border-t border-white/10 overflow-hidden">
          
           {/* Foreground App Content Layer */}
           <div className="relative z-20 w-full flex flex-col p-10 md:p-16 min-h-[500px] font-jakarta">
              
              {viewState === 'input' && (
                 <div className="flex flex-col h-full fade-in flex-1">
                    <h3 className="text-sm font-bold font-jakarta uppercase tracking-[0.2em] text-zinc-500 mb-6 px-1">Audio Source</h3>
                    
                    <div className="flex-1 w-full flex flex-col items-center justify-center p-12 bg-white/5 border border-white/5 rounded-[2.5rem] shadow-2xl mb-10 relative overflow-hidden group transition-all duration-700">
                        
                        {recording && (
                          <div className="absolute inset-0 flex items-center justify-center">
                             <div className="w-[400px] h-[400px] bg-rose-500/10 rounded-full blur-[100px] animate-pulse"></div>
                          </div>
                        )}

                        <div className="relative z-10 flex flex-col items-center">
                          <button 
                            onClick={recording ? stopRecording : (!audioURL ? startRecording : undefined)}
                            className={`w-32 h-32 rounded-full flex items-center justify-center mb-10 transition-all border outline-none group-hover:scale-105 ${
                              recording ? 'bg-rose-500 border-rose-400 shadow-[0_0_50px_rgba(255,0,85,0.4)] animate-pulse' : 
                              audioURL ? 'bg-emerald-500/20 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]' :
                              'bg-white text-black border-white shadow-2xl'
                            }`}
                          >
                            {recording ? <Square fill="currentColor" size={40} /> : 
                             audioURL ? <Play size={48} className="text-emerald-400 translate-x-1" fill="currentColor" /> : 
                             <Mic size={56} />}
                          </button>
                          
                          <h2 className="text-4xl font-jakarta font-bold mb-3 tracking-tighter text-white">
                            {recording ? formatTime(recordTimer) : (audioURL ? 'SIGNAL READY' : 'INITIALIZE')}
                          </h2>
                          <p className="text-[10px] font-bold tracking-[0.4em] text-zinc-500 uppercase">
                            {recording ? 'Capturing Neural Resonance' : 'Awaiting Vocal Input'}
                          </p>
                        </div>

                        {!recording && !audioURL && (
                          <div className="mt-12 flex flex-col items-center gap-6 w-full max-w-xs">
                            <div className="flex items-center w-full gap-4 opacity-50">
                               <div className="flex-1 h-px bg-zinc-800"></div>
                               <span className="text-[10px] font-bold text-zinc-600 tracking-widest uppercase">OR</span>
                               <div className="flex-1 h-px bg-zinc-800"></div>
                            </div>
                            
                            <label className="group/btn flex items-center justify-center gap-4 py-4 px-10 bg-zinc-900 hover:bg-zinc-800 border border-white/5 rounded-2xl cursor-pointer transition-all shadow-xl active:scale-95">
                               <Upload size={20} className="text-zinc-500 group-hover/btn:text-white transition-colors" />
                               <span className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 group-hover/btn:text-white transition-colors">Import stream</span>
                               <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
                            </label>
                          </div>
                        )}
                    </div>
                    
                    <div className="flex justify-between items-center px-2">
                       <button 
                          onClick={() => { setAudioURL(null); setFile(null); }}
                          className={`text-zinc-500 hover:text-white transition-all text-[11px] font-bold uppercase tracking-[0.2em] py-2 border-b border-transparent hover:border-white/20 ${audioURL ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                       >
                          Discard Fragment
                       </button>
                       <button 
                         onClick={handleAnalyze}
                         disabled={!audioURL}
                         className={`px-12 py-5 rounded-2xl flex items-center gap-4 tracking-[0.1em] font-bold font-jakarta uppercase transition-all shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${
                             audioURL ? "bg-white text-black hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(0,243,255,0.4)] hover:scale-[1.02]" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                         }`}
                       >
                          Analyze <Zap size={20} />
                       </button>
                    </div>
                 </div>
              )}

             {viewState === 'processing' && (
                <div className="flex flex-col h-full fade-in flex-1 items-center justify-center gap-12">
                   <div className="relative">
                      <div className="absolute inset-0 bg-rose-500/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
                      <Mic size={120} className="text-rose-400 drop-shadow-[0_0_40px_rgba(255,0,85,0.4)] animate-pulse" strokeWidth={1} />
                   </div>
                   
                   <div className="space-y-4 text-center">
                      <p className="tracking-[0.4em] text-white font-extrabold font-syne text-xl uppercase italic">
                         Extracting Prosody Maps
                      </p>
                      <div className="flex gap-3 justify-center">
                         <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-bounce"></div>
                         <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                         <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      </div>
                   </div>
                </div>
             )}

             {viewState === 'result' && result && (
                <div className="flex flex-col h-full fade-in flex-1 font-jakarta">
                   {result.error ? (
                     <div className="flex-1 flex flex-col items-center justify-center gap-8 text-center px-6">
                        <div className="w-24 h-24 rounded-[2rem] bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-2xl">
                           <Zap size={48} />
                        </div>
                        <div className="space-y-3">
                           <h3 className="text-3xl font-syne font-extrabold text-white uppercase tracking-tighter">Stream Malfunction</h3>
                           <p className="text-zinc-500 max-w-sm text-sm leading-relaxed">{result.message}</p>
                        </div>
                     </div>
                   ) : (
                   <div className="flex-1 flex flex-col">
                       <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 border-b border-white/5 pb-10 gap-6">
                          <div>
                            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mb-4">Neural Signature</h3>
                            <div className="flex items-center gap-6 overflow-hidden">
                               <h2 className="text-3xl md:text-5xl font-extrabold font-syne text-white tracking-tighter uppercase leading-none truncate">{result.emotion}</h2>
                              <div className={`w-4 h-4 rounded-full ${getEmotionColor(result.emotion)} animate-pulse shadow-[0_0_15px_currentColor]`}></div>
                            </div>
                          </div>
                          
                          <div className="md:text-right pt-4 md:pt-0">
                             <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mb-4">Spectral Match</h3>
                             <p className="text-5xl md:text-6xl font-extrabold font-syne text-rose-400 tracking-tighter">{((result.confidence || 0) * 100).toFixed(1)}%</p>
                          </div>
                       </div>
                       
                       <div className="space-y-10 flex-1">
                          <div>
                             <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-8">Harmonic Distribution</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
                                 {Object.entries((result.probabilities || result.breakdown || {})).sort((a,b)=>b[1]-a[1]).map(([emo, val]) => (
                                     <div key={emo} className="flex flex-col gap-3 group">
                                        <div className="flex justify-between items-end">
                                            <span className="text-zinc-400 font-bold font-syne uppercase tracking-widest text-[11px] group-hover:text-white transition-all">{emo}</span>
                                            <span className="text-zinc-500 font-bold text-xs">{(val * 100).toFixed(1)}%</span>
                                        </div>
                                        <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                                            <div 
                                              className={`h-full rounded-full transition-all duration-[2s] cubic-bezier(0.2, 1, 0.2, 1) ${getEmotionColor(emo)}`}
                                              style={{ width: `${val * 100}%` }}
                                            ></div>
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
                          <Brain size={20} className="animate-pulse" />
                          Vocal Heuristics Updated. Thank you.
                        </div>
                        <button 
                           onClick={() => { setViewState('input'); setResult(null); setFeedbackStatus(null); setAudioURL(null); setFile(null); }}
                           className="px-10 py-4 bg-white text-black rounded-2xl font-syne font-black uppercase tracking-widest hover:bg-rose-400 transition-all hover:scale-105 shadow-2xl flex items-center gap-3"
                        >
                           Analyze Another Audio <Zap size={18} />
                        </button>
                      </div>
                    ) : feedbackStatus === 'incorrect' ? (
                      <div className="flex flex-col md:flex-row items-center gap-6 w-full">
                        <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] shrink-0">Correct Emotion:</span>
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
                          <h4 className="text-white font-bold font-syne tracking-widest uppercase text-xs">Is this analysis accurate?</h4>
                          <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-[0.1em]">Help refine our spectral models</p>
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

                       <div className="mt-16 pt-10 border-t border-white/5 flex justify-between items-center">
                          <button 
                             onClick={() => {
                                setViewState('input');
                                setResult(null);
                                setAudioURL(null);
                                setFile(null);
                             }} 
                             className="group flex items-center gap-4 text-white hover:text-rose-400 transition-all font-syne font-bold tracking-[0.2em] uppercase text-xs"
                          >
                             <div className="p-2 rounded-xl bg-white/5 group-hover:bg-rose-400 group-hover:text-black transition-all">
                                <ArrowLeft size={16} />
                             </div>
                             Reset Audio Link
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
