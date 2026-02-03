import React from "react";
import { useNavigate } from "react-router-dom";

function AdminLogin() {
  const navigate = useNavigate();

  return (
    <div className="login-card">
      <h2>ADMIN LOGIN</h2>
      <input type="text" placeholder="Admin Username" />
      <input type="password" placeholder="Password" />
      <button onClick={() => navigate("/admin/dashboard")}>LOGIN</button>
    </div>
  );
}

export default AdminLogin;
