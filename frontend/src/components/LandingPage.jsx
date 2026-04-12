import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Brain, ChevronRight, MessageSquare, Mic, Camera } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function InteractiveSphere({ scrollY }) {
  const pointsRef = useRef();
  const linesRef = useRef();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const { originalPositions, indices } = useMemo(() => {
    const pts = [];
    const idx = [];
    // Dynamically scale parameters based on mobile vs desktop to optimize rendering
    const isMobile = windowWidth < 768;
    const density = isMobile ? 400 : 1000; 
    const radius = isMobile ? 1.4 : 2.4; 
    
    // Golden spiral algorithm for perfectly even distributed sphere points
    for (let i = 0; i < density; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / density);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      pts.push(x, y, z);
    }
    
    // Nearest neighbor connecting lines
    for (let i = 0; i < density; i++) {
        let dists = [];
        for (let j = 0; j < density; j++) {
            if (i === j) continue;
            let d = Math.pow(pts[i*3]-pts[j*3], 2) + Math.pow(pts[i*3+1]-pts[j*3+1], 2) + Math.pow(pts[i*3+2]-pts[j*3+2], 2);
            dists.push({ j, d });
        }
        dists.sort((a,b) => a.d - b.d);
        // Connect each dot to 3 nearest
        dists.slice(0, 3).forEach(n => {
            if (i < n.j) idx.push(i, n.j);
        });
    }

    return { 
      originalPositions: new Float32Array(pts), 
      indices: new Uint16Array(idx) 
    };
  }, [windowWidth]);

  const dynamicPositions = useMemo(() => new Float32Array(originalPositions), [originalPositions]);
  const dummyVector = new THREE.Vector3();

  useFrame((state) => {
    // 1. Overall Sphere Rotation mapping to Scroll
    if (!pointsRef.current) return;
    const parentGroup = pointsRef.current.parent;
    parentGroup.rotation.y = (scrollY * 0.002) + state.clock.elapsedTime * 0.2;
    parentGroup.rotation.x = scrollY * 0.001;
    
    const scaleFactor = 1 + (scrollY * 0.002);
    parentGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);

    // 2. Mouse Repulsion Engine
    // Represent mouse on the near surface plane
    dummyVector.set(
        (state.pointer.x * state.viewport.width) / 2,
        (state.pointer.y * state.viewport.height) / 2,
        3.0 // Z distance constraint mimicking surface interaction
    );
    // Inverse Local Space conversion so the mouse tracks relative to the rotating dots
    dummyVector.applyEuler(new THREE.Euler(-parentGroup.rotation.x, -parentGroup.rotation.y, 0));

    let updated = false;
    for (let i = 0; i < originalPositions.length; i += 3) {
        let cx = dynamicPositions[i];
        let cy = dynamicPositions[i+1];
        let cz = dynamicPositions[i+2];

        let ox = originalPositions[i];
        let oy = originalPositions[i+1];
        let oz = originalPositions[i+2];

        // Calc distance from untransformed dot to local mouse
        let dx = cx - dummyVector.x;
        let dy = cy - dummyVector.y;
        let dz = cz - dummyVector.z;
        let dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        
        let force = 0;
        const radiusOfInteraction = windowWidth < 768 ? 0.8 : 1.5; 
        
        // Push outward if cursor enters sphere field
        if (state.pointer.x !== 0 && state.pointer.y !== 0 && dist < radiusOfInteraction) {
            force = (radiusOfInteraction - dist) * 0.3; // slightly stronger repulsive force
        }

        let targetX = ox + (dx * force);
        let targetY = oy + (dy * force);
        let targetZ = oz + (dz * force);

        // Linear interpolation back to original shape or towards force
        cx += (targetX - cx) * 0.15;
        cy += (targetY - cy) * 0.15;
        cz += (targetZ - cz) * 0.15;

        // Optimize updates
        if (Math.abs(cx - dynamicPositions[i]) > 0.001) updated = true;

        dynamicPositions[i] = cx;
        dynamicPositions[i+1] = cy;
        dynamicPositions[i+2] = cz;
    }

    // Flag react-three-fiber that geometry mutated
    if (updated) {
       pointsRef.current.geometry.attributes.position.needsUpdate = true;
       linesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group position={[0, -0.5, 0]}>
      <points ref={pointsRef}>
        <bufferGeometry key={`pts-${dynamicPositions.length}`}>
          <bufferAttribute attach="attributes-position" count={dynamicPositions.length / 3} array={dynamicPositions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.04} color="#00f3ff" transparent opacity={0.9} sizeAttenuation={true} />
      </points>
      <lineSegments ref={linesRef}>
        <bufferGeometry key={`lines-${dynamicPositions.length}`}>
          <bufferAttribute attach="attributes-position" count={dynamicPositions.length / 3} array={dynamicPositions} itemSize={3} />
          <bufferAttribute attach="index" count={indices.length} array={indices} itemSize={1} />
        </bufferGeometry>
        <lineBasicMaterial color="#ff0055" transparent opacity={0.15} />
      </lineSegments>
    </group>
  );
}

export default function LandingPage({ onGetStarted }) {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-[300vh] bg-transparent text-white relative overflow-x-hidden font-jakarta">
      
      {/* Three.js WebGL Interactive Sphere Context - Full Screen Background */}
      <div className="fixed inset-0 w-full h-full z-0 opacity-60">
          <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
             <ambientLight intensity={0.5} />
             <InteractiveSphere scrollY={scrollY} />
          </Canvas>
      </div>

      {/* Top Logo Navbar */}
      <nav className="fixed top-0 left-0 w-full p-4 md:p-8 z-50 flex items-center justify-between pointer-events-none">
         <div className="flex items-center gap-2 md:gap-4 pointer-events-auto">
            <div className="flex items-center gap-4">
              <svg width="0" height="0">
                <linearGradient id="gradientBrain" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop stopColor="var(--accent-primary)" offset="0%" />
                  <stop stopColor="var(--accent-secondary)" offset="100%" />
                </linearGradient>
              </svg>
              <Brain size={32} strokeWidth={1.5} className="text-transparent drop-shadow-md md:w-[44px] md:h-[44px]" style={{ stroke: 'url(#gradientBrain)' }} />
              <div className="ml-2">
                <h1 className="text-2xl md:text-4xl font-extrabold font-syne text-white tracking-tighter">
                  EMOTICORE
                </h1>
                <p className="text-[10px] md:text-[13px] text-zinc-500 font-semibold tracking-[0.2em] uppercase mt-1">Multi-Modal AI System</p>
              </div>
            </div>
         </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 pt-48 md:pt-64 pb-8 px-6 md:px-12 lg:px-24 min-h-[80vh] flex flex-col justify-center items-center text-center max-w-7xl mx-auto">
         <h1 className="text-5xl sm:text-7xl lg:text-[10rem] font-syne font-extrabold tracking-tighter leading-[0.85] text-white drop-shadow-2xl">
            DECODE <br/>
            <span className="gradient-text">EMOTION</span>
         </h1>
         <p className="mt-8 md:mt-12 text-base md:text-2xl text-zinc-400 max-w-3xl leading-relaxed font-jakarta">
            Beyond words. Beyond voice. Beyond expressions. <br/>
            The world's most advanced multi-modal emotion intelligence engine.
         </p>
         
         <div className="mt-16">
            <button onClick={onGetStarted} className="btn-primary px-12 py-5 text-xl group">
               Launch Intelligence <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
            </button>
         </div>
      </div>

      {/* Hero Description & Call to Action Card [Vertical Layout] */}
      <div className="relative z-20 px-4 md:px-12 lg:px-24 pb-20 md:pb-32 flex justify-center mx-auto w-full max-w-[90rem] mt-20 md:mt-40">
         <div className="obsidian-panel w-full max-w-5xl p-8 md:p-20 flex flex-col gap-6 md:gap-10 items-center justify-center text-center border-t-2 border-t-white/10">
            <p className="text-xl md:text-4xl text-white leading-tight font-syne font-bold tracking-tight">
               "Most people hear words. We read the human spectrum."
            </p>
            <p className="text-base md:text-xl text-zinc-400 leading-relaxed max-w-3xl">
               EmotiCore analyzes how you speak, write and express—revealing the emotion behind every interaction. Try it. Watch it understand you.
            </p>
         </div>
      </div>

      {/* Modality Details Section */}
      <div className="relative z-10 p-6 sm:p-12 lg:px-24 min-h-screen flex flex-col items-center justify-center gap-10 md:gap-16 max-w-7xl mx-auto text-center">
         <h2 className="text-4xl md:text-5xl lg:text-7xl font-syne font-extrabold text-white tracking-tight">
            TRI-MODAL <br className="md:hidden" /><span className="gradient-text">INTELLIGENCE</span>
         </h2>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8 text-left w-full">
            
            <div className="obsidian-card p-10 flex flex-col gap-6 group hover:-translate-y-2 transition-all border-l-4 border-l-cyan-500/50">
               <div className="w-16 h-16 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-400 group-hover:text-black transition-all shadow-[0_0_20px_rgba(0,243,255,0.2)]">
                  <MessageSquare size={32} />
               </div>
               <h3 className="font-syne font-bold text-3xl">Semantic Text</h3>
               <p className="text-zinc-400 text-lg leading-relaxed">
                  Deep linguistic analysis using <span className="text-white">RoBERTa</span>. We parse subconscious phrasing and structural intents to decode emotional subtext.
               </p>
            </div>

            <div className="obsidian-card p-10 flex flex-col gap-6 group hover:-translate-y-2 transition-all border-l-4 border-l-magenta-500/50" style={{ animationDelay: '0.1s' }}>
               <div className="w-16 h-16 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 group-hover:bg-rose-400 group-hover:text-black transition-all shadow-[0_0_20px_rgba(255,0,85,0.2)]">
                  <Mic size={32} />
               </div>
               <h3 className="font-syne font-bold text-3xl">Vocal Prosody</h3>
               <p className="text-zinc-400 text-lg leading-relaxed">
                  Advanced <span className="text-white">Acoustic Fingerprinting</span>. Mapping pitch, cadence, and vocal fry to identify emotional state through sound alone.
               </p>
            </div>

            <div className="obsidian-card p-10 flex flex-col gap-6 group hover:-translate-y-2 transition-all border-l-4 border-l-amber-500/50" style={{ animationDelay: '0.2s' }}>
               <div className="w-16 h-16 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-400 group-hover:text-black transition-all shadow-[0_0_20px_rgba(252,238,10,0.2)]">
                  <Camera size={32} />
               </div>
               <h3 className="font-syne font-bold text-3xl">Facial Optics</h3>
               <p className="text-zinc-400 text-lg leading-relaxed">
                  Micro-expression mapping via <span className="text-white">DeepFace</span>. Real-time facial topography analysis for granular emotion scoring.
               </p>
            </div>

         </div>
      </div>

      {/* Workflow Architecture Section */}
      <div className="relative z-10 p-6 sm:p-12 lg:px-24 min-h-screen flex flex-col justify-center gap-10 max-w-7xl mx-auto mb-20">
         <h2 className="text-3xl md:text-4xl lg:text-6xl font-syne font-extrabold text-white tracking-tight text-center mb-6 md:mb-16">
            CORE <span className="text-zinc-500">PIPELINE</span>
         </h2>
         
         <div className="flex flex-col md:flex-row gap-8 items-stretch justify-center w-full">
            {/* Step 1 */}
            <div className="flex-1 obsidian-card p-10 flex flex-col items-center text-center gap-6 group">
               <div className="w-20 h-20 rounded-full border-2 border-cyan-500/30 text-cyan-400 flex items-center justify-center font-black font-syne text-3xl group-hover:bg-cyan-400 group-hover:text-black transition-all">01</div>
               <h3 className="font-bold text-2xl text-white">Data Ingestion</h3>
               <p className="text-zinc-400 leading-relaxed">
                  Synchronous multi-channel input: raw audio, high-res video feeds, and natural language streams.
               </p>
            </div>
            
            {/* Step 2 */}
            <div className="flex-1 obsidian-card p-10 flex flex-col items-center text-center gap-6 group">
               <div className="w-20 h-20 rounded-full border-2 border-rose-500/30 text-rose-400 flex items-center justify-center font-black font-syne text-3xl group-hover:bg-rose-400 group-hover:text-black transition-all">02</div>
               <h3 className="font-bold text-2xl text-white">Neural Extraction</h3>
               <p className="text-zinc-400 leading-relaxed">
                  Distributed processing across specialized neural layers for dense latent feature extraction.
               </p>
            </div>

            {/* Step 3 */}
            <div className="flex-1 obsidian-card p-10 flex flex-col items-center text-center gap-6 group">
               <div className="w-20 h-20 rounded-full border-2 border-amber-500/30 text-amber-400 flex items-center justify-center font-black font-syne text-3xl group-hover:bg-amber-400 group-hover:text-black transition-all">03</div>
               <h3 className="font-bold text-2xl text-white">Late-Fusion Logic</h3>
               <p className="text-zinc-400 leading-relaxed">
                  Probabilistic normalization across modalities to compute the final unified emotion vector.
               </p>
            </div>
         </div>
      </div>

      {/* Tech Stack Section */}
      <div className="relative z-10 p-6 sm:p-12 lg:px-24 mb-32 flex flex-col items-center justify-center max-w-7xl mx-auto text-center font-jakarta border-t border-white/5 pt-32">
         <h2 className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.4em] text-zinc-500 mb-10 w-full text-center">SYSTEM REQUISITES</h2>
         
         <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 md:gap-10 opacity-70 w-full max-w-4xl mx-auto">
            {/* React */}
            <div className="flex items-center gap-2 sm:gap-3 px-4 py-2 sm:px-6 sm:py-3 rounded-full bg-white/5 border border-white/10 text-cyan-400 font-bold transition-all hover:scale-105 shadow-xl hover:bg-cyan-500/10 cursor-default active:scale-95">
                <svg viewBox="-11.5 -10.23174 23 20.46348" className="w-4 h-4 sm:w-5 sm:h-5 fill-current">
                   <circle cx="0" cy="0" r="2.05" fill="#61dafb"/>
                   <g stroke="#61dafb" strokeWidth="1" fill="none">
                      <ellipse rx="11" ry="4.2"/>
                      <ellipse rx="11" ry="4.2" transform="rotate(60)"/>
                      <ellipse rx="11" ry="4.2" transform="rotate(120)"/>
                   </g>
                </svg>
                <span className="text-xs sm:text-sm tracking-widest uppercase">React</span>
            </div>

            {/* FastAPI */}
            <div className="flex items-center gap-2 sm:gap-3 px-4 py-2 sm:px-6 sm:py-3 rounded-full bg-white/5 border border-white/10 text-[#059669] font-bold transition-all hover:scale-105 shadow-xl hover:bg-[#059669]/10 cursor-default active:scale-95">
                <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 fill-current">
                   <g fill="none" fillRule="evenodd">
                      <path fill="currentColor" d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-1.25 18v-4.5H5.5L13.25 6v4.5h5.25L10.75 18z"/>
                   </g>
                </svg>
                <span className="text-xs sm:text-sm tracking-widest uppercase text-emerald-400">FastAPI</span>
            </div>

            {/* TensorFlow */}
            <div className="flex items-center gap-2 sm:gap-3 px-4 py-2 sm:px-6 sm:py-3 rounded-full bg-white/5 border border-white/10 text-[#FF6F00] font-bold transition-all hover:scale-105 shadow-xl hover:bg-[#FF6F00]/10 cursor-default active:scale-95">
                <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 fill-current">
                   <path d="M12.012 1.3L1.516 7.35v9.3l10.496 6.05 10.472-6.05v-9.3L12.012 1.3zm0 2.21l8.536 4.93-2.915 1.68-5.621-3.24L6.39 10.12l-2.946-1.7 8.568-4.91zm0 2.21l3.705 2.14-1.852 1.07-1.853-1.07-1.853 1.07-1.852-1.07 3.705-2.14zm-6.621 3.82l6.621 3.82v7.64l-6.621-3.82V9.54zm13.242 0v7.64l-6.621 3.82v-7.64l6.621-3.82z"/>
                </svg>
                <span className="text-xs sm:text-sm tracking-widest uppercase">TensorFlow</span>
            </div>
            
            {/* Scikit-Learn */}
            <div className="flex items-center gap-2 sm:gap-3 px-4 py-2 sm:px-6 sm:py-3 rounded-full bg-white/5 border border-white/10 text-rose-400 font-bold transition-all hover:scale-105 shadow-xl hover:bg-rose-500/10 cursor-default active:scale-95">
                <span className="font-extrabold font-syne text-base sm:text-lg italic tracking-tighter">scikit-</span>
                <span className="text-xs sm:text-sm tracking-widest uppercase text-white/80">learn</span>
            </div>
         </div>
         
         <div className="mt-8 text-center text-zinc-500 lg:px-60 text-xs sm:text-sm leading-relaxed max-w-2xl">
            Asynchronous multi-modal compute pipeline heavily reliant strictly on robust architectural heuristics, scaling efficiently across hardware. 
         </div>
      </div>

    </div>
  );
}
