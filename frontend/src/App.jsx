import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import TargetCursor from "./components/TargetCursor.jsx";
import FaultyTerminal from "./components/FaultyTerminal.jsx";
import "./styles/App.css";

// Lazy load all pages - each gets its own chunk
const TeamLogin = lazy(() => import("./pages/TeamLogin.jsx"));
const AdminLogin = lazy(() => import("./pages/AdminLogin.jsx"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard.jsx"));
const HomePage = lazy(() => import("./pages/Home.jsx"));
const ChallengeDashboard = lazy(() => import("./pages/ChallengeDashboard.jsx"));
const IdeInterface = lazy(() => import("./pages/IdeInterface.jsx"));

// Minimal loading fallback (lightweight, no heavy deps)
const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#000', color: '#22d3ee', fontFamily: 'monospace', fontSize: '14px' }}>
    Loading...
  </div>
);

// Route guard — redirects to /admin login if no admin token
const ProtectedAdminRoute = ({ children }) => {
  const adminToken = localStorage.getItem("adminToken");
  return adminToken ? children : <Navigate to="/admin" replace />;
};

// Inner component that uses useLocation (must be inside Router)
function AppContent() {
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const isChallengesPage = location.pathname === "/challenges";
  const isIdePage = location.pathname.startsWith("/ide/");
  const hasOwnBackground = isHomePage || isChallengesPage || isIdePage;

  return (
    <div className="page">
      {/* TargetCursor shows on all pages */}
      <TargetCursor />

      {/* Only show FaultyTerminal background on pages without their own 3D background */}
      {!hasOwnBackground && (
        <FaultyTerminal
          scale={1}
          digitSize={1.2}
          scanlineIntensity={0.5}
          glitchAmount={1}
          flickerAmount={1}
          noiseAmp={1}
          chromaticAberration={0}
          dither={0}
          curvature={0.1}
          tint="#0a3040"
          mouseReact
          mouseStrength={0.3}
          brightness={0.7}
          pageLoadAnimation={false}
          className="bg"
        />
      )}

      <div className={hasOwnBackground ? "" : "content-layer"}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/team-login" element={<TeamLogin />} />
          <Route path="/admin" element={<AdminLogin />} />

          {/* Protected Routes (Mocked for now) */}
          <Route path="/admin/dashboard" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
          <Route path="/challenges" element={<ChallengeDashboard />} />
          <Route path="/ide/:problemId" element={<IdeInterface />} />
        </Routes>
        </Suspense>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router basename="/codemania">
      <AppContent />
    </Router>
  );
}

export default App;
