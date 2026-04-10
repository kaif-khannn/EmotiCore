import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { Camera, StopCircle, ScanFace, Activity, Upload, Image as ImageIcon, Zap, ArrowLeft, Grid } from 'lucide-react';

export default function ImageEmotion({ onReturnHome }) {
  const [viewState, setViewState] = useState('idle'); // 'idle', 'live', 'preview', 'processing', 'result'
  const [faces, setFaces] = useState([]); 
  const [imageURL, setImageURL] = useState(null);
  const [file, setFile] = useState(null);
  const [globalResult, setGlobalResult] = useState(null);
  const [feedbackStatus, setFeedbackStatus] = useState(null);
  const EMOTIONS = ["happy", "sad", "angry", "fear", "neutral", "surprise", "disgust"];

  const handleFeedback = async (isCorrect, correction = null) => {
    try {
      await fetch('http://127.0.0.1:8000/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modality: 'image',
          predicted: globalResult.emotion.toLowerCase(),
          corrected: isCorrect ? globalResult.emotion.toLowerCase() : correction.toLowerCase(),
          raw_input: file ? file.name : "Camera Frame"
        })
      });
      setFeedbackStatus('submitted');
    } catch (error) {
      console.error('Feedback submission failed:', error);
    }
  };
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const analyzeInterval = useRef(null);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setViewState('live');
      setFaces([]);
      
      // We must wait for the video element to render first now that state changed
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.error("Play failed", e));
        }
      }, 100);

      // Removed analyzeInterval for manual snapshot
    } catch (err) {
      console.error("Camera access error:", err);
      alert("Microphone/Camera access is blocked or unavailable. Ensure localhost permissions.");
    }
  };

  const stopCamera = (forceIdle = true) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (analyzeInterval.current) {
      clearInterval(analyzeInterval.current);
    }
    if (forceIdle) setViewState('idle');
    setFaces([]);
    streamRef.current = null;
  };

  const captureSnapshot = async () => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) return;
    const video = videoRef.current;
    if (video.readyState < 2) return; 

    setViewState('processing');

    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      stopCamera(false); 
      const formData = new FormData();
      formData.append('file', blob, 'frame.jpg');

      try {
        const response = await axios.post('http://127.0.0.1:8000/api/predict/image', formData, {
           headers: { 'Content-Type': 'multipart/form-data' }
        });
        const data = response.data;
        if (data.error) throw new Error(data.error);
        
        setGlobalResult(data);
        setTimeout(() => setViewState('result'), 1200);
      } catch (err) {
        console.error("Backend Error:", err);
        setGlobalResult({ error: true, message: err.message || 'Backend unreachable. Ensure the server is running on port 8000.' });
        setViewState('result');
      }
    }, 'image/jpeg', 0.8);
  };

  const handleFileUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      stopCamera(false);
      setFile(selectedFile);
      setImageURL(URL.createObjectURL(selectedFile));
      setViewState('preview');
    }
  };

  const handleAnalyzePhoto = async () => {
    if (!file) return;
    setViewState('processing');
    try {
      const formData = new FormData();
      formData.append('file', file, 'upload.jpg');

      const response = await axios.post('http://127.0.0.1:8000/api/predict/image', formData, {
         headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.error) throw new Error(response.data.error);
      
      setGlobalResult(response.data);
      setTimeout(() => setViewState('result'), 1500);
    } catch (err) {
      console.error('Image analysis failed:', err);
      setGlobalResult({ error: true, message: err.message || 'Backend unreachable. Ensure the server is running on port 8000.' });
      setViewState('result');
    }
  };

  const getEmotionStyling = (emotion) => {
    const raw = emotion ? emotion.toLowerCase() : 'neutral';
    if (raw.includes('happ') || raw.includes('joy') || raw.includes('excit')) return { borderColor: 'var(--accent-vibrant-yellow)', bg: 'var(--accent-vibrant-yellow)', text: '#000000', label: emotion }; 
    if (raw.includes('sad')) return { borderColor: 'var(--accent-primary)', bg: 'var(--accent-primary)', text: '#ffffff', label: emotion }; 
    if (raw.includes('angr') || raw.includes('furious')) return { borderColor: 'var(--accent-secondary)', bg: 'var(--accent-secondary)', text: '#ffffff', label: emotion }; 
    if (raw.includes('fear') || raw.includes('scare')) return { borderColor: '#a855f7', bg: '#a855f7', text: '#ffffff', label: emotion }; 
    if (raw.includes('surpris')) return { borderColor: '#fb923c', bg: '#fb923c', text: '#000000', label: emotion }; 
    if (raw.includes('disgust')) return { borderColor: '#10b981', bg: '#10b981', text: '#ffffff', label: emotion };
    return { borderColor: '#52525b', bg: '#52525b', text: '#ffffff', label: emotion || 'Neutral' };
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pt-4">
      <div className="flex items-center gap-6 mb-6 fade-in">
        <div className="p-5 obsidian-panel border-white/10 bg-white/5 flex items-center justify-center text-amber-400 shadow-2xl">
          <Camera size={36} />
        </div>
        <div>
          <h2 className="text-4xl font-extrabold font-syne text-white tracking-tight">Optical <span className="gradient-text text-amber-400">Sensors</span></h2>
          <p className="text-zinc-500 text-[10px] font-bold tracking-[0.3em] uppercase mt-2">Neural Visual Matrix</p>
        </div>
      </div>

      <div className="relative w-full rounded-[3rem] shadow-[0_45px_100px_rgba(0,0,0,0.95)] transition-all duration-700 bg-[#050505] border-t border-white/10 flex flex-col justify-center items-center overflow-hidden aspect-video min-h-[400px] md:min-h-[500px]">
          
           <canvas ref={canvasRef} className="hidden" />

          {/* Glowing Animated Border for Processing State */}
          {viewState === 'processing' && (
             <>
               <div className="absolute top-1/2 left-1/2 w-[200%] h-[200%] bg-[conic-gradient(transparent_0deg,transparent_270deg,var(--accent-vibrant-yellow)_360deg)] animate-[spin_1s_linear_infinite] origin-center -translate-x-1/2 -translate-y-1/2 z-0 opacity-40"></div>
               <div className="absolute inset-[1px] bg-[#050505] rounded-[3rem] z-10"></div>
             </>
          )}

          {/* Idle Screen UI - Dual Option (Live vs Upload) */}
          {viewState === 'idle' && (
            <div className="relative z-20 flex flex-col items-center justify-center p-12 fade-in w-full text-center font-jakarta">
               <div className="relative mb-12">
                  <div className="absolute inset-0 bg-amber-400/20 blur-[100px] rounded-full scale-150 animate-pulse"></div>
                  <ScanFace size={120} className="text-amber-400 drop-shadow-[0_0_40px_rgba(252,238,10,0.4)]" strokeWidth={1} />
               </div>
               
               <h3 className="text-[11px] font-bold font-jakarta uppercase tracking-[0.5em] text-zinc-600 mb-12 px-1">Optical Initialization Required</h3>
               
               <div className="flex flex-col sm:flex-row items-center justify-center gap-10 w-full max-w-3xl px-6">
                 <button 
                    onClick={startCamera}
                    className="group w-full sm:w-[240px] h-[120px] rounded-[1.8rem] flex items-center justify-center gap-6 transition-all shadow-2xl bg-[#121212] border border-white/10 text-white/80 hover:text-white hover:bg-zinc-900 active:scale-95"
                 >
                    <Camera size={28} className="text-white/60 group-hover:text-white transition-colors" /> 
                    <div className="flex flex-col items-start leading-tight">
                       <span className="text-lg font-bold font-jakarta uppercase tracking-widest">Capture</span>
                    </div>
                 </button>

                 <div className="flex items-center gap-6 opacity-30 px-2 lg:px-6">
                    <div className="w-12 h-[1px] bg-zinc-600"></div>
                    <span className="text-[10px] font-bold text-zinc-500 tracking-[0.2em] uppercase">OR</span>
                    <div className="w-12 h-[1px] bg-zinc-600"></div>
                 </div>

                 <label className="group/btn w-full sm:w-[240px] h-[120px] rounded-[1.8rem] flex items-center justify-center gap-6 transition-all bg-[#121212] border border-white/10 text-white/80 hover:text-white hover:bg-zinc-900 cursor-pointer shadow-2xl active:scale-95">
                    <Upload size={28} className="text-white/60 group-hover/btn:text-white transition-colors" /> 
                    <span className="text-lg font-bold font-jakarta uppercase tracking-widest">Import</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                 </label>
               </div>
            </div>
          )}

          {/* Photo Preview Mode */}
          {viewState === 'preview' && imageURL && (
            <div className="relative z-20 flex flex-col items-center justify-center p-10 md:p-16 w-full h-full fade-in flex-1 font-jakarta">
                <h3 className="text-[10px] font-bold font-jakarta uppercase tracking-[0.2em] text-zinc-500 mb-8 w-full text-left">Static Image Import</h3>
               
               <div className="w-full flex-1 flex items-center justify-center p-6 bg-white/5 border border-white/5 rounded-[2.5rem] mb-10 relative overflow-hidden min-h-[350px] shadow-2xl">
                  <img src={imageURL} alt="Upload" className="max-h-full max-w-full rounded-2xl object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]" />
               </div>
               
               <div className="flex justify-between items-center w-full px-2">
                  <button 
                     onClick={() => { setImageURL(null); setFile(null); setViewState('idle'); }}
                     className="text-zinc-500 hover:text-white transition-all text-xs font-bold uppercase tracking-[0.2em] py-2 border-b border-transparent hover:border-white/20"
                  >
                     Discard stream
                  </button>
                  <button 
                    onClick={handleAnalyzePhoto}
                    className="px-12 py-5 rounded-2xl flex items-center gap-4 tracking-[0.1em] font-bold font-jakarta uppercase transition-all bg-white text-black hover:bg-amber-400 hover:shadow-[0_0_30px_rgba(252,238,10,0.4)] hover:scale-[1.02] shadow-2xl"
                  >
                     Analyze <Zap size={20} />
                  </button>
               </div>
            </div>
          )}

          {/* Processing Photo Overlay */}
          {viewState === 'processing' && (
            <div className="flex flex-col h-full fade-in flex-1 items-center justify-center gap-12 z-20 py-20">
               <div className="relative">
                  <div className="absolute inset-0 bg-amber-400/20 blur-[100px] rounded-full scale-150 animate-pulse"></div>
                  <ScanFace size={130} className="text-amber-400 drop-shadow-[0_0_50px_rgba(252,238,10,0.5)] animate-pulse" strokeWidth={1} />
               </div>
               <div className="space-y-4 text-center">
                  <p className="tracking-[0.4em] text-white font-bold font-jakarta text-2xl uppercase italic">
                     Neural Mapping
                  </p>
                  <div className="flex gap-3 justify-center">
                     <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce"></div>
                     <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                     <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  </div>
               </div>
            </div>
          )}

          {viewState === 'result' && globalResult && (
            <div className="relative z-20 flex flex-col fade-in flex-1 justify-between w-full p-10 md:p-16 font-jakarta">
               {globalResult.error ? (
                 <div className="flex-1 flex flex-col items-center justify-center gap-8 text-center px-10">
                    <div className="w-24 h-24 rounded-[2rem] bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-2xl">
                       <Zap size={48} />
                    </div>
                    <div className="space-y-3">
                       <h3 className="text-3xl font-syne font-extrabold text-white uppercase tracking-tighter">Sensor Malfunction</h3>
                       <p className="text-zinc-500 max-w-sm text-sm leading-relaxed">{globalResult.message}</p>
                    </div>
                 </div>
               ) : (
               <div className="flex-1 flex flex-col">
                   <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 border-b border-white/5 pb-10 gap-8">
                      <div>
                        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mb-4">Neural Signature</h3>
                        <div className="flex items-center gap-8">
                          <h2 className="text-3xl md:text-5xl font-extrabold font-syne text-white tracking-tighter uppercase leading-none truncate">{globalResult.emotion}</h2>
                          <div className="w-5 h-5 rounded-full animate-pulse shadow-[0_0_20px_currentColor]" style={{ backgroundColor: getEmotionStyling(globalResult.emotion).bg, color: getEmotionStyling(globalResult.emotion).bg }}></div>
                        </div>
                      </div>
                      <div className="md:text-right pt-4 md:pt-0">
                         <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mb-4">Probability Match</h3>
                         <p className="text-5xl md:text-6xl font-extrabold font-syne text-amber-400 tracking-tighter">{((globalResult.confidence || 0) * 100).toFixed(1)}%</p>
                      </div>
                   </div>
                   
                   <div className="space-y-12 flex-1">
                      <div>
                         <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-8">Intensity Distribution</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
                             {Object.entries((globalResult.probabilities || globalResult.breakdown || {})).sort((a,b)=>b[1]-a[1]).map(([emo, val]) => {
                                 const st = getEmotionStyling(emo);
                                 return (
                                   <div key={emo} className="flex flex-col gap-3 group">
                                      <div className="flex justify-between items-end">
                                          <span className="text-zinc-400 font-bold font-syne uppercase tracking-widest text-[11px] group-hover:text-white transition-all">{emo}</span>
                                          <span className="text-zinc-500 font-bold text-xs">{(val * 100).toFixed(1)}%</span>
                                      </div>
                                      <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                                          <div 
                                            className="h-full rounded-full transition-all duration-[2s] cubic-bezier(0.19, 1, 0.22, 1)"
                                            style={{ width: `${val * 100}%`, backgroundColor: st.bg, boxShadow: `0 0 10px ${st.bg}44` }}
                                          ></div>
                                      </div>
                                   </div>
                                 );
                             })}
                         </div>
                      </div>
                    </div>

                    {/* Reinforcement Feedback Section */}
                    <div className="mt-12 p-8 rounded-3xl bg-white/[0.04] border border-white/5 flex flex-col items-center gap-8 shadow-inner w-full">
                      {feedbackStatus === 'submitted' ? (
                        <div className="flex flex-col items-center gap-6 w-full fade-in">
                           <div className="flex items-center gap-4 text-emerald-400 font-syne font-bold uppercase tracking-[0.2em] text-xs">
                              <ScanFace size={20} className="animate-pulse" />
                              Visual Matrix Adjusted. Thank you.
                           </div>
                           <button 
                              onClick={() => { setViewState('idle'); setGlobalResult(null); setFeedbackStatus(null); setImageURL(null); setFile(null); }}
                              className="px-10 py-4 bg-white text-black rounded-2xl font-syne font-black uppercase tracking-widest hover:bg-amber-400 transition-all hover:scale-105 shadow-2xl flex items-center gap-3"
                           >
                              Analyze Another Frame <Zap size={18} />
                           </button>
                        </div>
                      ) : feedbackStatus === 'incorrect' ? (
                        <div className="flex flex-col md:flex-row items-center gap-6 w-full">
                           <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] shrink-0">Correct Emotion:</span>
                           <div className="flex flex-wrap gap-2 flex-1">
                              {EMOTIONS.filter(e => e !== globalResult.emotion.toLowerCase()).map(emo => (
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
                              <h4 className="text-white font-bold font-syne tracking-widest uppercase text-xs">Is this visual prediction accurate?</h4>
                              <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-[0.1em]">Help refine our convolutional kernels</p>
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
                         onClick={() => { setViewState('idle'); setGlobalResult(null); setImageURL(null); setFile(null); }} 
                         className="group flex items-center gap-5 text-white hover:text-amber-400 transition-all font-syne font-bold tracking-[0.2em] uppercase text-xs"
                      >
                         <div className="p-2 rounded-xl bg-white/5 group-hover:bg-amber-400 group-hover:text-black transition-all">
                            <ArrowLeft size={16} />
                         </div>
                         Initialize New stream
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

          {/* Live Camera Stream Block */}
          <video 
            ref={videoRef} 
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${viewState === 'live' ? 'opacity-100 z-10' : 'opacity-0 z-0 hidden'}`}
            autoPlay 
            playsInline 
            muted 
          />
          {viewState === 'live' && (
            <div className="absolute inset-0 z-30 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100%_4px] opacity-20 Mix-blend-overlay"></div>
          )}
          {viewState === 'live' && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40 fade-in">
               <button 
                  onClick={captureSnapshot}
                  className="px-10 py-5 bg-white text-black font-syne font-extrabold uppercase tracking-widest rounded-full hover:bg-amber-400 hover:shadow-[0_0_40px_rgba(252,238,10,0.6)] hover:scale-[1.05] transition-all flex items-center gap-4 drop-shadow-2xl active:scale-95 border-4 border-white/20 hover:border-transparent bg-clip-padding"
               >
                  <Camera size={26} /> Capture Snapshot
               </button>
            </div>
          )}
      </div>

      {viewState === 'live' && (
        <div className="flex justify-center mt-6 fade-in relative z-50">
           <button 
              onClick={stopCamera}
              className="px-10 py-5 rounded-2xl flex items-center gap-4 tracking-[0.2em] font-extrabold font-syne uppercase transition-all bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/20 hover:shadow-[0_0_40px_rgba(255,0,85,0.4)] active:scale-95"
           >
              <StopCircle size={24} /> Terminate stream
           </button>
        </div>
      )}

    </div>
  );
}
