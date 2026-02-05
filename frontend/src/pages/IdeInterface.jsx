import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import {
    Terminal, Play, Cpu, ChevronLeft, ChevronDown,
    Settings, Maximize2, RotateCcw, CheckCircle,
    AlertTriangle, X, FileCode, Copy, Clock, Code,
    Zap, Send, Wifi, WifiOff, Loader
} from 'lucide-react';
import apiClient, { API, EXECUTION_CONFIG } from '../config/api.js';

// Language configuration
const LANGUAGES = {
    python: { name: "Python", extension: ".py" },
    java: { name: "Java", extension: ".java" }
};

// --- 3D BACKGROUND COMPONENT (Matching CyberCore from ChallengeDashboard) ---
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
        const count = 1500;
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count * 3; i++) positions[i] = (Math.random() - 0.5) * 60;
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({
            size: 0.12,
            color: 0x22d3ee,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
        });
        const particles = new THREE.Points(geometry, material);
        scene.add(particles);

        // Grid Floor
        const gridHelper = new THREE.GridHelper(100, 50, 0x0891b2, 0x083344);
        gridHelper.position.y = -15;
        scene.add(gridHelper);

        const animate = () => {
            requestAnimationFrame(animate);
            particles.rotation.y += 0.0005;
            gridHelper.rotation.y -= 0.0005;
            const time = Date.now() * 0.001;
            particles.position.y = Math.sin(time * 0.3) * 1;
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

const TabButton = ({ active, label, onClick, icon: Icon }) => (
    <button
        onClick={onClick}
        className={`
      flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-t-2 transition-all duration-200
      ${active
                ? 'bg-black/80 border-cyan-500 text-cyan-400'
                : 'bg-cyan-900/5 border-transparent text-cyan-600/60 hover:text-cyan-400 hover:bg-cyan-900/20'}
    `}
    >
        {Icon && <Icon size={14} />}
        {label}
    </button>
);

const Badge = ({ type, text }) => {
    const styles = {
        easy: "bg-cyan-900/30 text-cyan-400 border-cyan-500/30",
        medium: "bg-yellow-900/30 text-yellow-400 border-yellow-500/30",
        hard: "bg-red-900/30 text-red-400 border-red-500/30",
        tag: "bg-gray-800/50 text-gray-400 border-gray-700"
    };
    return (
        <span className={`px-2.5 py-1 text-[10px] uppercase font-bold border rounded-sm ${styles[type.toLowerCase()] || styles.tag}`}>
            {text}
        </span>
    );
};

const LanguageDropdown = ({ activeLang, onSelect, languages }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 text-xs font-bold text-cyan-400 bg-cyan-900/20 px-3 py-1.5 border border-cyan-500/30 hover:border-cyan-400 transition-colors"
            >
                {languages[activeLang]?.name || activeLang} <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute top-full left-0 mt-1 bg-black border border-cyan-500/30 z-50 min-w-[120px]">
                    {Object.entries(languages).map(([key, lang]) => (
                        <button
                            key={key}
                            onClick={() => { onSelect(key); setOpen(false); }}
                            className={`w-full px-3 py-2 text-xs text-left font-mono transition-colors
                ${key === activeLang
                                    ? 'bg-cyan-500 text-black'
                                    : 'text-cyan-400 hover:bg-cyan-900/30'}`}
                        >
                            {lang.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- MAIN IDE COMPONENT ---
export default function IdeInterface() {
    const { problemId } = useParams();
    const navigate = useNavigate();

    const [problem, setProblem] = useState(null);
    const [code, setCode] = useState('');
    const [activeTab, setActiveTab] = useState('description');
    const [consoleOpen, setConsoleOpen] = useState(true);
    const [isRunning, setIsRunning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [output, setOutput] = useState(null);
    const [activeLang, setActiveLang] = useState('python');
    const [timer, setTimer] = useState(0);
    const [copied, setCopied] = useState(false);
    const [serverOnline, setServerOnline] = useState(null); // null = checking, true = online, false = offline

    // Check server health on mount
    useEffect(() => {
        const checkServer = async () => {
            try {
                const response = await fetch(API.health, { method: 'GET' });
                if (response.ok) {
                    setServerOnline(true);
                } else {
                    setServerOnline(false);
                }
            } catch {
                setServerOnline(false);
            }
        };
        checkServer();
        // Check every 30 seconds
        const interval = setInterval(checkServer, 30000);
        return () => clearInterval(interval);
    }, []);

    // Load problem data from API
    useEffect(() => {
        const fetchProblem = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    navigate('/login');
                    return;
                }

                const response = await apiClient.get(`/questions/${problemId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const data = response.data;
                
                // Map API response to expected problem structure
                const mappedProblem = {
                    id: data._id,
                    title: data.title,
                    description: data.descriptionWithConstraints,
                    nonOptimizedCode: data.nonOptimizedCode,
                    points: data.currentPoints,
                    totalPoints: data.totalPoints,
                    teamsSolved: data.noOfTeamsSolved,
                    difficulty: data.totalPoints <= 100 ? 'Easy' : data.totalPoints <= 200 ? 'Medium' : 'Hard',
                    category: 'Code Optimization',
                    timeLimit: `${data.timeLimit || 2000}ms`,
                    memoryLimit: `${data.memoryLimit || 256}MB`,
                    // Map sample test cases from API
                    sampleTestCases: data.sampleTestCases || [],
                    testCases: (data.sampleTestCases || []).map(tc => ({
                        input: tc.input,
                        expectedOutput: tc.output,
                        hidden: tc.hidden || false
                    })),
                    // These may not exist in backend, provide defaults
                    examples: [],
                    constraints: [],
                    // For code optimization, the starter code is the non-optimized code
                    starterCode: {
                        python: data.nonOptimizedCode || '# Write your optimized code here',
                        java: '// Write your optimized Java code here',
                        c: '// Write your optimized C code here'
                    }
                };

                setProblem(mappedProblem);
                setCode(mappedProblem.starterCode[activeLang] || '');
            } catch (err) {
                console.error('Error fetching problem:', err);
                if (err.response?.status === 401) {
                    localStorage.removeItem('token');
                    navigate('/login');
                } else if (err.response?.status === 404) {
                    navigate('/challenges');
                }
            }
        };

        fetchProblem();
    }, [problemId, navigate]);

    // Update code when language changes
    useEffect(() => {
        if (problem) {
            setCode(problem.starterCode[activeLang] || '');
        }
    }, [activeLang, problem]);

    // Timer effect
    useEffect(() => {
        const interval = setInterval(() => {
            setTimer(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleRun = async () => {
        setIsRunning(true);
        setConsoleOpen(true);
        setOutput(null);

        // Call backend run endpoint (which proxies to execution server with secret)
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            // Use sample test cases for "Run" (these are the visible ones from API)
            const testCasesToRun = (problem.sampleTestCases || []).map(tc => ({
                input: tc.input,
                expectedOutput: tc.output
            }));

            // Check if there are test cases
            if (testCasesToRun.length === 0) {
                setIsRunning(false);
                setOutput({
                    status: "No Test Cases",
                    passed: false,
                    error: "No sample test cases available for this problem.\nAdmin needs to add test cases with 'hidden: false' for users to test their code."
                });
                return;
            }

            console.log('Running with', testCasesToRun.length, 'test cases');

            const response = await apiClient.post('/submissions/run', {
                code,
                language: activeLang,
                testCases: testCasesToRun,
                timeLimit: EXECUTION_CONFIG.defaultTimeLimit
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const result = response.data;
            setIsRunning(false);

            setOutput({
                status: result.verdict === 'AC' ? 'All Tests Passed!' :
                    result.verdict === 'WA' ? 'Wrong Answer' :
                        result.verdict === 'TLE' ? 'Time Limit Exceeded' :
                            result.verdict === 'CE' ? 'Compilation Error' :
                                result.verdict === 'RE' ? 'Runtime Error' : 'Error',
                passed: result.verdict === 'AC',
                results: result.results,
                error: result.error,
                passedCount: result.passedTestCases,
                totalCount: result.totalTestCases
            });
        } catch (err) {
            setIsRunning(false);
            console.error('Run error:', err);
            setOutput({
                status: "Error",
                passed: false,
                error: err.response?.data?.message || err.response?.data?.error || 'Execution failed. Please try again.',
                details: "Make sure the backend and execution servers are running."
            });
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setConsoleOpen(true);
        setOutput(null);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            // Submit to backend (which handles execution and scoring)
            const response = await apiClient.post('/submissions', {
                questionId: problem.id,
                code,
                language: activeLang
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const result = response.data;
            const passed = result.submission?.isCorrect || false;
            
            setOutput({
                status: passed ? 'Accepted' :
                    result.submission?.status === 'WA' ? 'Wrong Answer' :
                        result.submission?.status === 'TLE' ? 'Time Limit Exceeded' :
                            result.submission?.status === 'CE' ? 'Compilation Error' :
                                result.submission?.status === 'RE' ? 'Runtime Error' : 'Error',
                runtime: result.submission?.executionTime ? `${result.submission.executionTime}ms` : 'N/A',
                memory: 'N/A',
                passed,
                passedCount: result.submission?.passedTestCases || 0,
                totalCount: result.submission?.totalTestCases || 0,
                pointsAwarded: result.pointsAwarded || 0,
                isSubmission: true
            });
        } catch (err) {
            console.error('Submission error:', err);
            setOutput({
                status: "Error",
                passed: false,
                error: err.response?.data?.message || 'Submission failed. Please try again.',
                isSubmission: true
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        if (problem) {
            setCode(problem.starterCode[activeLang] || '');
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!problem) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-cyan-400 font-mono animate-pulse">Loading problem...</div>
            </div>
        );
    }

    const lineCount = code.split('\n').length;

    return (
        <div className="flex flex-col h-screen bg-black text-white font-mono overflow-hidden selection:bg-cyan-500 selection:text-black">

            {/* BACKGROUND */}
            <CyberCore />
            <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-t from-black via-black/50 to-transparent" />

            {/* --- GLOBAL STYLES --- */}
            <style>{`
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: #0891b2; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #22d3ee; }
        .grid-bg {
          background-image: linear-gradient(rgba(8, 145, 178, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(8, 145, 178, 0.05) 1px, transparent 1px);
          background-size: 20px 20px;
        }
        @keyframes scanline {
          0% { background-position: 0% 0%; }
          100% { background-position: 0% 100%; }
        }
        .scanlines {
          background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1));
          background-size: 100% 4px;
          animation: scanline 0.2s linear infinite;
        }
      `}</style>

            {/* --- HEADER --- */}
            <header className="h-14 border-b border-cyan-900/30 bg-black/90 backdrop-blur-md flex items-center justify-between px-4 shrink-0 relative z-20">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/challenges')}
                        className="flex items-center gap-2 text-cyan-500/60 hover:text-cyan-400 transition-colors text-sm"
                    >
                        <ChevronLeft size={18} />
                        <span className="hidden md:inline uppercase text-xs tracking-widest">Back</span>
                    </button>

                    <div className="h-6 w-px bg-cyan-900/50"></div>

                    <div className="flex items-center gap-2 text-cyan-400">
                        <Terminal size={18} />
                        <span className="font-bold tracking-widest text-base">CODEMANIA</span>
                    </div>

                    <div className="h-6 w-px bg-cyan-900/50 hidden md:block"></div>

                    <div className="hidden md:flex items-center gap-3 text-sm text-cyan-100/80">
                        {/* x`x` */}
                        <span>{problem.title}</span>
                        <Badge type={problem.difficulty} text={problem.difficulty} />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden lg:flex items-center gap-6 mr-4">
                        <div className="flex items-center gap-2 text-xs text-cyan-500/60">
                            <Clock size={14} /> <span className="font-mono">{formatTime(timer)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-cyan-500/60">
                            <Zap size={14} /> <span>{problem.points} PTS</span>
                        </div>
                        <div className={`flex items-center gap-2 text-xs ${serverOnline === true ? 'text-cyan-400' : serverOnline === false ? 'text-red-400' : 'text-yellow-400'}`}>
                            {serverOnline === true ? <Wifi size={14} /> : serverOnline === false ? <WifiOff size={14} /> : <Cpu size={14} className="animate-pulse" />}
                            <span>{serverOnline === true ? 'Server Online' : serverOnline === false ? 'Offline' : 'Checking...'}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleRun}
                            disabled={isRunning || isSubmitting}
                            className={`px-4 py-1.5 bg-cyan-900/20 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider 
                hover:bg-cyan-500 hover:text-black transition-all flex items-center gap-2
                ${(isRunning || isSubmitting) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isRunning ? (
                                <>
                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    Running...
                                </>
                            ) : (
                                <>
                                    <Play size={12} /> Run Code
                                </>
                            )}
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isRunning || isSubmitting}
                            className={`px-4 py-1.5 bg-cyan-600 text-black border border-cyan-500 text-xs font-bold uppercase tracking-wider 
                hover:bg-cyan-400 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(34,211,238,0.3)]
                ${(isRunning || isSubmitting) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    Judging...
                                </>
                            ) : (
                                <>
                                    <Send size={12} /> Submit
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            {/* --- MAIN WORKSPACE --- */}
            <div className="flex-1 flex overflow-hidden relative z-10 grid-bg">

                {/* --- LEFT PANEL: PROBLEM DESCRIPTION --- */}
                <div className="w-1/2 flex flex-col border-r border-cyan-900/30 bg-black/80 backdrop-blur-sm">
                    {/* Tabs */}
                    <div className="h-11 border-b border-cyan-900/30 flex items-end bg-black/50 px-2 gap-1">
                        <TabButton
                            active={activeTab === 'description'}
                            label="Description"
                            onClick={() => setActiveTab('description')}
                            icon={FileCode}
                        />
                        <TabButton
                            active={activeTab === 'submissions'}
                            label="Test Cases"
                            onClick={() => setActiveTab('submissions')}
                            icon={CheckCircle}
                        />
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {activeTab === 'description' ? (
                            <>
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h1 className="text-2xl font-bold text-white">  {problem.title}</h1>
                                        <div className="flex gap-2">
                                            <Badge type={problem.difficulty} text={problem.difficulty} />
                                            <Badge type="tag" text={problem.category} />
                                        </div>
                                    </div>

                                    <div className="flex gap-4 text-xs text-cyan-500/60 mb-4">
                                        <span className="flex items-center gap-1"><Clock size={12} /> {problem.timeLimit}</span>
                                        <span className="flex items-center gap-1"><Cpu size={12} /> {problem.memoryLimit}</span>
                                    </div>

                                    <div
                                        className="text-sm text-cyan-100/80 leading-relaxed space-y-4 prose prose-invert prose-cyan max-w-none"
                                        dangerouslySetInnerHTML={{ __html: problem.description }}
                                    />
                                </div>

                                {/* Examples */}
                                {problem.examples && problem.examples.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-cyan-500 uppercase tracking-widest flex items-center gap-2">
                                        <Code size={14} /> Examples
                                    </h3>
                                    {problem.examples.map((ex, idx) => (
                                        <div key={idx} className="bg-cyan-900/5 border border-cyan-900/30 p-4 rounded-sm">
                                            <h4 className="text-xs font-bold text-cyan-400 uppercase mb-3">Example {idx + 1}</h4>
                                            <div className="space-y-2 text-sm font-mono">
                                                <div>
                                                    <span className="text-cyan-700 select-none">Input: </span>
                                                    <span className="text-cyan-100">{ex.input}</span>
                                                </div>
                                                <div>
                                                    <span className="text-cyan-700 select-none">Output: </span>
                                                    <span className="text-cyan-100">{ex.output}</span>
                                                </div>
                                                {ex.explanation && (
                                                    <div className="text-cyan-500/60 text-xs italic mt-2 pt-2 border-t border-cyan-900/20">
                                                        💡 {ex.explanation}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                )}

                                {/* Constraints */}
                                {problem.constraints && problem.constraints.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-bold text-cyan-500 uppercase mb-3 flex items-center gap-2 tracking-widest">
                                        <AlertTriangle size={12} /> Constraints
                                    </h3>
                                    <ul className="space-y-1.5 text-sm text-cyan-100/60">
                                        {problem.constraints.map((c, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <span className="text-cyan-500 mt-1">•</span>
                                                <code className="text-cyan-300/80">{c}</code>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                )}

                                {/* Sample Test Cases in Description Tab */}
                                {(problem.sampleTestCases || []).length > 0 && (
                                <div className="mt-6">
                                    <h3 className="text-xs font-bold text-cyan-500 uppercase mb-3 flex items-center gap-2 tracking-widest">
                                        <CheckCircle size={12} /> Sample Test Cases
                                    </h3>
                                    <div className="space-y-3">
                                        {(problem.sampleTestCases || []).map((tc, idx) => (
                                            <div key={idx} className="bg-cyan-900/10 border border-cyan-900/30 p-3 rounded">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-bold text-cyan-400">Sample #{idx + 1}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                                                    <div>
                                                        <span className="text-cyan-600 text-[10px] uppercase block mb-1">Input</span>
                                                        <pre className="text-cyan-100 bg-black/50 p-2 rounded overflow-x-auto whitespace-pre-wrap">{tc.input}</pre>
                                                    </div>
                                                    <div>
                                                        <span className="text-cyan-600 text-[10px] uppercase block mb-1">Output</span>
                                                        <pre className="text-cyan-100 bg-black/50 p-2 rounded overflow-x-auto whitespace-pre-wrap">{tc.output}</pre>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                )}
                            </>
                        ) : (
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-cyan-500 uppercase tracking-widest flex items-center gap-2">
                                    <CheckCircle size={14} /> Sample Test Cases
                                </h3>
                                <p className="text-xs text-cyan-500/60 mb-4">
                                    These are sample test cases you can use to verify your solution. Hidden test cases (with larger inputs) will be used during submission to check time complexity.
                                </p>
                                {(problem.sampleTestCases || []).map((tc, idx) => (
                                    <div key={idx} className="bg-cyan-900/5 border border-cyan-900/30 p-4 rounded-sm">
                                        <h4 className="text-xs font-bold text-cyan-400 uppercase mb-3">Sample #{idx + 1}</h4>
                                        <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                                            <div>
                                                <span className="text-cyan-700 select-none block mb-1 text-xs">Input:</span>
                                                <pre className="text-cyan-100 bg-black/50 p-2 rounded overflow-x-auto whitespace-pre-wrap text-xs">{tc.input}</pre>
                                            </div>
                                            <div>
                                                <span className="text-cyan-700 select-none block mb-1 text-xs">Expected Output:</span>
                                                <pre className="text-cyan-100 bg-black/50 p-2 rounded whitespace-pre-wrap text-xs">{tc.output}</pre>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(problem.sampleTestCases || []).length === 0 && (
                                    <div className="text-cyan-500/50 text-sm italic border border-cyan-900/30 p-4 text-center">
                                        No sample test cases available for this problem.
                                    </div>
                                )}
                                <div className="text-xs text-yellow-500/60 italic flex items-center gap-2 border-t border-cyan-900/30 pt-3 mt-4">
                                    <AlertTriangle size={12} />
                                    Additional hidden test cases with larger inputs will be used during submission
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- RIGHT PANEL: EDITOR & CONSOLE --- */}
                <div className="w-1/2 flex flex-col bg-black/90">

                    {/* Editor Toolbar */}
                    <div className="h-11 border-b border-cyan-900/30 flex items-center justify-between px-4 bg-black/50">
                        <div className="flex items-center gap-3">
                            <span className="text-cyan-600 text-xs font-bold uppercase">Language:</span>
                            <LanguageDropdown
                                activeLang={activeLang}
                                onSelect={setActiveLang}
                                languages={LANGUAGES}
                            />
                        </div>
                        <div className="flex items-center gap-3 text-cyan-600">
                            <button onClick={handleReset} title="Reset Code" className="hover:text-cyan-400 transition-colors p-1">
                                <RotateCcw size={14} />
                            </button>
                            <button onClick={handleCopy} title="Copy Code" className="hover:text-cyan-400 transition-colors p-1 relative">
                                {copied ? <CheckCircle size={14} className="text-cyan-400" /> : <Copy size={14} />}
                            </button>
                            <button title="Fullscreen" className="hover:text-cyan-400 transition-colors p-1">
                                <Maximize2 size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Code Editor Area */}
                    <div className="flex-1 flex relative font-mono text-sm overflow-hidden">
                        {/* Line Numbers */}
                        <div className="w-12 bg-black border-r border-cyan-900/20 flex flex-col items-end py-4 pr-3 text-cyan-900 select-none overflow-hidden text-xs">
                            {Array.from({ length: Math.max(lineCount, 30) }).map((_, i) => (
                                <div key={i} className="leading-6">{i + 1}</div>
                            ))}
                        </div>

                        {/* Textarea */}
                        <textarea
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="flex-1 bg-transparent text-cyan-100 p-4 resize-none focus:outline-none leading-6 text-sm"
                            spellCheck="false"
                            style={{ tabSize: 4 }}
                        />
                    </div>

                    {/* Console / Output Panel */}
                    <div className={`border-t border-cyan-900/30 bg-black flex flex-col transition-all duration-300 ${consoleOpen ? 'h-1/3 min-h-[200px]' : 'h-10'}`}>

                        {/* Console Header */}
                        <div
                            className="h-10 flex items-center justify-between px-4 bg-cyan-900/5 cursor-pointer hover:bg-cyan-900/10 border-b border-cyan-900/20 shrink-0"
                            onClick={() => setConsoleOpen(!consoleOpen)}
                        >
                            <div className="flex items-center gap-2 text-xs font-bold text-cyan-500 uppercase tracking-widest">
                                <Terminal size={14} /> System Console
                            </div>
                            <ChevronDown size={14} className={`text-cyan-600 transition-transform ${consoleOpen ? '' : 'rotate-180'}`} />
                        </div>

                        {/* Console Body */}
                        {consoleOpen && (
                            <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
                                {(isRunning || isSubmitting) ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-3 text-cyan-500/50 animate-pulse">
                                        <Cpu size={32} />
                                        <span className="text-xs uppercase tracking-widest">
                                            {isSubmitting ? 'Judging All Test Cases...' : 'Compiling & Executing...'}
                                        </span>
                                    </div>
                                ) : output ? (
                                    <div className="space-y-4 animate-in fade-in duration-300">
                                        <div className={`flex items-center gap-2 text-lg font-bold ${output.passed ? 'text-cyan-400' : 'text-red-500'}`}>
                                            {output.passed ? <CheckCircle size={20} /> : <X size={20} />}
                                            {output.status}
                                            {output.mock && <span className="text-xs text-yellow-500/60 font-normal">(Simulated)</span>}
                                        </div>

                                        {output.isSubmission && output.passed && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-cyan-900/10 p-3 rounded border border-cyan-500/20">
                                                    <span className="text-xs text-cyan-600 uppercase block mb-1">Runtime</span>
                                                    <span className="text-cyan-200 font-bold">{output.runtime}</span>
                                                    <span className="text-xs text-cyan-500/40 ml-2">Beats 84%</span>
                                                </div>
                                                <div className="bg-cyan-900/10 p-3 rounded border border-cyan-500/20">
                                                    <span className="text-xs text-cyan-600 uppercase block mb-1">Memory</span>
                                                    <span className="text-cyan-200 font-bold">{output.memory}</span>
                                                </div>
                                            </div>
                                        )}

                                        {output.passedCount !== undefined && (
                                            <div className="text-sm text-cyan-400">
                                                Test Cases: {output.passedCount}/{output.totalCount} passed
                                            </div>
                                        )}

                                        {output.error && (
                                            <div className="bg-red-900/20 border border-red-500/30 p-3 rounded text-red-400 text-sm">
                                                <span className="text-xs text-red-600 uppercase block mb-2">Error</span>
                                                <pre className="whitespace-pre-wrap">{output.error}</pre>
                                            </div>
                                        )}

                                        {output.results && output.results.length > 0 && (
                                            <div className="space-y-2">
                                                <div className="text-xs text-cyan-500 uppercase tracking-wider mb-2">Test Case Results:</div>
                                                {output.results.map((r, idx) => (
                                                    <div key={idx} className={`p-3 rounded border text-xs ${r.verdict === 'AC'
                                                        ? 'bg-cyan-900/10 border-cyan-500/30 text-cyan-400'
                                                        : 'bg-red-900/10 border-red-500/30 text-red-400'
                                                        }`}>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`w-2 h-2 rounded-full ${r.verdict === 'AC' ? 'bg-cyan-400' : 'bg-red-400'}`}></span>
                                                                <span className="font-bold">
                                                                    {r.hidden ? `Hidden Test #${r.testCase}` : `Sample Test #${r.testCase}`}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.verdict === 'AC' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-red-500/20 text-red-300'}`}>
                                                                    {r.verdict === 'AC' ? 'PASSED' : r.verdict}
                                                                </span>
                                                                {r.time && <span className="text-cyan-500/60">⏱ {r.time}ms</span>}
                                                            </div>
                                                        </div>
                                                        {r.verdict === 'WA' && !r.hidden && (
                                                            <div className="mt-2 pt-2 border-t border-red-500/20 space-y-1">
                                                                {r.expected && (
                                                                    <div className="flex gap-2">
                                                                        <span className="text-red-500/60 w-16">Expected:</span>
                                                                        <code className="text-cyan-300 bg-black/50 px-2 py-0.5 rounded">{r.expected}</code>
                                                                    </div>
                                                                )}
                                                                {r.actual && (
                                                                    <div className="flex gap-2">
                                                                        <span className="text-red-500/60 w-16">Got:</span>
                                                                        <code className="text-red-300 bg-black/50 px-2 py-0.5 rounded">{r.actual}</code>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        {r.verdict === 'TLE' && (
                                                            <div className="mt-2 text-yellow-400/80 text-[10px]">
                                                                ⚡ Your code exceeded the time limit. Try optimizing your algorithm!
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {output.details && (
                                            <div className="bg-black border border-cyan-900/30 p-3 rounded text-cyan-100/80">
                                                <span className="text-xs text-cyan-600 uppercase block mb-2">Output Log</span>
                                                <pre className="whitespace-pre-wrap text-sm">{output.details}</pre>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-cyan-900 text-xs uppercase tracking-widest">
                                        <Terminal size={24} className="mb-2 opacity-50" />
                                        Run code to see output
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
