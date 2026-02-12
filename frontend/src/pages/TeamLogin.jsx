import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API, CORE_BACKEND_URL } from "../config/api";

function TeamLogin() {
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [roundActive, setRoundActive] = useState(null); // null = loading

  // Check round status on mount
  useEffect(() => {
    fetch(`${CORE_BACKEND_URL}/api/round-status`)
      .then(res => res.json())
      .then(data => setRoundActive(data.round1Active))
      .catch(() => setRoundActive(false));
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(API.login, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamName, accessCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      // Store token and team info
      localStorage.setItem("token", data.token);
      localStorage.setItem("team", JSON.stringify(data.team));

      navigate("/challenges");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-card">
      <h2>CODEMANIA PLAYER LOGIN</h2>

      {/* Round not active — show message instead of form */}
      {roundActive === false && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <p style={{ color: '#ff4757', fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '8px' }}>
            🔴 ROUND 1 IS NOT ACTIVE
          </p>
          <p style={{ color: '#8892b0', fontSize: '0.85rem' }}>
            The admin has not opened the portal yet. Please wait for instructions.
          </p>
        </div>
      )}

      {roundActive === null && (
        <p style={{ color: '#22d3ee', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>Checking status...</p>
      )}

      {error && <p style={{ color: "#ff4757", fontSize: "0.85rem", marginBottom: "10px" }}>{error}</p>}

      {roundActive && (
        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Team Name"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Access Code"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "CONNECTING..." : "ENTER ARENA"}
          </button>
        </form>
      )}
    </div>
  );
}

export default TeamLogin;
