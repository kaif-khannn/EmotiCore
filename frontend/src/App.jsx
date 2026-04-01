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
    <div className="relative w-full min-h-screen bg-[#050505] text-white overflow-x-hidden flex flex-col font-jakarta">
      {/* Background blobs (Obsidian aesthetic) */}
      <div className="bg-blob blob-1 fixed opacity-20"></div>
      <div className="bg-blob blob-2 fixed opacity-20"></div>

      {/* Top Logo Navbar - Fixed for Scroll Integrity */}
      <header className="fixed top-0 left-0 w-full px-8 py-6 z-30 flex justify-between items-center bg-gradient-to-b from-[#050505] via-[#050505]/95 to-transparent backdrop-blur-sm border-b border-white/[0.02]">
         <div className="flex justify-between items-center w-full max-w-7xl mx-auto pointer-events-none">
            <button onClick={() => handleModuleLoad('home')} className="flex items-center gap-3 hover:opacity-80 transition-opacity pointer-events-auto">
               <svg width="0" height="0">
                  <linearGradient id="gradientBrainSidebar" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop stopColor="var(--accent-primary)" offset="0%" />
                    <stop stopColor="var(--accent-secondary)" offset="100%" />
                  </linearGradient>
                </svg>
                <Brain size={36} className="text-transparent drop-shadow-md" style={{ stroke: 'url(#gradientBrainSidebar)' }} />
                <div className="text-left hidden sm:block">
                   <h1 className="text-2xl font-extrabold font-syne tracking-tighter leading-none">EMOTICORE</h1>
                   <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] mt-1 font-bold">Multi-Modal AI</p>
                </div>
            </button>
            
            {activeModule !== 'home' && (
                <button onClick={() => handleModuleLoad('home')} className="obsidian-panel px-6 py-3 text-sm flex items-center gap-2 hover:bg-white/5 transition-all font-syne font-bold rounded-full pointer-events-auto border-t-white/10 shadow-2xl">
                    <ChevronLeft size={18} /> BACK TO PERCEPTION
                </button>
            )}
         </div>
      </header>

      {/* Main Content Dashboard Context */}
      <main className="flex-1 w-full h-full pt-32 px-4 md:px-12 pb-24 z-10 flex flex-col items-center relative min-h-screen">
          
          {/* Default Home Module View */}
          {activeModule === 'home' && !isLoading && (
               <div className="w-full max-w-6xl flex flex-col items-center justify-center mt-12 md:mt-24 fade-in-up">
                   <h2 className="text-5xl md:text-7xl font-syne font-extrabold mb-16 text-center tracking-tight">Select Perception <span className="gradient-text">Module</span></h2>
                   
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl mx-auto">
                       {/* Text Card */}
                       <div onClick={() => handleModuleLoad('text')} className="obsidian-card p-10 flex flex-col items-center justify-center text-center gap-8 cursor-pointer group hover:scale-[1.02] transition-all min-h-[260px] border-l-4 border-l-cyan-500/50">
                          <div className="w-20 h-20 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-400 group-hover:text-black transition-all shadow-[0_0_20px_rgba(0,243,255,0.2)]">
                              <MessageSquare size={40} />
                          </div>
                          <h3 className="text-2xl font-syne font-bold tracking-tight text-white">Semantic Text</h3>
                       </div>
                       {/* Voice Card */}
                       <div onClick={() => handleModuleLoad('audio')} className="obsidian-card p-10 flex flex-col items-center justify-center text-center gap-8 cursor-pointer group hover:scale-[1.02] transition-all min-h-[260px] border-l-4 border-l-rose-500/50" style={{ animationDelay: '0.1s' }}>
                          <div className="w-20 h-20 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400 group-hover:bg-rose-400 group-hover:text-black transition-all shadow-[0_0_20px_rgba(255,0,85,0.2)]">
                              <Mic size={40} />
                          </div>
                          <h3 className="text-2xl font-syne font-bold tracking-tight text-white">Vocal Prosody</h3>
                       </div>
                       {/* Face Card */}
                       <div onClick={() => handleModuleLoad('image')} className="obsidian-card p-10 flex flex-col items-center justify-center text-center gap-8 cursor-pointer group hover:scale-[1.02] transition-all min-h-[260px] border-l-4 border-l-amber-500/50" style={{ animationDelay: '0.2s' }}>
                          <div className="w-20 h-20 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-400 group-hover:text-black transition-all shadow-[0_0_20px_rgba(252,238,10,0.2)]">
                              <Camera size={40} />
                          </div>
                          <h3 className="text-2xl font-syne font-bold tracking-tight text-white">Facial Optics</h3>
                       </div>
                   </div>

                   <p className="mt-20 text-zinc-500 text-sm md:text-base uppercase tracking-[0.3em] font-bold text-center max-w-2xl">
                       Decoding multi-modal human intent in real-time.
                   </p>
               </div>
          )}
          
          {/* Loading Transition Overlay */}
          {isLoading && (
               <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#050505]/80 backdrop-blur-md fade-in">
                   <div className="w-16 h-16 border-4 border-white/5 border-t-cyan-400 rounded-full animate-spin shadow-[0_0_20px_rgba(0,243,255,0.3)]"></div>
                   <p className="mt-8 text-white font-syne tracking-[0.3em] font-bold text-xs uppercase animate-pulse">Initializing Neural Core...</p>
               </div>
          )}

          {/* Module Injection Frame */}
          {!isLoading && activeModule === 'text' && <div className="w-full fade-in-up max-w-5xl"><TextEmotion /></div>}
          {!isLoading && activeModule === 'audio' && <div className="w-full fade-in-up max-w-5xl"><AudioEmotion /></div>}
          {!isLoading && activeModule === 'image' && <div className="w-full fade-in-up max-w-5xl"><ImageEmotion /></div>}
          {!isLoading && activeModule === 'analytics' && <div className="w-full fade-in-up max-w-6xl"><Dashboard /></div>}
          {!isLoading && activeModule === 'status' && (
               <div className="w-full max-w-6xl fade-in-up flex flex-col gap-10 mt-12">
                   <h2 className="text-5xl md:text-7xl font-syne font-extrabold mb-4 tracking-tight">Core <span className="text-emerald-400">Status</span></h2>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                       {/* Status Cards */}
                       <div className="obsidian-card p-10 flex flex-col gap-8 hover:bg-white/5 transition-all border-l-4 border-l-cyan-500/50">
                           <div className="flex justify-between items-start">
                               <div className="w-16 h-16 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400"><MessageSquare size={32}/></div>
                               <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full">
                                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34c759] animate-pulse"></div>
                                  <span className="text-emerald-400 text-[10px] uppercase tracking-widest font-bold">Active</span>
                               </div>
                           </div>
                           <div>
                             <span className="font-syne font-bold text-3xl text-white">DistilRoBERTa</span>
                             <p className="text-zinc-500 mt-4 leading-relaxed">Semantic text routing active. Pipeline latency <span className="text-cyan-400">14ms</span>.</p>
                           </div>
                       </div>
                       <div className="obsidian-card p-10 flex flex-col gap-8 hover:bg-white/5 transition-all border-l-4 border-l-rose-500/50" style={{animationDelay: '0.1s'}}>
                           <div className="flex justify-between items-start">
                               <div className="w-16 h-16 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400"><Mic size={32}/></div>
                               <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full">
                                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34c759] animate-pulse"></div>
                                  <span className="text-emerald-400 text-[10px] uppercase tracking-widest font-bold">Active</span>
                               </div>
                           </div>
                           <div>
                             <span className="font-syne font-bold text-3xl text-white">HuBERT Core</span>
                             <p className="text-zinc-500 mt-4 leading-relaxed">Acoustic extraction active. VAD filtering engaged.</p>
                           </div>
                       </div>
                       <div className="obsidian-card p-10 flex flex-col gap-8 hover:bg-white/5 transition-all border-l-4 border-l-amber-500/50" style={{animationDelay: '0.2s'}}>
                           <div className="flex justify-between items-start">
                               <div className="w-16 h-16 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400"><Camera size={32}/></div>
                               <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full">
                                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34c759] animate-pulse"></div>
                                  <span className="text-emerald-400 text-[10px] uppercase tracking-widest font-bold">Active</span>
                               </div>
                           </div>
                           <div>
                             <span className="font-syne font-bold text-3xl text-white">DeepFace V2</span>
                             <p className="text-zinc-500 mt-4 leading-relaxed">Topography mapping online. Frame rate <span className="text-amber-400">30fps</span>.</p>
                           </div>
                       </div>
                   </div>
               </div>
          )}
      </main>

      {/* Primary Floating Action Button */}
      <button 
         onClick={() => setSidebarOpen(true)}
         className="fixed bottom-10 left-10 z-20 w-16 h-16 rounded-2xl obsidian-panel flex items-center justify-center text-white hover:bg-white/5 transition-all hover:scale-105 shadow-2xl border-t-white/10 group"
      >
         <Menu size={28} className="group-hover:text-cyan-400 transition-colors" />
      </button>

      {/* Navigation Sidebar */}
      <div className={`fixed top-0 left-0 w-full sm:w-[380px] h-full z-50 transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="w-full h-full obsidian-panel border-l-0 rounded-l-none flex flex-col bg-[#0a0a0a]/95 shadow-[30px_0_60px_rgba(0,0,0,0.8)] overflow-hidden">
               <header className="px-8 pt-10 pb-6 flex justify-between items-center border-b border-white/5">
                   <h2 className="font-extrabold font-syne text-2xl text-white tracking-widest">SYSTEM</h2>
                   <button onClick={() => setSidebarOpen(false)} className="text-zinc-500 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all">
                       <X size={24} />
                   </button>
               </header>
               
               <div className="p-8 flex-1 overflow-y-auto flex flex-col gap-6">
                   <button 
                      onClick={() => handleModuleLoad('analytics')} 
                      className="obsidian-card p-8 flex items-center justify-between w-full hover:bg-white/5 transition-all group border-transparent hover:border-cyan-500/30"
                   >
                      <div className="flex items-center gap-5">
                        <LayoutDashboard className="text-zinc-500 group-hover:text-cyan-400 transition-colors" size={32}/> 
                        <span className="font-bold text-xl text-zinc-300 group-hover:text-white transition-colors">Analytics</span>
                      </div>
                   </button>
                   <button 
                      onClick={() => handleModuleLoad('status')} 
                      className="obsidian-card p-8 flex items-center justify-between w-full hover:bg-white/5 transition-all group border-transparent hover:border-cyan-500/30"
                   >
                      <div className="flex items-center gap-5">
                        <Settings className="text-zinc-500 group-hover:text-cyan-400 transition-colors" size={32}/> 
                        <span className="font-bold text-xl text-zinc-300 group-hover:text-white transition-colors">Core Status</span>
                      </div>
                   </button>

                   <div className="mt-auto">
                       <button 
                          onClick={() => { setHasStarted(false); setSidebarOpen(false); setActiveModule('home'); }} 
                          className="obsidian-card p-8 flex items-center justify-between w-full hover:bg-rose-500/10 transition-all group border-transparent hover:border-rose-500/30"
                       >
                          <div className="flex items-center gap-5">
                            <Home className="text-zinc-500 group-hover:text-rose-400 transition-colors" size={32}/> 
                            <span className="font-bold text-xl text-zinc-300 group-hover:text-white transition-colors">Terminate Session</span>
                          </div>
                       </button>
                   </div>
               </div>
          </div>
      </div>
      
      {/* Backdrop overlay */}
      {sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-[#000000]/80 backdrop-blur-md z-40 fade-in cursor-pointer"></div>
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
    fontFamily: 'Plus Jakarta Sans, sans-serif'
  }
};

export default App;
