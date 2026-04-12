import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { Camera, StopCircle, ScanFace, Activity, Upload, Image as ImageIcon, Zap } from 'lucide-react';
import { API_BASE_URL } from '../config';

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
      await fetch(`${API_BASE_URL}/api/feedback`, {
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
        const response = await axios.post(`${API_BASE_URL}/api/predict/image`, formData, {
           headers: { 'Content-Type': 'multipart/form-data' }
        });
        const data = response.data;
        if (data.error) throw new Error(data.error);
        
        setGlobalResult(data);
        setTimeout(() => setViewState('result'), 1200);
      } catch (err) {
        console.error("Backend Error:", err);
        const msg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Backend unreachable.';
        setGlobalResult({ error: true, message: msg });
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

      const response = await axios.post(`${API_BASE_URL}/api/predict/image`, formData, {
         headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.error) throw new Error(response.data.error);
      
      setGlobalResult(response.data);
      setTimeout(() => setViewState('result'), 1500);
    } catch (err) {
      console.error('Image analysis failed:', err);
      const msg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Backend unreachable.';
      setGlobalResult({ error: true, message: msg });
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
      Disgust: 'bg-emerald-500 shadow-[0_0_20_rgba(16,185,129,0.3)]'
    };
    return colors[emotion] || 'bg-amber-400';
  };

  const getEmoji = (emotion) => {
    const emojis = {
      Happy: '😊', Sad: '😢', Angry: '😠', Neutral: '😐', 
      Fear: '😨', Surprise: '😲', Disgust: '🤢'
    };
    return emojis[emotion] || '🧠';
  };


  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pt-4 h-full font-jakarta">
      <div className="flex items-center justify-between mb-6 fade-in px-2">
        <div className="flex items-center gap-6">
          <div className="p-5 obsidian-panel border-white/10 bg-white/5 flex items-center justify-center text-amber-400 shadow-2xl">
            <Camera size={36} />
          </div>
          <div>
            <h2 className="text-4xl font-extrabold font-syne text-white tracking-tight leading-none">Optical <span className="gradient-text text-amber-400">Sensors</span></h2>
            <p className="text-zinc-500 text-[10px] font-bold tracking-[0.3em] uppercase mt-3">Neural Visual Matrix</p>
          </div>
        </div>
      </div>

      <div className="relative w-full rounded-[3rem] shadow-[0_45px_100px_rgba(0,0,0,0.95)] transition-all duration-700 bg-[#050505] border-t border-white/10 flex flex-col justify-center items-center overflow-hidden max-h-[85vh] sm:max-h-[75vh] aspect-video min-h-[400px] md:min-h-[500px]">
          
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
            <div className="relative z-20 flex flex-col items-center justify-center p-12 fade-in w-full text-center">
               <div className="relative mb-12">
                  <div className="absolute inset-0 bg-amber-400/20 blur-[100px] rounded-full scale-150 animate-pulse"></div>
                  <ScanFace size={120} className="text-amber-400 drop-shadow-[0_0_40px_rgba(252,238,10,0.4)]" strokeWidth={1} />
               </div>
               
               <h3 className="text-[11px] font-bold uppercase tracking-[0.5em] text-zinc-600 mb-12 px-1 text-center">Optical Initialization Required</h3>
               
               <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 w-full max-w-3xl px-6">
                 <button 
                    onClick={startCamera}
                    className="group w-full sm:w-[240px] h-[90px] sm:h-[120px] rounded-[1.8rem] flex items-center justify-center gap-6 transition-all shadow-2xl bg-[#121212] border border-white/10 text-white/80 hover:text-white hover:bg-zinc-900 active:scale-95"
                 >
                    <Camera size={28} className="text-white/60 group-hover:text-white transition-colors" /> 
                    <div className="flex flex-col items-start leading-tight">
                       <span className="text-lg font-bold uppercase tracking-widest">Capture</span>
                    </div>
                 </button>

                 <div className="flex items-center gap-6 opacity-30 px-2 lg:px-6">
                    <div className="w-12 h-[1px] bg-zinc-600"></div>
                    <span className="text-[10px] font-bold text-zinc-500 tracking-[0.2em] uppercase">OR</span>
                    <div className="w-12 h-[1px] bg-zinc-600"></div>
                 </div>

                 <label className="group/btn w-full sm:w-[240px] h-[90px] sm:h-[120px] rounded-[1.8rem] flex items-center justify-center gap-6 transition-all bg-[#121212] border border-white/10 text-white/80 hover:text-white hover:bg-zinc-900 cursor-pointer shadow-2xl active:scale-95">
                    <Upload size={28} className="text-white/60 group-hover/btn:text-white transition-colors" /> 
                    <span className="text-lg font-bold uppercase tracking-widest">Import</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                 </label>
               </div>
            </div>
          )}

          {/* Photo Preview Mode */}
          {viewState === 'preview' && imageURL && (
            <div className="relative z-20 flex flex-col items-center justify-center p-10 md:p-14 w-full h-full fade-in flex-1">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-8 w-full text-left">Static Image Import</h3>
               
               <div className="w-full flex-1 flex items-center justify-center p-6 bg-white/5 border border-white/5 rounded-[2.5rem] mb-10 relative overflow-hidden min-h-[300px] shadow-2xl">
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
                    className="px-12 py-5 rounded-2xl flex items-center gap-4 tracking-[0.1em] font-bold uppercase transition-all bg-white text-black hover:bg-amber-400 hover:shadow-[0_0_30px_rgba(252,238,10,0.4)] hover:scale-[1.02] shadow-2xl"
                  >
                     Analyze <Zap size={20} />
                  </button>
               </div>
            </div>
          )}

          {/* Processing Photo Overlay */}
          {viewState === 'processing' && (
            <div className="flex flex-col h-full fade-in flex-1 items-center justify-center gap-12 z-20 py-20 px-10 text-center">
               <div className="relative">
                  <div className="absolute inset-0 bg-amber-400/20 blur-[100px] rounded-full scale-150 animate-pulse"></div>
                  <ScanFace size={110} className="text-amber-400 drop-shadow-[0_0_50px_rgba(252,238,10,0.5)] animate-pulse" strokeWidth={1} />
               </div>
               <div className="space-y-4 text-center">
                  <p className="tracking-[0.4em] text-white font-bold text-xl uppercase italic">
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
            <div className="relative z-20 flex flex-col fade-in flex-1 justify-between w-full p-10 md:p-14">
               {globalResult.error ? (
                 <div className="flex-1 flex flex-col items-center justify-center gap-8 text-center px-10 font-syne">
                    <div className="w-24 h-24 rounded-[2rem] bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-2xl">
                       <Zap size={48} />
                    </div>
                    <div className="space-y-3">
                       <h3 className="text-3xl font-extrabold text-white uppercase tracking-tighter">Sensor Malfunction</h3>
                       <p className="text-zinc-500 max-w-sm text-sm leading-relaxed">{globalResult.message}</p>
                    </div>
                 </div>
               ) : (
                <div className="flex-1 flex flex-col h-full">
                    <div className="relative p-8 md:p-10 rounded-[2.5rem] bg-white/[0.03] border border-white/10 mb-10 overflow-hidden group shadow-2xl">
                        <div className={`absolute -right-20 -top-20 w-80 h-80 rounded-full blur-[100px] opacity-20 transition-all duration-1000 group-hover:scale-110 ${getEmotionColor(globalResult.emotion).split(' ')[0]}`}></div>
                        <div className={`absolute -left-20 -bottom-20 w-80 h-80 rounded-full blur-[100px] opacity-10 transition-all duration-1000 group-hover:scale-110 ${getEmotionColor(globalResult.emotion).split(' ')[0]}`}></div>
                        
                        <div className="relative z-10 flex flex-col items-center text-center">
                           <h3 className="text-[9px] font-black text-white/40 uppercase tracking-[0.5em] mb-4">Dominant Resonance</h3>
                           
                           <div className="space-y-2 mb-6">
                              <h2 className="text-4xl md:text-5xl font-black font-syne text-white tracking-tighter uppercase leading-none drop-shadow-2xl italic">
                                 {globalResult.emotion}
                              </h2>
                              <div className="flex items-center justify-center gap-3">
                                 <div className={`h-1 w-8 rounded-full ${getEmotionColor(globalResult.emotion).split(' ')[0]}`}></div>
                                 <span className="text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Neural Lock</span>
                                 <div className={`h-1 w-8 rounded-full ${getEmotionColor(globalResult.emotion).split(' ')[0]}`}></div>
                              </div>
                           </div>

                           <div className="flex flex-col items-center">
                              <div className="text-5xl md:text-6xl font-black font-syne text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20 tracking-tighter leading-snug mb-1 pt-2">
                                 {((globalResult.confidence || 0) * 100).toFixed(1)}%
                              </div>
                              <span className={`font-bold uppercase tracking-[0.3em] text-[10px] ${getEmotionColor(globalResult.emotion).includes('yellow') || getEmotionColor(globalResult.emotion).includes('amber') ? 'text-amber-400' : getEmotionColor(globalResult.emotion).includes('cyan') ? 'text-cyan-400' : getEmotionColor(globalResult.emotion).includes('rose') ? 'text-rose-400' : 'text-white/40'}`}>Confidence Score</span>
                           </div>
                        </div>
                     </div>
                    
                    <div className="space-y-10 flex-1">
                       <div>
                          <div className="flex items-center gap-4 mb-8">
                             <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Intensity Distribution</h3>
                             <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>

                             <button 
                                onClick={() => { setViewState('idle'); setGlobalResult(null); setFeedbackStatus(null); setImageURL(null); setFile(null); }}
                                className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center gap-2"
                             >
                                <Zap size={14} /> Retry
                             </button>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 md:gap-x-16 gap-y-6 md:gap-y-10">
                              {Object.entries(globalResult.breakdown || {}).sort((a,b)=>b[1]-a[1]).map(([emo, val]) => (
                                 <div key={emo} className="flex flex-col gap-3 group">
                                    <div className="flex justify-between items-end px-1">
                                        <span className="text-zinc-400 font-black font-syne uppercase tracking-[0.2em] text-[11px] group-hover:text-white transition-all">{emo}</span>
                                        <span className="text-zinc-500 font-bold text-[10px]">{(val * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full bg-white/[0.03] rounded-full h-3 overflow-hidden p-[2px] border border-white/5 shadow-inner">
                                        <div 
                                          className={`h-full rounded-full transition-all duration-[2.2s] ease-out shadow-[0_0_20px_rgba(0,0,0,0.5)] ${getEmotionColor(emo).split(' ')[0]}`}
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
                    <div className="mt-12 p-8 rounded-3xl bg-white/[0.04] border border-white/5 flex flex-col items-center gap-8 shadow-inner w-full">
                      {feedbackStatus === 'submitted' ? (
                        <div className="flex flex-col items-center gap-6 w-full fade-in">
                           <div className="flex items-center gap-4 text-emerald-400 font-syne font-bold uppercase tracking-[0.2em] text-xs">
                              <ScanFace size={20} className="animate-pulse" />
                              Visual Matrix Adjusted. Thank you.
                           </div>
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
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 w-full text-center sm:text-left">
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
              className="px-10 py-5 rounded-2xl flex items-center gap-4 tracking-[0.2em] font-extrabold font-syne uppercase transition-all bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/20 hover:shadow-[0_0_40px_rgba(252,238,10,0.4)] active:scale-95"
           >
              <StopCircle size={24} /> Terminate stream
           </button>
        </div>
      )}

    </div>
  );
}
