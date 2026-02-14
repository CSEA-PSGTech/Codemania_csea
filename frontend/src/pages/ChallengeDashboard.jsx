import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Terminal, Code, Clock, Play, User,
    Cpu, Zap, Shield, ChevronLeft, AlertTriangle, Loader, Lock, CheckCircle
} from 'lucide-react';
import API from '../config/api';

// --- CSS-ONLY BACKGROUND (zero JS, zero bundle cost) ---
const CyberBackground = () => (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Animated gradient base */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/30 via-black to-black" />
        {/* Grid lines */}
        <div className="absolute inset-0 opacity-[0.07]" style={{
            backgroundImage: 'linear-gradient(rgba(34,211,238,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.4) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            transform: 'perspective(500px) rotateX(60deg)',
            transformOrigin: 'center top',
            top: '40%'
        }} />
        {/* Floating particles via CSS */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(1px 1px at 20% 30%, rgba(34,211,238,0.4) 0%, transparent 100%), radial-gradient(1px 1px at 40% 70%, rgba(34,211,238,0.3) 0%, transparent 100%), radial-gradient(1px 1px at 60% 20%, rgba(34,211,238,0.5) 0%, transparent 100%), radial-gradient(1px 1px at 80% 50%, rgba(34,211,238,0.3) 0%, transparent 100%), radial-gradient(1.5px 1.5px at 15% 80%, rgba(34,211,238,0.4) 0%, transparent 100%), radial-gradient(1.5px 1.5px at 50% 50%, rgba(34,211,238,0.3) 0%, transparent 100%), radial-gradient(1px 1px at 70% 85%, rgba(34,211,238,0.4) 0%, transparent 100%), radial-gradient(1px 1px at 90% 15%, rgba(34,211,238,0.3) 0%, transparent 100%)' }} />
        {/* Ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-500/[0.03] rounded-full blur-[100px]" />
        {/* Top fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/80" />
    </div>
);

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
            className={`relative group bg-black/90 border transition-all duration-300 overflow-hidden flex flex-col h-full ${isSolved
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
                <h3 className={`text-xl font-bold font-mono transition-colors ${isSolved ? 'text-green-300' : 'text-white group-hover:text-cyan-300'
                    }`}>
                    {question.title}
                </h3>
            </div>

            {/* Card Body */}
            <div className="p-6 flex-1 relative z-10 flex flex-col">

                <div className="flex items-center justify-between pt-4 border-t border-cyan-900/30">
                    <div className="flex items-center gap-2 text-cyan-500/80 text-sm font-mono">
                        <Clock size={16} />
                        <span>Time Limit: {question.timeLimitPython || 1000}ms</span>
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
    const [questions, setQuestions] = useState([]);
    const [solvedQuestionIds, setSolvedQuestionIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentTeam, setCurrentTeam] = useState(null);
    const [roundActive, setRoundActive] = useState(null);
    const navigate = useNavigate();

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

                // Check round status first
                const roundRes = await API.get('/round-status');
                if (!roundRes.data?.round1Active) {
                    setRoundActive(false);
                    setLoading(false);
                    return;
                }
                setRoundActive(true);

                // Fetch questions, solved status, and current team in parallel
                const [questionsRes, solvedRes, meRes] = await Promise.all([
                    API.get('/questions', { headers }),
                    API.get('/submissions/solved', { headers }),
                    API.get('/auth/me', { headers })
                ]);

                const solved = solvedRes.data.solvedQuestionIds || [];
                setSolvedQuestionIds(solved);
                setCurrentTeam(meRes.data);

                // Map API response to match card structure
                const mappedQuestions = questionsRes.data.map(q => ({
                    id: q._id,
                    title: q.title,
                    description: q.description,
                    points: q.currentPoints,
                    totalPoints: q.totalPoints,
                    teamsSolved: q.noOfTeamsSolved,
                    difficulty: q.tag || 'Medium',
                    category: q.tag || 'Code Optimization',
                    timeLimitPython: q.timeLimitPython || 1000,
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

            {/* BACKGROUND LAYERS - Pure CSS, no Three.js */}
            <CyberBackground />

            {/* HEADER */}
            <header className={`relative z-20 border-b border-cyan-900/30 bg-black/95 sticky top-0`}>
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
                        <div className="w-10 h-10 border border-cyan-500/30 bg-cyan-900/10 flex items-center justify-center text-cyan-400">
                            <User size={20} />
                        </div>
                    </div>

                </div>
            </header>



            {/* MAIN CONTENT */}
            {roundActive === false ? (
                <div className="relative z-10 flex flex-col items-center justify-center min-h-[60vh] px-6">
                    <div className="border border-red-500/30 bg-red-900/10 p-12 max-w-lg text-center">
                        <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-3">
                            ROUND 1 NOT ACTIVE
                        </h2>
                        <p className="text-cyan-200/60 text-sm leading-relaxed mb-6">
                            The admin has not opened the portal yet. Please wait for instructions from the organizers.
                        </p>
                        <div className="flex items-center justify-center gap-2 text-red-400 text-xs uppercase tracking-widest">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            Standing by...
                        </div>
                    </div>
                </div>
            ) : (
                <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">

                    {/* Intro Section */}
                    <div className="mb-12 border-l-2 border-cyan-500 pl-6">
                        <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">
                            Optimization <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-600">Challenges</span>
                        </h2>
                        <p className="text-cyan-200/60 max-w-2xl text-sm leading-relaxed">
                            Transform inefficient O(n²) algorithms into optimized solutions.
                            Reduce time complexity and beat the clock.
                            <span className="text-cyan-400"> Every millisecond counts.</span>
                        </p>
                    </div>

                    {/* Stats Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                        {[
                            { label: 'Active Nodes', val: loading ? '...' : questions.length.toString(), icon: Cpu },
                            { label: 'Total Points', val: loading ? '...' : questions.reduce((sum, q) => sum + q.points, 0).toString(), icon: Zap },
                            { label: 'Your Points', val: loading ? '...' : (currentTeam?.totalPoints || 0).toString(), icon: Shield },
                            { label: 'Solved', val: loading ? '...' : solvedQuestionIds.length.toString(), icon: CheckCircle },
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="bg-black/90 border border-cyan-900/30 p-6 animate-pulse">
                                    <div className="flex justify-between mb-4">
                                        <div className="h-5 w-16 bg-cyan-900/30 rounded" />
                                        <div className="h-5 w-20 bg-cyan-900/30 rounded" />
                                    </div>
                                    <div className="h-6 w-3/4 bg-cyan-900/20 rounded mb-6" />
                                    <div className="h-3 w-20 bg-cyan-900/20 rounded mb-3" />
                                    <div className="space-y-2 mb-6">
                                        <div className="h-3 w-full bg-cyan-900/10 rounded" />
                                        <div className="h-3 w-5/6 bg-cyan-900/10 rounded" />
                                        <div className="h-3 w-2/3 bg-cyan-900/10 rounded" />
                                    </div>
                                    <div className="flex justify-between pt-4 border-t border-cyan-900/30">
                                        <div className="h-5 w-12 bg-cyan-900/20 rounded" />
                                        <div className="h-8 w-28 bg-cyan-900/20 rounded" />
                                    </div>
                                </div>
                            ))}
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
            )}

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
