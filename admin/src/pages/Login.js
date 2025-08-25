import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../styles/LoginStyle.css";
import HomesenseLogo from "../img/HomeSenseLogo.png";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);


  const users = [
    { email: "xavier_gelligan@dlsl.edu.ph", password: "2022336081" },
    { email: "jiro_rafael_layug@dlsl.edu.ph", password: "2022320351" },
    { email: "alfeah_star_punzalan@dlsl.edu.ph", password: "2022316551" },
  ];

  const handleLogin = (e) => {
    e.preventDefault();

    const user = users.find(
      (u) => u.email === email && u.password === password
    );

    if (user) {
     
      localStorage.setItem("authToken", "logged_in");
      navigate("/dashboard");
    } else {
      setError("Invalid email or password");
    }
  };

  return (
    <div className="login-container">
      {/* Left side with logo */}
      <div className="login-left">
        <img src={HomesenseLogo} alt="HomeSense Logo" className="logo" />
      </div>

      {/* Right side with login form */}
      <div className="login-right">
        <h2 className="welcome-text">
          Welcome,<br />Admin
        </h2>
        <h3 className="login-title">Login</h3>

        <form className="login-form" onSubmit={handleLogin}>
          <label>Email</label>
          <input
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label>Password</label>
          <div className="password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
              style={{ cursor: "pointer" }}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          {error && <p className="error">{error}</p>}

          <button type="submit" className="login-btn">Login</button>
        </form>
      </div>
    </div>
  );
}

export default Login;
