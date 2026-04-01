import React, { useState } from 'react';
import { Brain, MessageSquare, Mic, Camera, LayoutDashboard, Settings, Code, Menu, X, ChevronLeft, Home } from 'lucide-react';
import './index.css';

// Components (We will implement these next)
import Dashboard from './components/Dashboard';
import TextEmotion from './components/TextEmotion';
import AudioEmotion from './components/AudioEmotion';
import ImageEmotion from './components/ImageEmotion';
import LandingPage from './components/LandingPage';

function App() {
  const [activeModule, setActiveModule] = useState('home');
  const [hasStarted, setHasStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('analytics');

  if (!hasStarted) {
    return (
      <div className="w-full relative">
         {/* Background decoration preserved */}
         <div className="bg-blob blob-1 fixed"></div>
         <div className="bg-blob blob-2 fixed"></div>
         <div className="bg-blob fixed top-1/3 left-1/4 w-[700px] h-[700px] bg-yellow-500/20 blur-[120px] rounded-full -z-10 mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }}></div>
         
         <LandingPage onGetStarted={() => setHasStarted(true)} />
      </div>
    );
  }

  const handleModuleLoad = (mod) => {
      setIsLoading(true);
      // Clean up UI instantly and visually sync loading
      setSidebarOpen(false);
      setTimeout(() => {
          setActiveModule(mod);
          setIsLoading(false);
      }, 500);
  };

  return (
    <div className="relative w-full min-h-screen bg-[#111111] text-white overflow-x-hidden flex flex-col font-outfit">
      {/* Background blobs (iOS aesthetic) */}
      <div className="bg-blob blob-1 fixed"></div>
      <div className="bg-blob blob-2 fixed"></div>

      {/* Top Logo Navbar */}
      <header className="fixed top-0 left-0 w-full px-8 py-6 z-30 flex justify-between items-center pointer-events-none">
         <button onClick={() => handleModuleLoad('home')} className="flex items-center gap-3 hover:opacity-80 transition-opacity pointer-events-auto">
            <svg width="0" height="0">
               <linearGradient id="gradientBrainSidebar" x1="0%" y1="0%" x2="100%" y2="100%">
                 <stop stopColor="#30B5FF" offset="0%" />
                 <stop stopColor="#9C27B0" offset="100%" />
               </linearGradient>
             </svg>
             <Brain size={36} className="text-transparent drop-shadow-md" style={{ stroke: 'url(#gradientBrainSidebar)' }} />
             <div className="text-left hidden sm:block">
                <h1 className="text-2xl font-bold font-outfit tracking-widest leading-none">EMOTICORE</h1>
                <p className="text-[10px] text-[#8e8e93] uppercase tracking-[0.15em] mt-1 font-bold">Multi-Modal AI</p>
             </div>
         </button>
         
         {activeModule !== 'home' && (
             <button onClick={() => handleModuleLoad('home')} className="glass-panel px-6 py-3 text-sm flex items-center gap-2 hover:bg-white/10 transition-all font-outfit font-bold rounded-full pointer-events-auto shadow-[0_4px_15px_rgba(0,0,0,0.5)]">
                 <ChevronLeft size={18} /> BACK TO MODULES
             </button>
         )}
      </header>

      {/* Main Content Dashboard Context */}
      <main className="flex-1 w-full h-full pt-32 px-4 md:px-12 pb-24 z-10 flex flex-col items-center relative min-h-screen">
          
          {/* Default Home Module View */}
          {activeModule === 'home' && !isLoading && (
               <div className="w-full max-w-6xl flex flex-col items-center justify-center mt-12 md:mt-24 fade-in-up">
                   <h2 className="text-4xl md:text-5xl font-black mb-16 text-center tracking-wide">Select Perception <span className="text-[#ff9500]">Module</span></h2>
                   
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mx-auto">
                       {/* Text Card */}
                       <div onClick={() => handleModuleLoad('text')} className="glass-card p-8 flex flex-col items-center justify-center text-center gap-6 cursor-pointer group hover:scale-[1.05] transition-transform min-h-[220px]">
                          <div className="w-20 h-20 rounded-[1.5rem] bg-indigo-500/10 border border-indigo-400/30 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-400 group-hover:!text-black transition-all shadow-[0_0_20px_rgba(0,0,0,0.2)]">
                              <MessageSquare size={36} />
                          </div>
                          <h3 className="text-xl font-bold tracking-wide text-white">Semantic Text</h3>
                       </div>
                       {/* Voice Card */}
                       <div onClick={() => handleModuleLoad('audio')} className="glass-card p-8 flex flex-col items-center justify-center text-center gap-6 cursor-pointer group hover:scale-[1.05] transition-transform min-h-[220px]" style={{ animationDelay: '0.1s' }}>
                          <div className="w-20 h-20 rounded-[1.5rem] bg-pink-500/10 border border-pink-400/30 flex items-center justify-center text-pink-400 group-hover:bg-pink-400 group-hover:!text-black transition-all shadow-[0_0_20px_rgba(0,0,0,0.2)]">
                              <Mic size={36} />
                          </div>
                          <h3 className="text-xl font-bold tracking-wide text-white">Vocal Prosody</h3>
                       </div>
                       {/* Face Card */}
                       <div onClick={() => handleModuleLoad('image')} className="glass-card p-8 flex flex-col items-center justify-center text-center gap-6 cursor-pointer group hover:scale-[1.05] transition-transform min-h-[220px]" style={{ animationDelay: '0.2s' }}>
                          <div className="w-20 h-20 rounded-[1.5rem] bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-400 group-hover:bg-amber-400 group-hover:!text-black transition-all shadow-[0_0_20px_rgba(0,0,0,0.2)]">
                              <Camera size={36} />
                          </div>
                          <h3 className="text-xl font-bold tracking-wide text-white">Facial Optics</h3>
                       </div>
                   </div>

                   <p className="mt-16 text-[#8e8e93] text-sm md:text-base uppercase tracking-[0.2em] font-bold font-inter text-center max-w-2xl">
                       Your words. Your tone. Your face. All decoded instantly.
                   </p>
               </div>
          )}
          
          {/* Loading Transition Overlay */}
          {isLoading && (
               <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#111111]/60 backdrop-blur-sm fade-in drop-shadow-2xl">
                   <div className="w-16 h-16 border-4 border-white/10 border-t-white rounded-full animate-spin shadow-[0_0_20px_rgba(255,255,255,0.4)]"></div>
                   <p className="mt-8 text-white font-outfit tracking-[0.2em] font-bold text-sm uppercase animate-pulse">Initializing Core Memory...</p>
               </div>
          )}

          {/* Module Injection Frame */}
          {!isLoading && activeModule === 'text' && <div className="w-full fade-in-up max-w-5xl"><TextEmotion /></div>}
          {!isLoading && activeModule === 'audio' && <div className="w-full fade-in-up max-w-5xl"><AudioEmotion /></div>}
          {!isLoading && activeModule === 'image' && <div className="w-full fade-in-up max-w-5xl"><ImageEmotion /></div>}
          {!isLoading && activeModule === 'analytics' && <div className="w-full fade-in-up max-w-6xl"><Dashboard /></div>}
          {!isLoading && activeModule === 'status' && (
              <div className="w-full max-w-5xl fade-in-up flex flex-col gap-10 mt-12">
                  <h2 className="text-4xl md:text-5xl font-black font-outfit mb-4">Core Model <span className="text-[#34c759]">Status</span></h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {/* Status Cards */}
                      <div className="glass-card p-10 flex flex-col gap-6 cursor-crosshair hover:bg-white/5 transition-all">
                          <div className="flex justify-between items-start">
                              <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400"><MessageSquare size={32}/></div>
                              <span className="text-[#34c759] text-xs uppercase tracking-widest font-bold flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#34c759] shadow-[0_0_8px_#34c759] animate-pulse"></div> Online</span>
                          </div>
                          <div>
                            <span className="font-bold text-2xl text-white">DistilRoBERTa</span>
                            <p className="text-sm text-[#8e8e93] mt-2 font-inter leading-relaxed">Semantic text routing active. PyTorch underlying memory balanced.</p>
                          </div>
                      </div>
                      <div className="glass-card p-10 flex flex-col gap-6 cursor-crosshair hover:bg-white/5 transition-all" style={{animationDelay: '0.1s'}}>
                          <div className="flex justify-between items-start">
                              <div className="w-16 h-16 rounded-2xl bg-pink-500/20 border border-pink-400/30 flex items-center justify-center text-pink-400"><Mic size={32}/></div>
                              <span className="text-[#34c759] text-xs uppercase tracking-widest font-bold flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#34c759] shadow-[0_0_8px_#34c759] animate-pulse"></div> Online</span>
                          </div>
                          <div>
                            <span className="font-bold text-2xl text-white">HuBERT Audio Map</span>
                            <p className="text-sm text-[#8e8e93] mt-2 font-inter leading-relaxed">Librosa extraction pipeline fully initialized bounding on socket 8000.</p>
                          </div>
                      </div>
                      <div className="glass-card p-10 flex flex-col gap-6 cursor-crosshair hover:bg-white/5 transition-all" style={{animationDelay: '0.2s'}}>
                          <div className="flex justify-between items-start">
                              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400"><Camera size={32}/></div>
                              <span className="text-[#34c759] text-xs uppercase tracking-widest font-bold flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#34c759] shadow-[0_0_8px_#34c759] animate-pulse"></div> Online</span>
                          </div>
                          <div>
                            <span className="font-bold text-2xl text-white">DeepFace Engine</span>
                            <p className="text-sm text-[#8e8e93] mt-2 font-inter leading-relaxed">TensorFlow bindings successfully verified. Local Webcam socket bound.</p>
                          </div>
                      </div>
                  </div>
              </div>
          )}
      </main>

      {/* Primary Floating Action Button (Hamburger) */}
      <button 
         onClick={() => setSidebarOpen(true)}
         className="fixed bottom-10 left-10 z-20 w-16 h-16 rounded-full glass-panel flex items-center justify-center text-white hover:bg-white/10 transition-all hover:scale-110 shadow-[0_15px_40px_rgba(0,0,0,0.8)] border border-white/20"
      >
         <Menu size={28} />
      </button>

      {/* Sliding Modals Backend (Navigation Sidebar) */}
      <div className={`fixed top-0 left-0 w-full sm:w-[380px] h-full z-50 transform transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="w-full h-full glass-panel border-l-0 rounded-l-none flex flex-col bg-[#111111]/95 shadow-[20px_0_50px_rgba(0,0,0,0.9)] overflow-hidden">
              <header className="px-8 pt-10 pb-6 flex justify-between items-center border-b border-white/5 bg-black/10">
                  <h2 className="font-black font-outfit text-2xl text-white tracking-widest">MENU</h2>
                  <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all bg-white/5">
                      <X size={24} />
                  </button>
              </header>
              
              <div className="p-6 md:p-8 flex-1 overflow-y-auto font-inter flex flex-col gap-6">
                  <button 
                     onClick={() => handleModuleLoad('analytics')} 
                     className="glass-card p-8 flex items-center justify-between w-full hover:bg-white/10 transition-all group border-transparent hover:border-white/10 shadow-none hover:shadow-[0_10px_30px_rgba(255,149,0,0.2)]"
                  >
                     <div className="flex items-center gap-5">
                       <LayoutDashboard className="text-slate-400 group-hover:text-[#ff9500] transition-colors" size={32}/> 
                       <span className="font-bold text-xl text-slate-200 group-hover:text-white transition-colors">Analytics</span>
                     </div>
                  </button>
                  <button 
                     onClick={() => handleModuleLoad('status')} 
                     className="glass-card p-8 flex items-center justify-between w-full hover:bg-white/10 transition-all group border-transparent hover:border-white/10 shadow-none hover:shadow-[0_10px_30px_rgba(255,149,0,0.2)]"
                  >
                     <div className="flex items-center gap-5">
                       <Settings className="text-slate-400 group-hover:text-[#ff9500] transition-colors" size={32}/> 
                       <span className="font-bold text-xl text-slate-200 group-hover:text-white transition-colors">Model Status</span>
                     </div>
                  </button>

                  <div className="mt-auto pt-10">
                      <button 
                         onClick={() => { setHasStarted(false); setSidebarOpen(false); setActiveModule('home'); }} 
                         className="glass-card p-8 flex items-center justify-between w-full hover:bg-white/10 transition-all group border-transparent hover:border-pink-500/30 shadow-none hover:shadow-[0_10px_30px_rgba(255,59,48,0.2)]"
                      >
                         <div className="flex items-center gap-5">
                           <Home className="text-slate-400 group-hover:text-pink-400 transition-colors" size={32}/> 
                           <span className="font-bold text-xl text-slate-200 group-hover:text-white transition-colors">Exit Dashboard</span>
                         </div>
                      </button>
                  </div>
              </div>
          </div>
      </div>
      
      {/* Backdrop overlay for Sidebar */}
      {sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-[#000000]/70 backdrop-blur-sm z-40 fade-in cursor-pointer"></div>
      )}
    </div>
  );
}

const styles = {
  navBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid transparent',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    fontFamily: 'Inter, sans-serif'
  }
};

export default App;
