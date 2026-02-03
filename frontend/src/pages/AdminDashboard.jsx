import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Users, Code, Activity, Trash2, RotateCcw, Save, X, Plus, AlertTriangle } from 'lucide-react';

// --- MOCK DATA GENERATORS (To simulate your Backend) ---
const generateMockStats = () => ({
    totalTeams: 42,
    totalQuestions: 8,
    totalSubmissions: 156,
    acceptedSubmissions: 45,
    acceptanceRate: "28.85%",
    teamsCompletedRound1: 3
});

const generateMockQuestions = () => [
    { _id: '1', title: 'Binary Blast', totalPoints: 100, currentPoints: 100, descriptionWithConstraints: 'Reverse a binary string...', nonOptimizedCode: 'function solve() {...}', testcases: [] },
    { _id: '2', title: 'Matrix Glitch', totalPoints: 200, currentPoints: 180, descriptionWithConstraints: 'Find the determinant...', nonOptimizedCode: '...', testcases: [] },
];

const generateMockTeams = () => [
    { _id: 't1', teamName: 'NullPointers', solvedCount: 2, totalPoints: 300, round1: { status: 'IN_PROGRESS' } },
    { _id: 't2', teamName: 'RecursionRebels', solvedCount: 5, totalPoints: 850, round1: { status: 'COMPLETED' } },
    { _id: 't3', teamName: 'SyntaxSinners', solvedCount: 0, totalPoints: 0, round1: { status: 'NOT_STARTED' } },
];

const generateMockSubmissions = () => [
    { _id: 's1', teamId: { teamName: 'NullPointers' }, questionId: { title: 'Binary Blast' }, status: 'AC', submissionTime: new Date().toISOString() },
    { _id: 's2', teamId: { teamName: 'SyntaxSinners' }, questionId: { title: 'Matrix Glitch' }, status: 'WA', submissionTime: new Date(Date.now() - 100000).toISOString() },
];

// --- MAIN COMPONENT ---
export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('DASHBOARD');

    // State mirroring backend data
    const [stats, setStats] = useState(generateMockStats());
    const [questions, setQuestions] = useState(generateMockQuestions());
    const [teams, setTeams] = useState(generateMockTeams());
    const [submissions, setSubmissions] = useState(generateMockSubmissions());

    // Loading/Glitch State
    const [loading, setLoading] = useState(false);
    const [glitch, setGlitch] = useState(false);

    // --- ACTIONS (Simulating API Calls) ---

    const handleCreateQuestion = (newQ) => {
        // Simulates exports.createQuestion
        const qWithId = { ...newQ, _id: Math.random().toString(36).substr(2, 9), currentPoints: newQ.totalPoints };
        setQuestions([...questions, qWithId]);
        triggerGlitch();
    };

    const handleDeleteQuestion = (id) => {
        // Simulates exports.deleteQuestion
        setQuestions(questions.filter(q => q._id !== id));
        triggerGlitch();
    };

    const handleResetTeam = (id) => {
        // Simulates exports.resetTeam logic
        setTeams(teams.map(t => {
            if (t._id === id) {
                return {
                    ...t,
                    solvedCount: 0,
                    totalPoints: 0,
                    round1: { ...t.round1, status: 'NOT_STARTED', solvedCount: 0, round1Points: 0 }
                };
            }
            return t;
        }));
        triggerGlitch();
    };

    const handleDeleteTeam = (id) => {
        // Simulates exports.deleteTeam
        setTeams(teams.filter(t => t._id !== id));
        triggerGlitch();
    };

    // Visual Effect Trigger
    const triggerGlitch = () => {
        setGlitch(true);
        setTimeout(() => setGlitch(false), 300);
    };

    return (
        <div className={`min-h-screen bg-black text-cyan-400 font-mono overflow-x-hidden relative selection:bg-cyan-900 selection:text-white ${glitch ? 'animate-pulse' : ''}`}>
            {/* BACKGROUND EFFECTS */}
            <div className="fixed inset-0 z-0 opacity-20 pointer-events-none"
                style={{
                    backgroundImage: 'linear-gradient(transparent 95%, #22d3ee 50%), linear-gradient(90deg, transparent 95%, #22d3ee 50%)',
                    backgroundSize: '40px 40px',
                    transform: 'perspective(500px) rotateX(20deg) scale(1.5)'
                }}>
            </div>
            <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,_transparent_0%,_#000000_120%)]"></div>

            {/* SCANLINES */}
            <div className="fixed inset-0 z-50 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(0,255,255,0.06),rgba(0,200,255,0.02),rgba(0,100,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>

            {/* HEADER */}
            <header className="relative z-10 border-b border-cyan-900 bg-black/80 backdrop-blur-sm p-4 flex justify-between items-center shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-cyan-400 animate-pulse rounded-full shadow-[0_0_10px_#22d3ee]"></div>
                    <h1 className="text-2xl font-bold tracking-widest text-cyan-400 uppercase glitch-text" data-text="CODEMANIA_ADMIN">
                        CODEMANIA_<span className="text-white">ADMIN</span>
                    </h1>
                </div>
                <div className="text-xs text-cyan-700 animate-pulse">SYSTEM STATUS: ONLINE</div>
            </header>

            {/* MAIN LAYOUT */}
            <div className="relative z-10 flex min-h-[calc(100vh-64px)]">
                {/* SIDEBAR NAV */}
                <nav className="w-20 md:w-64 border-r border-cyan-900/50 bg-black/40 flex flex-col p-4 gap-4">
                    <NavButton active={activeTab === 'DASHBOARD'} onClick={() => setActiveTab('DASHBOARD')} icon={<Activity />} label="SYSTEM STATS" />
                    <NavButton active={activeTab === 'QUESTIONS'} onClick={() => setActiveTab('QUESTIONS')} icon={<Code />} label="CHALLENGES" />
                    <NavButton active={activeTab === 'TEAMS'} onClick={() => setActiveTab('TEAMS')} icon={<Users />} label="PLAYER DATABASE" />
                    <NavButton active={activeTab === 'SUBMISSIONS'} onClick={() => setActiveTab('SUBMISSIONS')} icon={<Terminal />} label="LIVE LOGS" />
                </nav>

                {/* CONTENT AREA */}
                <main className="flex-1 p-6 overflow-y-auto">
                    {activeTab === 'DASHBOARD' && <DashboardStats stats={stats} />}
                    {activeTab === 'QUESTIONS' && <QuestionManager questions={questions} onCreate={handleCreateQuestion} onDelete={handleDeleteQuestion} />}
                    {activeTab === 'TEAMS' && <TeamManager teams={teams} onReset={handleResetTeam} onDelete={handleDeleteTeam} />}
                    {activeTab === 'SUBMISSIONS' && <SubmissionLog submissions={submissions} />}
                </main>
            </div>
        </div>
    );
}

// --- SUB-COMPONENTS ---

const NavButton = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={`group flex items-center gap-4 p-3 w-full transition-all duration-200 border border-transparent
    ${active ? 'bg-cyan-900/20 border-cyan-500 text-white shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'hover:bg-cyan-900/10 hover:text-cyan-300 opacity-60 hover:opacity-100'}
    `}
    >
        <div className={`${active ? 'text-cyan-400' : ''}`}>{icon}</div>
        <span className="hidden md:block font-bold tracking-wider text-sm">{label}</span>
    </button>
);

const DashboardStats = ({ stats }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <StatCard label="TOTAL PLAYERS" value={stats.totalTeams} delay={0} />
        <StatCard label="ACTIVE CHALLENGES" value={stats.totalQuestions} delay={100} />
        <StatCard label="TOTAL SUBMISSIONS" value={stats.totalSubmissions} delay={200} />
        <StatCard label="ACCEPTANCE RATE" value={stats.acceptanceRate} delay={300} isText />

        <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-8 p-6 border border-cyan-900/50 bg-black/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
            <h3 className="text-xl text-white mb-4 flex items-center gap-2"><Terminal className="w-5 h-5" /> SYSTEM DIAGNOSTICS</h3>
            <div className="space-y-2 font-mono text-sm text-cyan-400/80">
                <p>&gt; Round 1 Completion: {stats.teamsCompletedRound1} Teams</p>
                <p>&gt; Server Uptime: 42h 12m 04s</p>
                <p>&gt; Memory Integrity: 98% [OPTIMAL]</p>
                <p className="animate-pulse">&gt; _Waiting for input...</p>
            </div>
        </div>
    </div>
);

const StatCard = ({ label, value, delay, isText }) => (
    <div
        className="p-6 border border-cyan-800/60 bg-gradient-to-b from-cyan-900/10 to-transparent hover:bg-cyan-900/20 transition-all group relative overflow-hidden"
        style={{ animationDelay: `${delay}ms` }}
    >
        <div className="absolute -right-4 -top-4 w-16 h-16 border-l border-b border-cyan-500/20 rotate-45 group-hover:border-cyan-400/50 transition-colors"></div>
        <h3 className="text-cyan-400 text-xs tracking-[0.2em] mb-2 uppercase">{label}</h3>
        <div className={`text-4xl font-bold ${isText ? 'text-cyan-300' : 'text-white'} drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]`}>
            {value}
        </div>
    </div>
);

const QuestionManager = ({ questions, onCreate, onDelete }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-cyan-900 pb-4">
                <h2 className="text-2xl text-white tracking-widest uppercase">Challenge Database</h2>
                <button
                    onClick={() => setIsFormOpen(true)}
                    className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold px-4 py-2 flex items-center gap-2 clip-path-polygon hover:shadow-[0_0_20px_rgba(34,211,238,0.6)] transition-all"
                    style={{ clipPath: 'polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)' }}
                >
                    <Plus size={18} /> ADD NEW CHALLENGE
                </button>
            </div>

            {isFormOpen && (
                <CreateQuestionForm onClose={() => setIsFormOpen(false)} onSubmit={onCreate} />
            )}

            <div className="grid grid-cols-1 gap-4">
                {questions.map((q) => (
                    <div key={q._id} className="border border-cyan-900/50 bg-black/40 p-4 flex justify-between items-center hover:border-cyan-500/50 transition-colors group">
                        <div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-cyan-600 border border-cyan-900 px-1">ID: {q._id}</span>
                                <h3 className="text-xl text-white font-bold">{q.title}</h3>
                            </div>
                            <p className="text-cyan-400/60 text-sm mt-1 truncate max-w-2xl">{q.descriptionWithConstraints}</p>
                            <div className="flex gap-4 mt-2 text-xs text-cyan-500 font-mono">
                                <span>PTS: {q.totalPoints}</span>
                                <span>CUR: {q.currentPoints}</span>
                            </div>
                        </div>
                        <div className="flex gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => onDelete(q._id)} className="p-2 hover:text-white hover:bg-cyan-600/20 rounded"><Trash2 size={18} /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const CreateQuestionForm = ({ onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        title: '',
        descriptionWithConstraints: '',
        nonOptimizedCode: '',
        totalPoints: 100,
        testcases: '[]' // Simplified as string for UI, would parse in real app
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({ ...formData, testcases: JSON.parse(formData.testcases || '[]') });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl border border-cyan-500 bg-black shadow-[0_0_50px_rgba(34,211,238,0.2)] relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500"></div>
                <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl text-white uppercase tracking-widest">Construct New Challenge</h3>
                        <button onClick={onClose}><X className="text-cyan-400 hover:text-white" /></button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs text-cyan-400 uppercase">Title</label>
                                <input
                                    required
                                    className="w-full bg-black border border-cyan-900 p-2 text-white focus:border-cyan-400 focus:outline-none focus:shadow-[0_0_10px_rgba(34,211,238,0.3)] transition-all"
                                    placeholder="Ex: Binary Search Break"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-cyan-400 uppercase">Total Points</label>
                                <input
                                    type="number"
                                    className="w-full bg-black border border-cyan-900 p-2 text-white focus:border-cyan-400 focus:outline-none"
                                    value={formData.totalPoints}
                                    onChange={e => setFormData({ ...formData, totalPoints: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-cyan-400 uppercase">Description & Constraints</label>
                            <textarea
                                className="w-full h-24 bg-black border border-cyan-900 p-2 text-white focus:border-cyan-400 focus:outline-none font-mono text-sm"
                                placeholder="Detailed problem statement..."
                                value={formData.descriptionWithConstraints}
                                onChange={e => setFormData({ ...formData, descriptionWithConstraints: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-cyan-400 uppercase">Non-Optimized Code (Starter)</label>
                            <textarea
                                className="w-full h-24 bg-black border border-cyan-900 p-2 text-gray-400 focus:border-cyan-400 focus:outline-none font-mono text-xs"
                                placeholder="// Paste starter code here..."
                                value={formData.nonOptimizedCode}
                                onChange={e => setFormData({ ...formData, nonOptimizedCode: e.target.value })}
                            />
                        </div>

                        <button type="submit" className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-black font-bold uppercase tracking-widest mt-4">
                            Compile & Upload
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

const TeamManager = ({ teams, onReset, onDelete }) => (
    <div className="space-y-4">
        <h2 className="text-2xl text-white tracking-widest uppercase mb-6 border-b border-cyan-900 pb-4">Registered Entities</h2>

        <div className="overflow-x-auto border border-cyan-900/50">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-cyan-900/20 text-cyan-400 text-xs uppercase tracking-wider">
                        <th className="p-4 border-b border-cyan-900">Entity Name</th>
                        <th className="p-4 border-b border-cyan-900 text-center">Solved</th>
                        <th className="p-4 border-b border-cyan-900 text-center">Score</th>
                        <th className="p-4 border-b border-cyan-900">Round 1 Status</th>
                        <th className="p-4 border-b border-cyan-900 text-right">Protocols</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-cyan-900/30">
                    {teams.map(team => (
                        <tr key={team._id} className="hover:bg-cyan-900/10 transition-colors group">
                            <td className="p-4 font-bold text-white font-mono">{team.teamName}</td>
                            <td className="p-4 text-center font-mono">{team.solvedCount}</td>
                            <td className="p-4 text-center text-white">{team.totalPoints}</td>
                            <td className="p-4">
                                <span className={`text-xs px-2 py-1 border ${team.round1.status === 'COMPLETED' ? 'border-green-500 text-green-500' :
                                    team.round1.status === 'IN_PROGRESS' ? 'border-yellow-500 text-yellow-500' : 'border-cyan-800 text-cyan-800'
                                    }`}>
                                    {team.round1.status}
                                </span>
                            </td>
                            <td className="p-4 text-right space-x-2">
                                <button
                                    onClick={() => onReset(team._id)}
                                    title="Reset Progress"
                                    className="p-2 text-yellow-500 hover:bg-yellow-500/10 rounded transition-colors"
                                >
                                    <RotateCcw size={16} />
                                </button>
                                <button
                                    onClick={() => onDelete(team._id)}
                                    title="Eliminate Team"
                                    className="p-2 text-cyan-500 hover:bg-cyan-500/10 rounded transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const SubmissionLog = ({ submissions }) => (
    <div className="flex flex-col h-[calc(100vh-140px)]">
        <div className="flex items-center gap-2 mb-4 text-cyan-400">
            <div className="w-2 h-2 bg-cyan-400 animate-ping rounded-full"></div>
            <h2 className="uppercase tracking-widest text-sm">Live Data Stream</h2>
        </div>

        <div className="flex-1 bg-black border border-cyan-900 p-4 overflow-y-auto font-mono text-sm space-y-1 shadow-inner shadow-cyan-900/20">
            {submissions.map((sub) => (
                <div key={sub._id} className="flex gap-2 border-b border-cyan-900/30 pb-1 mb-1 hover:bg-cyan-900/10 p-1 transition-colors">
                    <span className="text-gray-500">[{new Date(sub.submissionTime).toLocaleTimeString()}]</span>
                    <span className="text-white font-bold">{sub.teamId?.teamName || 'Unknown'}</span>
                    <span className="text-cyan-400">submitted for</span>
                    <span className="text-white">{sub.questionId?.title || 'Unknown'}</span>
                    <span className="text-gray-500">::</span>
                    <span className={`font-bold ${sub.status === 'AC' ? 'text-green-500' : 'text-red-500'}`}>
                        {sub.status}
                    </span>
                </div>
            ))}
            <div className="animate-pulse text-cyan-400">_</div>
        </div>
    </div>
);