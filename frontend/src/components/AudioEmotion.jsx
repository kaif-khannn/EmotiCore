import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Mic, Square, Upload, Play, Zap, Brain, ArrowLeft } from 'lucide-react';

export default function AudioEmotion() {
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [file, setFile] = useState(null);
  
  const [viewState, setViewState] = useState('input'); // 'input', 'processing', 'result'
  const [result, setResult] = useState(null);
  
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

      const response = await axios.post('http://localhost:8000/api/predict/audio', formData, {
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
      Happy: 'bg-[#34c759] shadow-[0_0_15px_rgba(52,199,89,0.5)]',
      Sad: 'bg-indigo-400 shadow-[0_0_15px_rgba(0,243,255,0.4)]',
      Angry: 'bg-pink-500 shadow-[0_0_15px_rgba(255,0,85,0.4)]',
      Neutral: 'bg-slate-400',
      Fear: 'bg-purple-500 shadow-[0_0_15px_rgba(156,39,176,0.4)]',
      Surprise: 'bg-amber-400 shadow-[0_0_15px_rgba(252,238,10,0.4)]',
      Disgust: 'bg-emerald-600'
    };
    return colors[emotion] || 'bg-pink-400';
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto pt-4">
      <div className="flex items-center gap-4 mb-4 fade-in">
        <div className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.5)]">
          <Mic className="text-pink-400" size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-black font-outfit text-white tracking-wide">Vocal Prosody Analysis</h2>
          <p className="text-slate-400 text-sm font-bold tracking-widest uppercase mt-1">Librosa + HuBERT Engine</p>
        </div>
      </div>

      {/* Massive Single Module Card */}
      <div className="relative w-full min-h-[500px] rounded-[2rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.9)] transition-all duration-500">
          
          {/* Base Glass Background Layer */}
          <div className="absolute inset-0 bg-[#1c1c1e] border border-white/5 opacity-40 backdrop-blur-2xl z-0"></div>

          {/* Glowing Animated Border only active when processing */}
          {viewState === 'processing' && (
             <>
               <div className="absolute top-1/2 left-1/2 w-[200%] h-[200%] bg-[conic-gradient(transparent_0deg,transparent_270deg,#ff3b30_360deg)] animate-[spin_2s_linear_infinite] origin-center -translate-x-1/2 -translate-y-1/2 z-0"></div>
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
                   <h3 className="text-2xl font-black font-outfit uppercase tracking-widest text-white mb-4 drop-shadow-lg">INPUT AUDIO</h3>
                   <p className="text-[#8e8e93] text-sm uppercase font-bold tracking-[0.15em] mb-8 leading-relaxed max-w-2xl">
                     RECORD YOUR VOICE OR UPLOAD AN AUDIO FILE. OUR PIPELINE EXTRACTS MICRO-PITCH MODULATIONS AND VOCAL FRY MAPS INSTANTLY.
                   </p>
                   
                   <div className="flex-1 w-full flex flex-col items-center justify-center p-8 bg-[#111111]/80 border border-t-[rgba(255,255,255,0.1)] border-x-transparent border-b-transparent rounded-2xl shadow-inner mb-6 relative overflow-hidden">
                       
                       {recording && (
                         <div className="absolute inset-0 flex items-center justify-center opacity-40">
                            <div className="w-56 h-56 bg-red-500 rounded-full blur-[60px] animate-pulse"></div>
                         </div>
                       )}

                       <div className="relative z-10 flex flex-col items-center">
                         <button 
                           onClick={recording ? stopRecording : (!audioURL ? startRecording : undefined)}
                           className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all border outline-none ${
                             recording ? 'bg-red-500 hover:bg-red-600 border-red-400 shadow-[0_0_30px_rgba(255,0,0,0.6)] animate-pulse' : 
                             audioURL ? 'bg-[#34c759]/20 border-[#34c759]/50 shadow-[0_0_20px_rgba(52,199,89,0.3)]' :
                             'bg-pink-500 hover:bg-pink-600 border-pink-400 shadow-[0_0_30px_rgba(255,0,85,0.5)] hover:scale-105'
                           }`}
                         >
                           {recording ? <Square fill="white" size={32} className="text-white" /> : 
                            audioURL ? <Play size={32} className="text-[#34c759]" fill="#34c759" /> : 
                            <Mic size={40} className="text-white" />}
                         </button>
                         
                         <h2 className="text-2xl font-outfit font-black mb-1">{recording ? formatTime(recordTimer) : (audioURL ? 'AUDIO READY' : 'CLICK TO RECORD')}</h2>
                         <p className="text-sm font-bold tracking-widest text-slate-400 uppercase">{recording ? 'Recording voice sample...' : 'Max duration: 30s'}</p>
                       </div>

                       {!recording && !audioURL && (
                         <div className="mt-8 relative flex items-center w-full justify-center gap-4">
                           <div className="w-24 border-t border-white/10"></div>
                           <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">OR UPLOAD FILE</span>
                           <div className="w-24 border-t border-white/10"></div>
                         </div>
                       )}
                       
                       {!recording && !audioURL && (
                         <label className="mt-4 flex items-center justify-center gap-3 p-3 px-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full cursor-pointer transition-colors">
                           <Upload size={18} className="text-slate-400" />
                           <span className="text-sm font-bold uppercase tracking-wider text-slate-300">Browse...</span>
                           <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
                         </label>
                       )}
                   </div>
                   
                   <div className="flex justify-between items-center mt-2">
                      <button 
                         onClick={() => { setAudioURL(null); setFile(null); }}
                         className={`text-slate-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest ${audioURL ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                      >
                         Discard Audio
                      </button>
                      <button 
                        onClick={handleAnalyze}
                        disabled={!audioURL}
                        className={`px-8 py-5 rounded-full flex items-center gap-3 tracking-widest font-bold uppercase transition-all shadow-lg text-white ${
                            audioURL ? "bg-[#ff9500]/15 hover:bg-[#ff9500]/30 border border-[#ff9500]/40 border-t-[#ff9500]/70 shadow-[0_10px_30px_rgba(255,149,0,0.3)] hover:shadow-[0_15px_40px_rgba(255,149,0,0.5)] hover:scale-105" : "bg-white/5 text-slate-500 cursor-not-allowed border border-white/10"
                        }`}
                      >
                         <Zap size={20} /> ANALYZE EMOTION
                      </button>
                   </div>
                </div>
             )}

             {viewState === 'processing' && (
                <div className="flex flex-col h-full fade-in flex-1 items-center justify-center gap-10">
                   {/* Massive Rotating Graphic */}
                   <div className="relative">
                      <div className="absolute inset-0 bg-pink-500/20 blur-2xl rounded-full scale-150 animate-pulse"></div>
                      <svg width="0" height="0">
                        <linearGradient id="glowGears" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop stopColor="#ff3b30" offset="0%" />
                          <stop stopColor="#9C27B0" offset="100%" />
                        </linearGradient>
                      </svg>
                      <Mic size={100} className="text-transparent drop-shadow-[0_0_30px_rgba(255,0,85,0.8)] animate-[pulse_1s_linear_infinite]" style={{ stroke: 'url(#glowGears)' }} strokeWidth={1} />
                   </div>
                   
                   <p className="animate-pulse tracking-[0.3em] text-pink-500 font-black font-outfit text-xl uppercase drop-shadow-[0_0_10px_rgba(255,0,85,0.6)]">
                      Synthesizing Vocal Frequencies...
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
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Primary Pitch Topology</h3>
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
                           {Object.entries((result.probabilities || result.breakdown || {})).sort((a,b)=>b[1]-a[1]).map(([emo, val]) => (
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
                            setAudioURL(null);
                            setFile(null);
                         }} 
                         className="flex items-center gap-3 text-pink-500 hover:text-white transition-colors font-bold tracking-widest uppercase text-sm"
                      >
                         <ArrowLeft size={18} /> Record New Voice Sample
                      </button>
                   </div>
                </div>
             )}

          </div>
      </div>
    </div>
  );
}
