import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Brain, ChevronRight, MessageSquare, Mic, Camera } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function InteractiveSphere({ scrollY }) {
  const pointsRef = useRef();
  const linesRef = useRef();
  
  const { originalPositions, indices } = useMemo(() => {
    const pts = [];
    const idx = [];
    const density = 1000; // Drastically increased nodes density
    const radius = 2.4; // Smaller sphere scale
    
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
  }, []);

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
        const radiusOfInteraction = 1.5; // Scaled down to match smaller sphere
        
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
    <div className="min-h-[300vh] bg-transparent text-white relative overflow-x-hidden">
      
      {/* Three.js WebGL Interactive Sphere Context */}
      <div className="fixed top-1/2 left-[70%] transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] z-0 mix-blend-screen">
          <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
             <ambientLight intensity={0.5} />
             <InteractiveSphere scrollY={scrollY} />
          </Canvas>
      </div>

      {/* Top Logo Navbar */}
      <nav className="absolute top-0 left-0 w-full p-8 z-50 flex items-center">
         <div className="flex items-center gap-4">
            <div>
              <svg width="0" height="0">
                <linearGradient id="gradientBrain" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop stopColor="#30B5FF" offset="0%" />
                  <stop stopColor="#9C27B0" offset="100%" />
                </linearGradient>
              </svg>
              <Brain size={44} strokeWidth={1.5} className="text-transparent drop-shadow-md" style={{ stroke: 'url(#gradientBrain)' }} />
            </div>
            <div className="ml-2">
              <h1 className="text-4xl font-medium font-outfit text-white tracking-widest">
                EMOTICORE
              </h1>
              <p className="text-[13px] text-[#8e8e93] font-medium tracking-[0.1em] uppercase mt-1">Multi-Modal AI System</p>
            </div>
         </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 pt-56 pb-8 px-12 lg:px-24 min-h-[50vh] flex flex-col justify-center max-w-5xl">
         <h1 className="text-6xl lg:text-9xl font-outfit font-black tracking-tight leading-tight text-white pt-4 drop-shadow-2xl">
            DECODE. <br/>
            HUMAN EMOTION
         </h1>
      </div>

      {/* Hero Description & Call to Action Card [Vertical Layout] */}
      <div className="relative z-20 px-8 md:px-12 lg:px-24 pb-32 flex justify-center mx-auto w-full max-w-[90rem] mt-24 lg:mt-40">
         <div className="bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl rounded-[3rem] w-full max-w-4xl p-10 md:p-14 lg:p-16 flex flex-col gap-10 items-center justify-center text-center">
            <p className="text-xl md:text-3xl text-slate-200 leading-relaxed font-inter tracking-wide drop-shadow-md">
               Most people hear words. We read emotions. EmotiCore analyzes how you speak, write and express—revealing the emotion behind every interaction. Try it. Watch it understand you.
            </p>
            <div className="flex justify-center w-full mt-2">
               <button onClick={onGetStarted} className="w-fit text-lg lg:text-xl px-10 py-5 rounded-full flex items-center gap-3 tracking-widest font-bold uppercase transition-all hover:scale-105 bg-white/10 hover:bg-white/20 border border-white/20 text-white shadow-lg">
                  Get Started <ChevronRight size={24} strokeWidth={3} />
               </button>
            </div>
         </div>
      </div>

      {/* Modality Details Section (Appears as you scroll down) */}
      <div className="relative z-10 p-12 lg:px-24 min-h-[100vh] flex flex-col items-center justify-center gap-12 max-w-6xl mx-auto text-center">
         <h2 className="text-4xl lg:text-5xl font-outfit font-bold text-white tracking-wide">
            Tri-Modal <span className="text-indigo-400">Analysis Engine</span>
         </h2>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8 text-left">
            
            <div className="glass-card p-8 flex flex-col gap-6 group hover:translate-y-[-10px] transition-all">
               <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-400 group-hover:!text-black group-hover:shadow-[0_0_20px_#00f3ff] transition-all">
                  <MessageSquare size={32} />
               </div>
               <h3 className="font-outfit font-bold text-2xl">Semantic Text</h3>
               <p className="text-slate-400">
                  Powered by <span className="text-white">DistilRoBERTa</span>. We analyze your paragraphs, parsing subconscious phrasing and structural intents to predict feelings of sorrow, joy, and fear effortlessly.
               </p>
            </div>

            <div className="glass-card p-8 flex flex-col gap-6 group hover:translate-y-[-10px] transition-all" style={{ animationDelay: '0.1s' }}>
               <div className="w-16 h-16 rounded-2xl bg-pink-500/20 border border-pink-400/30 flex items-center justify-center text-pink-400 group-hover:bg-pink-400 group-hover:!text-black group-hover:shadow-[0_0_20px_#ff0055] transition-all">
                  <Mic size={32} />
               </div>
               <h3 className="font-outfit font-bold text-2xl">Vocal Prosody</h3>
               <p className="text-slate-400">
                  Utilizing <span className="text-white">Librosa feature extraction</span>. Upload direct audio recordings to map specific acoustic signatures and vocal fry.
               </p>
            </div>

            <div className="glass-card p-8 flex flex-col gap-6 group hover:translate-y-[-10px] transition-all" style={{ animationDelay: '0.2s' }}>
               <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 group-hover:bg-amber-400 group-hover:!text-black group-hover:shadow-[0_0_20px_#fcee0a] transition-all">
                  <Camera size={32} />
               </div>
               <h3 className="font-outfit font-bold text-2xl">Facial Optics</h3>
               <p className="text-slate-400">
                  A high-speed <span className="text-white">DeepFace & OpenCV</span> pipeline. Access your webcam locally and map real-time facial topography to pinpoint granular emotion scores.
               </p>
            </div>

         </div>
      </div>

      {/* Workflow Architecture Section */}
      <div className="relative z-10 p-12 lg:px-24 min-h-[100vh] flex flex-col justify-center gap-8 max-w-6xl mx-auto">
         <h2 className="text-4xl lg:text-5xl font-outfit font-bold text-white tracking-wide text-center mb-12">
            The <span className="text-pink-400">Workflow</span> Architecture
         </h2>
         
         <div className="flex flex-col md:flex-row gap-6 items-center justify-center w-full">
            {/* Step 1 */}
            <div className="flex-1 glass-card p-8 flex flex-col items-center text-center gap-4 group hover:-translate-y-2 transition-transform">
               <div className="w-16 h-16 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black font-outfit text-2xl mb-2 shadow-[0_0_15px_rgba(0,243,255,0.4)] group-hover:bg-indigo-400 group-hover:!text-black transition-colors">1</div>
               <h3 className="font-bold text-xl text-white">Data Ingestion</h3>
               <p className="text-sm text-slate-400 leading-relaxed">
                  Users securely input raw microphone audio, webcam video feeds, or natural language text streams directly through the Vite React dashboard.
               </p>
            </div>
            
            {/* Connector */}
            <div className="hidden md:block w-16 h-[2px] bg-gradient-to-r from-indigo-400 to-pink-400 animate-pulse"></div>
            
            {/* Step 2 */}
            <div className="flex-1 glass-card p-8 flex flex-col items-center text-center gap-4 group hover:-translate-y-2 transition-transform">
               <div className="w-16 h-16 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center font-black font-outfit text-2xl mb-2 shadow-[0_0_15px_rgba(255,0,85,0.4)] group-hover:bg-pink-400 group-hover:!text-black transition-colors">2</div>
               <h3 className="font-bold text-xl text-white">Deep Extraction</h3>
               <p className="text-sm text-slate-400 leading-relaxed">
                  Our Python FastAPI backend distributes the data to state-of-the-art neural networks (DistilRoBERTa, Librosa, DeepFace) to extract dense latent features.
               </p>
            </div>

            {/* Connector */}
            <div className="hidden md:block w-16 h-[2px] bg-gradient-to-r from-pink-400 to-amber-400 animate-pulse"></div>

            {/* Step 3 */}
            <div className="flex-1 glass-card p-8 flex flex-col items-center text-center gap-4 group hover:-translate-y-2 transition-transform">
               <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-black font-outfit text-2xl mb-2 shadow-[0_0_15px_rgba(252,238,10,0.4)] group-hover:bg-amber-400 group-hover:text-black transition-colors">3</div>
               <h3 className="font-bold text-xl text-white">Late-Fusion Logic</h3>
               <p className="text-sm text-slate-400 leading-relaxed">
                  A sophisticated weighting architecture normalizes the probabilities from all isolated modalities to compute the final, highly accurate human emotion.
               </p>
            </div>
         </div>
      </div>

    </div>
  );
}
