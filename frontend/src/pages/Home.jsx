import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { Terminal, Cpu, Shield, ChevronRight, Zap, ChevronDown, Code, Trophy, Users, Clock, Target, Flame } from 'lucide-react';

// --- 3D BACKGROUND COMPONENT (Three.js) ---
const CyberCore = () => {
    const mountRef = useRef(null);

    useEffect(() => {
        if (!mountRef.current) return;

        // 1. Scene Setup
        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x000000, 0.002);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 30;

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        mountRef.current.appendChild(renderer.domElement);

        // 2. Objects - Particle Cloud
        const geometry = new THREE.BufferGeometry();
        const count = 2500;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        for (let i = 0; i < count * 3; i++) {
            positions[i] = (Math.random() - 0.5) * 50;
            // Blue/Cyan gradient logic
            colors[i] = Math.random();
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.15,
            color: 0x22d3ee, // Cyan-400
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
        });

        const particles = new THREE.Points(geometry, material);
        scene.add(particles);

        // Floating Geometric Rings
        const ringGeo = new THREE.TorusGeometry(15, 0.1, 16, 100);
        // Darker Blue for rings
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, wireframe: true, transparent: true, opacity: 0.3 });
        const ring1 = new THREE.Mesh(ringGeo, ringMat);
        const ring2 = new THREE.Mesh(ringGeo, ringMat);

        ring1.rotation.x = Math.PI / 2;
        ring2.rotation.y = Math.PI / 4;

        scene.add(ring1);
        scene.add(ring2);

        // 3D Wireframe Icosahedron
        const icoGeo = new THREE.IcosahedronGeometry(8, 1);
        const icoMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, wireframe: true, transparent: true, opacity: 0.2 });
        const icosahedron = new THREE.Mesh(icoGeo, icoMat);
        scene.add(icosahedron);

        // 3. Interaction State
        let mouseX = 0;
        let mouseY = 0;
        let baseRotationY = 0;
        let baseRotationX = 0;

        const handleMouseMove = (event) => {
            mouseX = (event.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
            mouseY = (event.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
        };

        document.addEventListener('mousemove', handleMouseMove);

        // 4. Animation Loop
        const animate = () => {
            requestAnimationFrame(animate);

            baseRotationY += 0.002;
            baseRotationX += 0.001;

            const mouseOffsetXDirect = mouseX * 0.8;
            const mouseOffsetYDirect = mouseY * 0.5;

            particles.rotation.y = baseRotationY + mouseOffsetXDirect;
            particles.rotation.x = baseRotationX + mouseOffsetYDirect;

            ring1.rotation.z -= 0.005;
            ring1.rotation.x += 0.002;
            ring2.rotation.z += 0.005;

            icosahedron.rotation.x += 0.003;
            icosahedron.rotation.y += 0.002;

            const time = Date.now() * 0.001;
            particles.scale.setScalar(1 + Math.sin(time) * 0.05);
            icosahedron.scale.setScalar(1 + Math.sin(time * 0.5) * 0.1);

            renderer.render(scene, camera);
        };

        animate();

        // 5. Cleanup
        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('mousemove', handleMouseMove);
            if (mountRef.current) {
                mountRef.current.removeChild(renderer.domElement);
            }
            geometry.dispose();
            material.dispose();
        };
    }, []);

    return <div ref={mountRef} className="fixed inset-0 z-0 pointer-events-none" />;
};

// --- Animated 3D Floating Cube Component ---
const FloatingCube = ({ position = { x: 0, y: 0 }, size = 60, delay = 0 }) => {
    return (
        <div
            className="absolute pointer-events-none"
            style={{
                left: position.x,
                top: position.y,
                animation: `float3d 6s ease-in-out ${delay}s infinite`,
            }}
        >
            <div
                className="relative preserve-3d"
                style={{
                    width: size,
                    height: size,
                    animation: `rotateCube 10s linear infinite`,
                }}
            >
                {/* Cube faces - Changed from Red to Cyan/Blue */}
                <div className="absolute w-full h-full border border-cyan-500/30 bg-cyan-500/5"
                    style={{ transform: `translateZ(${size / 2}px)` }} />
                <div className="absolute w-full h-full border border-cyan-500/30 bg-cyan-500/5"
                    style={{ transform: `rotateY(180deg) translateZ(${size / 2}px)` }} />
                <div className="absolute w-full h-full border border-cyan-500/30 bg-cyan-500/5"
                    style={{ transform: `rotateY(-90deg) translateZ(${size / 2}px)` }} />
                <div className="absolute w-full h-full border border-cyan-500/30 bg-cyan-500/5"
                    style={{ transform: `rotateY(90deg) translateZ(${size / 2}px)` }} />
            </div>
        </div>
    );
};

// --- UI COMPONENTS ---
const FeatureCard = ({ icon, title, desc, delay }) => (
    <div
        className="border border-cyan-900/50 bg-black/60 backdrop-blur-md p-6 hover:bg-cyan-900/10 hover:border-cyan-400 transition-all duration-500 group relative overflow-hidden"
        style={{ animation: `fadeInUp 0.8s ease-out ${delay}s backwards` }}
    >
        <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-cyan-500/30 group-hover:border-cyan-400 transition-all"></div>
        <div className="mb-4 text-cyan-400 group-hover:text-white transition-colors group-hover:scale-110 transform duration-300 inline-block">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-white mb-2 font-mono group-hover:tracking-wider transition-all">{title}</h3>
        <p className="text-sm text-cyan-200/60 leading-relaxed font-mono">{desc}</p>
    </div>
);

const StatCard = ({ icon, value, label, delay }) => (
    <div
        className="text-center p-6 border border-cyan-900/30 bg-black/40 backdrop-blur-sm hover:border-cyan-400/50 transition-all group"
        style={{ animation: `fadeInUp 0.8s ease-out ${delay}s backwards` }}
    >
        <div className="text-cyan-400 mb-3 flex justify-center group-hover:scale-110 transition-transform">
            {icon}
        </div>
        <div className="text-3xl md:text-4xl font-black text-white mb-1 font-mono">{value}</div>
        <div className="text-xs text-cyan-200/50 tracking-widest uppercase">{label}</div>
    </div>
);

const TimelineItem = ({ phase, title, desc, isActive }) => (
    <div className={`relative pl-8 pb-8 border-l-2 ${isActive ? 'border-cyan-400' : 'border-cyan-900/30'} last:pb-0`}>
        <div className={`absolute left-0 top-0 w-4 h-4 rounded-full -translate-x-[9px] ${isActive ? 'bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]' : 'bg-cyan-900/50'}`}></div>
        <div className={`text-xs tracking-widest mb-1 ${isActive ? 'text-cyan-300' : 'text-cyan-500/40'}`}>{phase}</div>
        <h4 className={`text-lg font-bold mb-1 ${isActive ? 'text-white' : 'text-white/60'}`}>{title}</h4>
        <p className="text-sm text-cyan-200/40">{desc}</p>
    </div>
);

// --- Scroll Down Button ---
const ScrollIndicator = ({ targetId }) => {
    const scrollToSection = () => {
        const element = document.getElementById(targetId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <button
            onClick={scrollToSection}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-cyan-500/70 hover:text-cyan-300 transition-colors group cursor-pointer z-30"
        >
            <span className="text-xs tracking-widest uppercase font-mono">Scroll Down</span>
            <div className="animate-bounce">
                <ChevronDown size={24} className="group-hover:scale-110 transition-transform" />
            </div>
        </button>
    );
};

export default function HomePage() {
    const [booted, setBooted] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() => setBooted(true), 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="bg-black text-white relative font-mono selection:bg-cyan-400 selection:text-black overflow-x-hidden">

            {/* GLOBAL STYLES & ANIMATIONS */}
            <style>{`
        @keyframes scanline {
            0% { background-position: 0% 0%; }
            100% { background-position: 0% 100%; }
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(40px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInLeft {
            from { opacity: 0; transform: translateX(-100px); }
            to { opacity: 1; transform: translateX(0); }
        }
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        @keyframes float3d {
            0%, 100% { transform: translateY(0) translateX(0); }
            25% { transform: translateY(-20px) translateX(10px); }
            50% { transform: translateY(0) translateX(-10px); }
            75% { transform: translateY(-15px) translateX(5px); }
        }
        @keyframes rotateCube {
            0% { transform: rotateX(0deg) rotateY(0deg); }
            100% { transform: rotateX(360deg) rotateY(360deg); }
        }
        @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 20px rgba(34, 211, 238, 0.3); }
            50% { box-shadow: 0 0 40px rgba(34, 211, 238, 0.6); }
        }
        .scanlines {
            background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.2));
            background-size: 100% 4px;
            animation: scanline 0.2s linear infinite;
        }
        .preserve-3d {
            transform-style: preserve-3d;
        }
        .glow-border {
            animation: pulse-glow 2s ease-in-out infinite;
        }
      `}</style>

            {/* 3D SCENE LAYER */}
            <CyberCore />

            {/* OVERLAY LAYERS */}
            <div className="fixed inset-0 z-10 pointer-events-none bg-gradient-to-t from-black via-transparent to-black/80"></div>
            <div className="fixed inset-0 z-10 pointer-events-none scanlines opacity-10"></div>
            <div className="fixed inset-0 z-10 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,#000000_120%)]"></div>

            {/* ===== SECTION 1: HERO (Full Viewport) ===== */}
            <section className={`relative z-20 h-screen flex flex-col transition-opacity duration-1000 ${booted ? 'opacity-100' : 'opacity-0'}`}>

                {/* HEADER */}
                <header className="flex justify-between items-center p-6 border-b border-white/10 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-cyan-400 animate-pulse">
                        <Terminal size={24} />
                        <span className="font-bold tracking-[0.2em] text-lg">CODEMANIA_SYS</span>
                    </div>
                    <div className="flex gap-8 text-xs font-bold tracking-widest text-cyan-200/50">
                        <span className="hidden md:inline">LOC: SECTOR_07</span>
                        <span className="hidden md:inline">NET: SECURE</span>
                        <span className="animate-pulse text-cyan-400">ONLINE</span>
                    </div>
                </header>

                {/* HERO CONTENT */}
                <div className="flex-1 flex flex-col justify-center px-6 md:px-20 lg:px-32 relative">

                    {/* Decorative Elements */}
                    <div className="absolute top-1/4 right-10 md:right-32 w-64 h-64 border border-cyan-500/20 rounded-full animate-spin opacity-20 pointer-events-none border-dashed" style={{ animationDuration: '20s' }}></div>
                    <FloatingCube position={{ x: '80%', y: '20%' }} size={50} delay={0} />
                    <FloatingCube position={{ x: '10%', y: '60%' }} size={35} delay={2} />

                    <div className="max-w-4xl space-y-8">
                        {/* Status Pill */}
                        <div
                            className="inline-flex items-center gap-2 px-3 py-1 border border-cyan-500/30 rounded-full bg-cyan-900/10 text-cyan-300 text-xs font-bold tracking-widest mb-4 backdrop-blur-md"
                            style={{ animation: 'slideInLeft 0.8s ease-out 0.2s backwards' }}
                        >
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_#22d3ee]"></div>
                            REGISTRATION OPEN :: PHASE_1
                        </div>

                        {/* Main Heading */}
                        <div className="space-y-2">
                            <h1
                                className="text-5xl md:text-7xl lg:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 leading-tight"
                                style={{ animation: 'fadeInUp 1s ease-out 0.4s backwards', fontFamily: 'Impact, sans-serif' }}
                            >
                                CODE<span className="text-cyan-500">MANIA</span>
                            </h1>
                            <p
                                className="text-xl md:text-2xl text-cyan-100/70 max-w-2xl font-light tracking-wide"
                                style={{ animation: 'fadeInUp 1s ease-out 0.6s backwards' }}
                            >
                                The ultimate algorithmic battleground.
                                <br />
                                <span className="text-white font-bold">Hack the system. Claim the glory.</span>
                            </p>
                        </div>

                        {/* CTA Buttons */}
                        <div
                            className="flex flex-col sm:flex-row gap-6 pt-8"
                            style={{ animation: 'fadeInUp 1s ease-out 0.8s backwards' }}
                        >
                            <button
                                onClick={() => navigate('/team-login')}
                                className="group relative px-8 py-4 bg-cyan-600 overflow-hidden font-bold tracking-widest text-black hover:text-white transition-colors duration-300 glow-border"
                            >
                                <div className="absolute inset-0 w-0 bg-black transition-all duration-[250ms] ease-out group-hover:w-full opacity-100"></div>
                                <span className="relative z-10 flex items-center gap-2">
                                    INITIATE_LOGIN <ChevronRight size={18} />
                                </span>
                            </button>

                            <button
                                onClick={() => navigate('/admin')}
                                className="group px-8 py-4 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 font-bold tracking-widest transition-all"
                            >
                                ADMIN_ACCESS
                            </button>
                        </div>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <ScrollIndicator targetId="features" />
            </section>

            {/* ===== SECTION 2: FEATURES ===== */}
            <section id="features" className="relative z-20 min-h-screen py-24 px-6 md:px-20 lg:px-32 bg-gradient-to-b from-transparent via-black/50 to-black">
                <div className="max-w-6xl mx-auto">

                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-black text-white mb-4" style={{ animation: 'fadeInUp 0.8s ease-out backwards' }}>
                            ARENA <span className="text-cyan-400">PROTOCOLS</span>
                        </h2>
                        <p className="text-cyan-200/50 max-w-2xl mx-auto">
                            Master the rules of engagement. Understand the battlefield before you deploy.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FeatureCard
                            delay={0.2}
                            icon={<Zap size={32} />}
                            title="SPEED RUN"
                            desc="Optimize your complexity. Sub-second execution times required for max points."
                        />
                        <FeatureCard
                            delay={0.4}
                            icon={<Shield size={32} />}
                            title="SECURE ENV"
                            desc="Sandboxed execution. Memory limits enforced. No external libraries allowed."
                        />
                        <FeatureCard
                            delay={0.6}
                            icon={<Cpu size={32} />}
                            title="AI ADVERSARY"
                            desc="Compete against the machine. Can your logic beat the default neural weights?"
                        />
                    </div>

                    {/* Stats Section */}
                    <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard delay={0.8} icon={<Users size={28} />} value="500+" label="Competitors" />
                        <StatCard delay={1.0} icon={<Code size={28} />} value="50" label="Challenges" />
                        <StatCard delay={1.2} icon={<Trophy size={28} />} value="₹50K" label="Prize Pool" />
                        <StatCard delay={1.4} icon={<Clock size={28} />} value="24H" label="Duration" />
                    </div>
                </div>
            </section>

            {/* ===== SECTION 3: COMPETITION PHASES ===== */}
            <section className="relative z-20 min-h-screen py-24 px-6 md:px-20 lg:px-32">
                <div className="max-w-6xl mx-auto">

                    <div className="grid md:grid-cols-2 gap-16 items-center">

                        {/* Left: Timeline */}
                        <div>
                            <h2 className="text-3xl md:text-4xl font-black text-white mb-8">
                                BATTLE <span className="text-cyan-400">PHASES</span>
                            </h2>

                            <div className="space-y-0">
                                <TimelineItem
                                    phase="PHASE_01"
                                    title="Registration & Team Formation"
                                    desc="Form your squad. Max 3 members per team. Solo operators welcome."
                                    isActive={true}
                                />
                                <TimelineItem
                                    phase="PHASE_02"
                                    title="Qualification Round"
                                    desc="Prove your worth. Top 100 teams advance to the arena."
                                    isActive={false}
                                />
                                <TimelineItem
                                    phase="PHASE_03"
                                    title="Semi-Finals"
                                    desc="Algorithmic warfare. Complex problems. Time-critical solutions."
                                    isActive={false}
                                />
                                <TimelineItem
                                    phase="PHASE_04"
                                    title="Grand Finals"
                                    desc="Last teams standing battle for glory and the ultimate prize."
                                    isActive={false}
                                />
                            </div>
                        </div>

                        {/* Right: Visual Element */}
                        <div className="relative">
                            <div className="aspect-square max-w-md mx-auto relative">
                                {/* Animated rings */}
                                <div className="absolute inset-0 border-2 border-cyan-500/20 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
                                <div className="absolute inset-4 border border-cyan-500/30 rounded-full animate-spin" style={{ animationDuration: '15s' }}></div>
                                <div className="absolute inset-8 border border-dashed border-cyan-500/40 rounded-full animate-spin" style={{ animationDuration: '20s', animationDirection: 'reverse' }}></div>
                                <div className="absolute inset-12 border-2 border-cyan-500/50 rounded-full"></div>

                                {/* Center content */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="text-6xl font-black text-cyan-400 mb-2">4</div>
                                        <div className="text-xs tracking-widest text-cyan-200/50">ROUNDS</div>
                                        <div className="mt-4 text-2xl font-bold text-white">1 WINNER</div>
                                    </div>
                                </div>

                                {/* Orbiting elements */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                    <Target size={20} className="text-cyan-400 animate-pulse" />
                                </div>
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
                                    <Flame size={20} className="text-cyan-400 animate-pulse" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== SECTION 4: CTA SECTION ===== */}
            <section className="relative z-20 py-24 px-6 md:px-20 lg:px-32 bg-gradient-to-t from-cyan-950/20 to-transparent">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-6">
                        READY TO <span className="text-cyan-400">COMPETE</span>?
                    </h2>
                    <p className="text-lg text-cyan-200/60 mb-10 max-w-2xl mx-auto">
                        The arena awaits. Register now and prove your algorithmic supremacy.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-6 justify-center">
                        <button
                            onClick={() => navigate('/team-login')}
                            className="group relative px-10 py-5 bg-cyan-600 overflow-hidden font-bold tracking-widest text-black hover:text-white transition-colors duration-300 text-lg glow-border"
                        >
                            <div className="absolute inset-0 w-0 bg-black transition-all duration-[250ms] ease-out group-hover:w-full"></div>
                            <span className="relative z-10 flex items-center gap-3 justify-center">
                                ENTER THE ARENA <ChevronRight size={22} />
                            </span>
                        </button>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="relative z-20 border-t border-cyan-900/30 bg-black/80 backdrop-blur py-8">
                <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2 text-cyan-400">
                        <Terminal size={20} />
                        <span className="font-bold tracking-widest">CODEMANIA</span>
                    </div>
                    <div className="text-cyan-200/50 text-xs text-center md:text-right">
                        SYSTEM_MSG: WELCOME TO THE ARENA // PREPARE YOUR ALGORITHMS // GLORY AWAITS
                    </div>
                </div>
            </footer>
        </div>
    );
}
