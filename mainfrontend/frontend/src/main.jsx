import React from "react";
import ReactDOM from "react-dom/client";
import FaultyTerminal from "./FaultyTerminal.jsx";
import TargetCursor from "./TargetCursor.jsx";
import "./App.css";   // 👈 important

function App() {
  return (
    
    <div className="page">

      {/* Login UI */}
      <div className="login-card">
        <h2>CODEMANIA PLAYER LOGIN</h2>
        <input type="text" placeholder="Team Name" />
        <input type="password" placeholder="Access Code" />
        <button>ENTER ROUND 1</button>
      </div>
      {/* Background */}
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
        tint="#f4372a"
        mouseReact
        mouseStrength={0.3}
        brightness={0.7}
        className="bg"
      />

      <TargetCursor />


    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
