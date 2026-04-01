import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { Camera, StopCircle, ScanFace, Activity, Upload, Image as ImageIcon, Zap, ArrowLeft } from 'lucide-react';

export default function ImageEmotion() {
  const [viewState, setViewState] = useState('idle'); // 'idle', 'live', 'preview', 'processing', 'result'
  const [faces, setFaces] = useState([]); 
  const [imageURL, setImageURL] = useState(null);
  const [file, setFile] = useState(null);
  const [globalResult, setGlobalResult] = useState(null);
  
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

      analyzeInterval.current = setInterval(captureAndAnalyzeLive, 2000);
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

  const captureAndAnalyzeLive = async () => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) return;
    const video = videoRef.current;
    if (video.readyState !== 4) return; 

    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const formData = new FormData();
      formData.append('file', blob, 'frame.jpg');

      try {
        const response = await axios.post('http://localhost:8000/api/predict/image', formData, {
           headers: { 'Content-Type': 'multipart/form-data' }
        });
        const data = response.data;
        if (data.error) throw new Error(data.error);
        
        let detectedFaces = [];
        if (data.faces && Array.isArray(data.faces)) detectedFaces = data.faces; 
        else if (data.emotion) {
           detectedFaces = [{
              emotion: data.emotion,
              confidence: data.confidence || 0.9,
              region: data.region || { x: canvas.width * 0.25, y: canvas.height * 0.2, w: canvas.width * 0.5, h: canvas.height * 0.6 }
           }];
        }
        setFaces(detectedFaces);
      } catch (err) {
        console.error("Backend Error:", err);
        setFaces([]);
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

      const response = await axios.post('http://localhost:8000/api/predict/image', formData, {
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
    if (raw.includes('surpris')) return { borderColor: 'var(--accent-primary)', bg: 'var(--accent-primary)', text: '#000000', label: emotion }; 
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

      <div className="relative w-full rounded-[3rem] shadow-[0_45px_100px_rgba(0,0,0,0.95)] transition-all duration-700 bg-[#050505] border-t border-white/10 flex flex-col justify-center items-center overflow-hidden">
          
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
               
               <h3 className="text-sm font-bold font-syne uppercase tracking-[0.4em] text-zinc-500 mb-8 px-1">Optical Initialization Required</h3>
               
               <div className="flex flex-col sm:flex-row items-center justify-center gap-8 w-full max-w-2xl px-6">
                 <button 
                    onClick={startCamera}
                    className="group w-full sm:w-auto px-12 py-6 rounded-2xl flex items-center justify-center gap-5 tracking-[0.2em] font-extrabold font-syne uppercase transition-all shadow-2xl bg-white text-black hover:bg-amber-400 hover:shadow-[0_0_40px_rgba(252,238,10,0.4)] active:scale-95"
                 >
                    <Activity size={24} /> Live stream
                 </button>

                 <div className="flex items-center gap-4 opacity-30">
                    <div className="w-8 h-px bg-zinc-700"></div>
                    <span className="text-[10px] font-bold text-zinc-600 tracking-widest uppercase">OR</span>
                    <div className="w-8 h-px bg-zinc-700"></div>
                 </div>

                 <label className="group/btn w-full sm:w-auto px-12 py-6 rounded-2xl flex items-center justify-center gap-5 tracking-[0.2em] font-extrabold font-syne uppercase transition-all bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer shadow-2xl active:scale-95">
                    <Upload size={24} className="group-hover/btn:text-white transition-colors" /> Import
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                 </label>
               </div>
            </div>
          )}

          {/* Photo Preview Mode */}
          {viewState === 'preview' && imageURL && (
            <div className="relative z-20 flex flex-col items-center justify-center p-10 md:p-16 w-full h-full fade-in flex-1 font-jakarta">
               <h3 className="text-[10px] font-bold font-syne uppercase tracking-[0.4em] text-zinc-500 mb-8 w-full text-left">Static Image Import</h3>
               
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
                    className="px-12 py-5 rounded-2xl flex items-center gap-4 tracking-[0.2em] font-extrabold font-syne uppercase transition-all bg-white text-black hover:bg-amber-400 hover:shadow-[0_0_30px_rgba(252,238,10,0.4)] hover:scale-[1.02] shadow-2xl"
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
                  <p className="tracking-[0.4em] text-white font-extrabold font-syne text-2xl uppercase italic">
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
                          <h2 className="text-7xl md:text-8xl font-extrabold font-syne text-white tracking-tighter uppercase leading-none">{globalResult.emotion}</h2>
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

                   <div className="mt-16 pt-10 border-t border-white/5 flex justify-start">
                      <button 
                         onClick={() => { setViewState('idle'); setGlobalResult(null); setImageURL(null); setFile(null); }} 
                         className="group flex items-center gap-5 text-white hover:text-amber-400 transition-all font-syne font-bold tracking-[0.2em] uppercase text-xs"
                      >
                         <div className="p-2 rounded-xl bg-white/5 group-hover:bg-amber-400 group-hover:text-black transition-all">
                            <ArrowLeft size={16} />
                         </div>
                         Initialize New stream
                      </button>
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
          {viewState === 'live' && faces.length > 0 && videoRef.current && (
             <div className="absolute inset-0 z-20 pointer-events-none fade-in">
                {faces.map((face, idx) => {
                   const styleDef = getEmotionStyling(face.emotion);
                   const videoWidth = videoRef.current.videoWidth || 640;
                   const videoHeight = videoRef.current.videoHeight || 480;
                   const left = (face.region.x / videoWidth) * 100;
                   const top = (face.region.y / videoHeight) * 100;
                   const width = (face.region.w / videoWidth) * 100;
                   const height = (face.region.h / videoHeight) * 100;

                   return (
                      <div 
                         key={idx} 
                         className="absolute border-[3px] rounded-2xl transition-all duration-500 ease-out shadow-[0_0_30px_rgba(0,0,0,0.6)]"
                         style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%`, borderColor: styleDef.borderColor }}
                      >
                         <div 
                            className="absolute -top-[20px] left-0 md:-left-[3px] px-3 py-1.5 rounded-t-xl flex items-center font-bold tracking-widest text-[10px] uppercase shadow-[0_4px_10px_rgba(0,0,0,0.5)] transition-colors overflow-hidden whitespace-nowrap"
                            style={{ backgroundColor: styleDef.bg, color: styleDef.text }}
                         >
                            {styleDef.label} • Face {idx + 1}
                         </div>
                      </div>
                   );
                })}
             </div>
          )}
          {viewState === 'live' && (
            <div className="absolute inset-0 z-30 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100%_4px] opacity-20 Mix-blend-overlay"></div>
          )}
          {viewState === 'live' && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 bg-black/60 backdrop-blur-xl border border-white/10 px-6 py-2 rounded-full flex items-center gap-3 drop-shadow-xl fade-in">
               <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_#34c759]"></div>
               <span className="text-white font-bold text-xs uppercase tracking-[0.2em] whitespace-nowrap">{faces.length > 0 ? 'Emotions Detected' : 'Analyzing Feed...'}</span>
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
