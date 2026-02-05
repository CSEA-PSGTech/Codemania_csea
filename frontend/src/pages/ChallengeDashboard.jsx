import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import {
    Terminal, Code, Clock, Play, User,
    Cpu, Zap, Shield, ChevronLeft, AlertTriangle, Loader, Lock, CheckCircle
} from 'lucide-react';
import API from '../config/api';

// --- 3D BACKGROUND COMPONENT (Cyan Theme) ---
const CyberCore = () => {
    const mountRef = useRef(null);

    useEffect(() => {
        if (!mountRef.current) return;

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x000000, 0.002);
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 30;
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        mountRef.current.appendChild(renderer.domElement);

        // Particles (Cyan Theme)
        const geometry = new THREE.BufferGeometry();
        const count = 2000;
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count * 3; i++) positions[i] = (Math.random() - 0.5) * 60;
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({
            size: 0.15,
            color: 0x22d3ee, // Cyan-400
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
        });
        const particles = new THREE.Points(geometry, material);
        scene.add(particles);

        // Grid Floor
        const gridHelper = new THREE.GridHelper(100, 50, 0x0891b2, 0x083344);
        gridHelper.position.y = -10;
        scene.add(gridHelper);

        const animate = () => {
            requestAnimationFrame(animate);
            particles.rotation.y += 0.001;
            gridHelper.rotation.y -= 0.001;
            // Gentle floating
            const time = Date.now() * 0.001;
            particles.position.y = Math.sin(time * 0.5) * 2;
            renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
        };
    }, []);

    return <div ref={mountRef} className="fixed inset-0 z-0 pointer-events-none" />;
};

// --- SUB-COMPONENTS ---

const DifficultyBadge = ({ level }) => {
    let colorClass = "";
    let borderColor = "";

    switch (level.toLowerCase()) {
        case 'easy':
            colorClass = "text-cyan-400 bg-cyan-400/10";
            borderColor = "border-cyan-500/50";
            break;
        case 'medium':
            colorClass = "text-yellow-400 bg-yellow-400/10";
            borderColor = "border-yellow-500/50";
            break;
        case 'hard':
            colorClass = "text-red-500 bg-red-500/10";
            borderColor = "border-red-500/50";
            break;
        default:
            colorClass = "text-gray-400";
    }

    return (
        <span className={`px-2 py-1 text-xs font-bold uppercase tracking-wider border ${borderColor} ${colorClass} rounded-sm`}>
            {level}
        </span>
    );
};

const ChallengeCard = ({ question, onStart }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [loading, setLoading] = useState(false);
    const isSolved = question.solved;

    const handleStart = () => {
        if (isSolved) return; // Don't start if already solved
        setLoading(true);
        // Simulate navigation delay
        setTimeout(() => {
            setLoading(false);
            onStart(question.id);
        }, 2000);
    };

    return (
        <div
            className={`relative group bg-black/60 border backdrop-blur-md transition-all duration-300 overflow-hidden flex flex-col h-full ${
                isSolved 
                    ? 'border-green-500/50 opacity-75' 
                    : 'border-cyan-900/50 hover:border-cyan-400/50'
            }`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Solved Overlay */}
            {isSolved && (
                <div className="absolute inset-0 bg-green-900/20 z-20 flex items-center justify-center">
                    <div className="bg-black/80 border border-green-500 px-6 py-3 flex items-center gap-3">
                        <CheckCircle className="text-green-500" size={24} />
                        <span className="text-green-400 font-bold uppercase tracking-widest text-sm">Completed</span>
                    </div>
                </div>
            )}

            {/* Hover Glow Effect */}
            <div className={`absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent transition-opacity duration-300 pointer-events-none ${isHovered && !isSolved ? 'opacity-100' : 'opacity-0'}`} />

            {/* Card Header */}
            <div className="p-6 border-b border-cyan-900/30 relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <DifficultyBadge level={question.difficulty} />
                    <div className={`flex items-center gap-1 font-mono text-sm ${isSolved ? 'text-green-400' : 'text-cyan-400'}`}>
                        {isSolved ? <CheckCircle size={14} /> : <Zap size={14} />}
                        <span className="font-bold">{question.points} PTS</span>
                    </div>
                </div>
                <h3 className={`text-xl font-bold font-mono transition-colors ${
                    isSolved ? 'text-green-300' : 'text-white group-hover:text-cyan-300'
                }`}>
                    {question.title}
                </h3>
            </div>

            {/* Card Body */}
            <div className="p-6 flex-1 relative z-10 flex flex-col">
                <div className="flex items-center gap-2 text-cyan-200/50 text-xs uppercase tracking-widest mb-3">
                    <Code size={12} />
                    {question.category}
                </div>

                <p className="text-cyan-100/70 text-sm leading-relaxed mb-6 flex-1 font-mono">
                    {question.description}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-cyan-900/30">
                    <div className="flex items-center gap-2 text-cyan-500/80 text-sm font-mono">
                        <Clock size={16} />
                        <span>{question.timeLimit}</span>
                    </div>

                    {isSolved ? (
                        <div className="px-6 py-2 bg-green-900/20 border border-green-500/30 text-green-400 font-bold tracking-widest text-xs uppercase flex items-center gap-2">
                            <Lock size={12} /> LOCKED
                        </div>
                    ) : (
                        <button
                            onClick={handleStart}
                            disabled={loading}
                            className={`
                                relative px-6 py-2 bg-cyan-900/20 border border-cyan-500/30 text-cyan-400 
                                font-bold tracking-widest text-xs uppercase hover:bg-cyan-500 hover:text-black 
                                transition-all duration-300 flex items-center gap-2
                                ${loading ? 'cursor-wait opacity-80' : ''}
                            `}
                        >
                            {loading ? (
                                <>
                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    INIT_...
                                </>
                            ) : (
                                <>
                                    INITIALIZE <Play size={12} fill="currentColor" />
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---
export default function ChallengeDashboard() {
    const [booted, setBooted] = useState(false);
    const [questions, setQuestions] = useState([]);
    const [solvedQuestionIds, setSolvedQuestionIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() => setBooted(true), 100);
        return () => clearTimeout(timer);
    }, []);

    // Fetch questions and solved status from API
    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    navigate('/login');
                    return;
                }

                const headers = { Authorization: `Bearer ${token}` };

                // Fetch questions and solved status in parallel
                const [questionsRes, solvedRes] = await Promise.all([
                    API.get('/questions', { headers }),
                    API.get('/submissions/solved', { headers })
                ]);

                const solved = solvedRes.data.solvedQuestionIds || [];
                setSolvedQuestionIds(solved);

                // Map API response to match card structure
                const mappedQuestions = questionsRes.data.map(q => ({
                    id: q._id,
                    title: q.title,
                    description: q.descriptionWithConstraints,
                    points: q.currentPoints,
                    totalPoints: q.totalPoints,
                    teamsSolved: q.noOfTeamsSolved,
                    difficulty: q.totalPoints <= 100 ? 'Easy' : q.totalPoints <= 200 ? 'Medium' : 'Hard',
                    category: 'Code Optimization',
                    timeLimit: `${Math.ceil(q.timeLimit / 1000 / 60)} min`,
                    solved: solved.includes(q._id)
                }));

                setQuestions(mappedQuestions);
            } catch (err) {
                console.error('Error fetching questions:', err);
                if (err.response?.status === 401) {
                    localStorage.removeItem('token');
                    navigate('/login');
                } else {
                    setError('Failed to load challenges. Please try again.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    const handleStartChallenge = (id) => {
        const question = questions.find(q => q.id === id);
        if (question?.solved) {
            return; // Don't navigate if already solved
        }
        console.log(`[System] Mounting IDE environment for Challenge ID: ${id}`);
        navigate(`/ide/${id}`);
    };

    return (
        <div className="min-h-screen bg-black text-white font-mono selection:bg-cyan-500 selection:text-black overflow-x-hidden relative">

            {/* GLOBAL ANIMATIONS */}
            <style>{`
        @keyframes scanline {
          0% { background-position: 0% 0%; }
          100% { background-position: 0% 100%; }
        }
        .scanlines {
          background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.2));
          background-size: 100% 4px;
          animation: scanline 0.2s linear infinite;
        }
      `}</style>

            {/* BACKGROUND LAYERS */}
            <CyberCore />
            <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-t from-black via-black/50 to-transparent" />
            <div className="fixed inset-0 z-0 pointer-events-none scanlines opacity-10" />

            {/* HEADER */}
            <header className={`relative z-20 border-b border-cyan-900/30 bg-black/80 backdrop-blur-md sticky top-0 transition-opacity duration-1000 ${booted ? 'opacity-100' : 'opacity-0'}`}>
                <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">

                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-900/20 border border-cyan-500/30 rounded-sm">
                            <Terminal size={24} className="text-cyan-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-[0.15em] text-white">
                                CODE<span className="text-cyan-500">MANIA</span>
                            </h1>
                            <div className="flex items-center gap-2 text-[10px] text-cyan-500/50 uppercase tracking-widest">
                                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
                                System Online
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right hidden md:block">
                            <p className="text-[10px] text-cyan-200/50 uppercase tracking-widest">Operator</p>
                            <p className="text-cyan-400 font-bold tracking-wide">JOHN_DOE</p>
                        </div>
                        <div className="w-10 h-10 border border-cyan-500/30 bg-cyan-900/10 flex items-center justify-center text-cyan-400">
                            <User size={20} />
                        </div>
                    </div>

                </div>
            </header>

            {/* MAIN CONTENT */}
            <main className={`relative z-10 max-w-7xl mx-auto px-6 py-12 transition-all duration-1000 delay-300 ${booted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

                {/* Intro Section */}
                <div className="mb-12 border-l-2 border-cyan-500 pl-6">
                    <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">
                        Available <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-600">Protocols</span>
                    </h2>
                    <p className="text-cyan-200/60 max-w-2xl text-sm leading-relaxed">
                        Select a cryptographic challenge to begin execution.
                        Ensure your algorithmic efficiency meets system requirements.
                        <span className="text-cyan-400"> Time is a factor.</span>
                    </p>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                    {[
                        { label: 'Active Nodes', val: loading ? '...' : questions.length.toString(), icon: Cpu },
                        { label: 'Total Points', val: loading ? '...' : questions.reduce((sum, q) => sum + q.points, 0).toString(), icon: Zap },
                        { label: 'System Load', val: '42%', icon: AlertTriangle },
                        { label: 'Security Level', val: 'MAX', icon: Shield },
                    ].map((stat, idx) => (
                        <div key={idx} className="bg-cyan-900/5 border border-cyan-900/30 p-4 flex items-center gap-4">
                            <stat.icon size={20} className="text-cyan-500/50" />
                            <div>
                                <div className="text-lg font-bold text-white">{stat.val}</div>
                                <div className="text-[10px] text-cyan-500/40 uppercase tracking-widest">{stat.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Questions Grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader size={40} className="text-cyan-400 animate-spin mb-4" />
                        <p className="text-cyan-500/60 text-sm uppercase tracking-widest">Loading Protocols...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 border border-red-500/30 bg-red-900/10">
                        <AlertTriangle size={40} className="text-red-500 mb-4" />
                        <p className="text-red-400 text-sm">{error}</p>
                        <button 
                            onClick={() => window.location.reload()}
                            className="mt-4 px-4 py-2 border border-cyan-500/30 text-cyan-400 text-xs uppercase tracking-widest hover:bg-cyan-500 hover:text-black transition-all"
                        >
                            Retry
                        </button>
                    </div>
                ) : questions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 border border-cyan-900/30 bg-cyan-900/5">
                        <Terminal size={40} className="text-cyan-500/50 mb-4" />
                        <p className="text-cyan-500/60 text-sm uppercase tracking-widest mb-2">No Active Protocols</p>
                        <p className="text-cyan-200/40 text-xs">Challenges will appear here when available.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {questions.map((q, idx) => (
                            <div key={q.id} style={{ animation: `fadeInUp 0.5s ease-out ${idx * 0.1}s backwards` }}>
                                <ChallengeCard question={q} onStart={handleStartChallenge} />
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer Navigation */}
                <div className="mt-16 flex justify-center">
                    <button
                        onClick={() => navigate('/')}
                        className="text-cyan-500/50 hover:text-cyan-400 text-xs uppercase tracking-widest flex items-center gap-2 transition-colors"
                    >
                        <ChevronLeft size={14} /> Return to Mainframe
                    </button>
                </div>

            </main>

            {/* Animation Styles Inline */}
            <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .cursor-wait {
          cursor: wait;
        }
      `}</style>
        </div>
    );
}
