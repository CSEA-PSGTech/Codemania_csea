import React from "react";
import { useNavigate } from "react-router-dom";

function TeamLogin() {
  const navigate = useNavigate();

  return (
    <div className="login-card">
      <h2>CODEMANIA PLAYER LOGIN</h2>
      <input type="text" placeholder="Team Name" />
      <input type="password" placeholder="Access Code" />
      <button onClick={() => navigate("/challenges")}>ENTER ARENA</button>
    </div>
  );
}

export default TeamLogin;
