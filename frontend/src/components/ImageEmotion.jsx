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
    if (raw.includes('happ') || raw.includes('joy') || raw.includes('excit')) return { borderColor: '#ccff00', bg: '#ccff00', text: '#000000', label: emotion }; 
    if (raw.includes('sad')) return { borderColor: '#30B5FF', bg: '#30B5FF', text: '#ffffff', label: emotion }; 
    if (raw.includes('angr') || raw.includes('furious')) return { borderColor: '#ff0055', bg: '#ff0055', text: '#ffffff', label: emotion }; 
    if (raw.includes('fear') || raw.includes('scare')) return { borderColor: '#9C27B0', bg: '#9C27B0', text: '#ffffff', label: emotion }; 
    if (raw.includes('surpris')) return { borderColor: '#00ffff', bg: '#00ffff', text: '#000000', label: emotion }; 
    return { borderColor: '#ffffff', bg: '#ffffff', text: '#000000', label: emotion || 'Neutral' };
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pt-4">
      <div className="flex items-center gap-4 mb-4 fade-in">
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.5)]">
          <Camera className="text-amber-400" size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-black font-outfit text-white tracking-wide">Real-Time Facial Optics</h2>
          <p className="text-slate-400 text-sm font-bold tracking-widest uppercase mt-1">Live OpenCV DeepFace Matrix</p>
        </div>
      </div>

      <div className="relative w-full min-h-[550px] rounded-[3rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.95)] transition-all duration-500 bg-[#080808] border border-white/10 flex flex-col justify-center items-center">
          
          <canvas ref={canvasRef} className="hidden" />

          {/* Glowing Animated Border for Processing State */}
          {viewState === 'processing' && (
             <>
               <div className="absolute top-1/2 left-1/2 w-[200%] h-[200%] bg-[conic-gradient(transparent_0deg,transparent_270deg,#ffcc00_360deg)] animate-[spin_2s_linear_infinite] origin-center -translate-x-1/2 -translate-y-1/2 z-0"></div>
               <div className="absolute inset-[2px] bg-[#111111]/95 rounded-[3rem] z-10 backdrop-blur-3xl"></div>
             </>
          )}

          {/* Idle Screen UI - Dual Option (Live vs Upload) */}
          {viewState === 'idle' && (
            <div className="relative z-20 flex flex-col items-center justify-center p-8 fade-in w-full text-center">
               <div className="relative mb-10 w-full flex justify-center">
                  <div className="absolute inset-0 bg-amber-500/10 blur-3xl rounded-full scale-150 animate-pulse"></div>
                  <ScanFace size={96} className="text-amber-400 drop-shadow-[0_0_20px_rgba(255,204,0,0.5)]" strokeWidth={1} />
               </div>
               
               <h3 className="text-3xl font-black font-outfit uppercase tracking-widest text-white mb-4">OPTICAL SENSOR SYSTEM</h3>
               <p className="text-[#8e8e93] text-sm font-bold tracking-[0.1em] mb-12 max-w-xl leading-relaxed">
                  ACTIVATE LIVE WEBCAM FOR REAL-TIME BOUNDING BOX OVERLAYS, OR UPLOAD A STATIC PICTURE FOR A PRECISE TENSOR EMOTION MAP.
               </p>

               <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full">
                 <button 
                    onClick={startCamera}
                    className="w-full sm:w-auto px-10 py-5 rounded-full flex items-center justify-center gap-4 tracking-widest font-black uppercase transition-all hover:scale-105 bg-amber-500 text-black shadow-[0_10px_40px_rgba(255,204,0,0.4)] hover:shadow-[0_15px_50px_rgba(255,204,0,0.6)]"
                 >
                    <Activity size={24} /> ACTIVATE LIVE CAMERA
                 </button>

                 <span className="text-white/20 font-black">OR</span>

                 <label className="w-full sm:w-auto px-10 py-5 rounded-full flex items-center justify-center gap-4 tracking-widest font-bold uppercase transition-all hover:scale-105 bg-white/5 hover:bg-white/10 text-white border border-white/10 cursor-pointer shadow-lg">
                    <Upload size={20} /> UPLOAD PICTURE
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                 </label>
               </div>
            </div>
          )}

          {/* Photo Preview Mode */}
          {viewState === 'preview' && imageURL && (
            <div className="relative z-20 flex flex-col items-center justify-center p-8 md:p-12 w-full h-full fade-in flex-1">
               <h3 className="text-2xl font-black font-outfit uppercase tracking-widest text-white mb-6 drop-shadow-lg w-full text-left">STATIC IMAGE SCANNED</h3>
               
               <div className="w-full flex-1 flex items-center justify-center p-4 bg-[#111111]/80 border border-white/5 rounded-2xl mb-6 relative overflow-hidden min-h-[300px]">
                  <img src={imageURL} alt="Upload" className="max-h-full max-w-full rounded-xl object-contain drop-shadow-2xl" />
               </div>
               
               <div className="flex justify-between items-center w-full">
                  <button 
                     onClick={() => { setImageURL(null); setFile(null); setViewState('idle'); }}
                     className="text-slate-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest"
                  >
                     Discard Photo
                  </button>
                  <button 
                    onClick={handleAnalyzePhoto}
                    className="px-8 py-5 rounded-full flex items-center gap-3 tracking-widest font-bold uppercase transition-all bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/40 border-t-amber-500/80 shadow-[0_10px_30px_rgba(255,204,0,0.3)] hover:shadow-[0_15px_40px_rgba(255,204,0,0.5)] hover:scale-105 text-white"
                  >
                     <Zap size={20} /> ANALYZE EMOTION
                  </button>
               </div>
            </div>
          )}

          {/* Processing Photo Overlay */}
          {viewState === 'processing' && (
            <div className="flex flex-col h-full fade-in flex-1 items-center justify-center gap-10 z-20 py-20">
               <div className="relative">
                  <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full scale-150 animate-pulse"></div>
                  <ScanFace size={100} className="text-amber-400 drop-shadow-[0_0_30px_rgba(255,204,0,0.8)] animate-[pulse_1s_linear_infinite]" strokeWidth={1} />
               </div>
               <p className="animate-pulse tracking-[0.3em] text-amber-500 font-black font-outfit text-xl uppercase drop-shadow-[0_0_10px_rgba(255,204,0,0.6)]">
                  Mapping Facial Topography...
               </p>
            </div>
          )}

          {viewState === 'result' && globalResult && (
            <div className="relative z-20 flex flex-col h-full fade-in flex-1 justify-between w-full p-8 md:p-12 min-h-[550px]">
               {globalResult.error ? (
                 <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
                    <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                       <Zap size={40} className="text-red-400" />
                    </div>
                    <h3 className="text-2xl font-black font-outfit text-red-400 uppercase tracking-widest">Analysis Failed</h3>
                    <p className="text-slate-400 max-w-md text-sm leading-relaxed">{globalResult.message}</p>
                 </div>
               ) : (
               <div>
                   <div className="flex justify-between items-start mb-10 border-b border-white/10 pb-8">
                      <div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Primary Micro-Expression</h3>
                        <div className="flex items-center gap-4">
                          <h2 className="text-6xl font-black font-outfit text-white drop-shadow-lg uppercase tracking-tight">{globalResult.emotion || 'Surprise'}</h2>
                        </div>
                      </div>
                      <div className="text-right">
                         <h3 className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Confidence Level</h3>
                         <p className="text-4xl font-black text-white">{((globalResult.confidence || 0) * 100).toFixed(1)}%</p>
                      </div>
                   </div>
                   
                   <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.1em] mb-4">Underlying Emotion Tensor Vector</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                       {Object.entries((globalResult.probabilities || globalResult.breakdown || {})).sort((a,b)=>b[1]-a[1]).map(([emo, val]) => {
                           const st = getEmotionStyling(emo);
                           return (
                             <div key={emo} className="flex flex-col gap-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-300 font-bold uppercase tracking-widest">{emo}</span>
                                    <span className="text-slate-400 font-bold">{(val * 100).toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-[#111111] rounded-full h-3 border border-white/5 shadow-inner overflow-hidden">
                                    <div 
                                      className="h-full rounded-full transition-all duration-1000 ease-out"
                                      style={{ width: `${val * 100}%`, backgroundColor: st.bg, boxShadow: `0 0 15px ${st.bg}` }}
                                    ></div>
                                </div>
                             </div>
                           );
                       })}
                   </div>
               </div>
               )}

               <div className="flex justify-start mt-12 bg-black/20 p-6 rounded-3xl border border-white/5 backdrop-blur-md">
                  <button 
                     onClick={() => { setViewState('idle'); setGlobalResult(null); setImageURL(null); setFile(null); }} 
                     className="flex items-center gap-3 text-amber-500 hover:text-white transition-colors font-bold tracking-widest uppercase text-sm"
                  >
                     <ArrowLeft size={18} /> Run New Visual Sequence
                  </button>
               </div>
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
        <div className="flex justify-center mt-2 fade-in relative z-50">
           <button 
              onClick={stopCamera}
              className="px-8 py-4 rounded-full flex items-center gap-3 tracking-widest font-bold uppercase transition-all bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/50 hover:shadow-[0_0_30px_rgba(255,0,0,0.5)]"
           >
              <StopCircle size={20} /> TERMINATE CAMERA
           </button>
        </div>
      )}

    </div>
  );
}
