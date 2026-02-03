import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import FaultyTerminal from "./components/FaultyTerminal.jsx";
import TargetCursor from "./components/TargetCursor.jsx";
import TeamLogin from "./pages/TeamLogin.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import HomePage from "./pages/Home.jsx";
import ChallengeDashboard from "./pages/ChallengeDashboard.jsx";
import "./styles/App.css";

// Inner component that uses useLocation (must be inside Router)
function AppContent() {
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const isChallengesPage = location.pathname === "/challenges";
  const hasOwnBackground = isHomePage || isChallengesPage;

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
          className="bg"
        />
      )}

      <div className={hasOwnBackground ? "" : "content-layer"}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/team-login" element={<TeamLogin />} />
          <Route path="/admin" element={<AdminLogin />} />

          {/* Protected Routes (Mocked for now) */}
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/challenges" element={<ChallengeDashboard />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
