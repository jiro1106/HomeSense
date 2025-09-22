import React, { useState } from "react";
import { FaBars, FaTimes, FaTachometerAlt, FaUsers, FaSignOutAlt } from "react-icons/fa";
import HomesenseLogo from "../img/HomeSenseLogo.png";
import "../styles/DashboardStyle.css";

function Dashboard() {
  const [isOpen, setIsOpen] = useState(false);
  const [activePage, setActivePage] = useState("dashboard"); 

  const handleLogout = () => {
    const confirmLogout = window.confirm("Are you sure you want to logout?");
    if (confirmLogout) {
      localStorage.removeItem("authToken"); 
      window.location.href = "/"; 
    }
  };

  return (
    <div className="dashboard-container">
      {/* Topbar */}
      <div className="topbar">
        <div className="menu-icon" onClick={() => setIsOpen(true)}>
          <FaBars />
        </div>

        <div className="logo-center">
          <img src={HomesenseLogo} alt="HomeSense Logo" className="logo" />
        </div>

        <div className="logout-topbar" onClick={handleLogout}>
          <FaSignOutAlt className="icon" /> Logout
        </div>
      </div>

      {/* Sidebar */}
      <div className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="close-icon" onClick={() => setIsOpen(false)}>
          <FaTimes />
        </div>
        <ul>
          <li onClick={() => setActivePage("dashboard")}>
            <FaTachometerAlt className="icon" /> Dashboard
          </li>
          <li onClick={() => setActivePage("users")}>
            <FaUsers className="icon" /> Users
          </li>
        </ul>
      </div>

      {/* Main Content */}
      <div className={`content ${isOpen ? "shift" : ""}`}>
        {activePage === "dashboard" && (
          <>
            <h1>Welcome to the Admin Dashboard 🎉</h1>
          </>
        )}

        {activePage === "users" && (
          <>
            <h1>USERS</h1>
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
