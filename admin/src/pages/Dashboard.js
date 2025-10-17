import React, { useState, useEffect } from "react";
import {
  FaBars,
  FaTimes,
  FaTachometerAlt,
  FaUsers,
  FaSignOutAlt,
  FaTrash,
  FaBolt,
  FaPlug,
  FaUserAlt,
  FaChartLine,
} from "react-icons/fa";
import HomesenseLogo from "../img/HomeSenseLogo.png";
import "../styles/DashboardStyle.css";

function Dashboard() {
  const [isOpen, setIsOpen] = useState(false);
  const [activePage, setActivePage] = useState("dashboard");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // 📊 Analytics State
  const [analytics, setAnalytics] = useState({
    total_users: 0,
    total_devices: 0,
    total_energy_kwh: 0,
    average_kwh_per_user: 0,
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // 👇 Preview toggles
  const [showUsersPreview, setShowUsersPreview] = useState(false);
  const [showDevicesPreview, setShowDevicesPreview] = useState(false);
  const [showEnergyPreview, setShowEnergyPreview] = useState(false);
  const [showAveragePreview, setShowAveragePreview] = useState(false);

  // 📦 Device state
  const [devices, setDevices] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const handleLogout = () => {
    const confirmLogout = window.confirm("Are you sure you want to logout?");
    if (confirmLogout) {
      localStorage.removeItem("authToken");
      window.location.href = "/";
    }
  };

  // 📊 Fetch analytics when dashboard page is active
  useEffect(() => {
    if (activePage === "dashboard") {
      fetchAnalytics();
    } else if (activePage === "users") {
      fetchUsers();
    }
  }, [activePage]);

  // 📊 Fetch admin analytics
  const fetchAnalytics = () => {
    setAnalyticsLoading(true);
    fetch("http://localhost:8000/admin/analytics")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch analytics");
        return res.json();
      })
      .then((data) => {
        setAnalytics({
          total_users: data.total_users || 0,
          total_devices: data.total_devices || 0,
          total_energy_kwh: data.total_energy_kwh || 0,
          average_kwh_per_user: data.average_kwh_per_user || 0,
        });
      })
      .catch((err) => {
        console.error("Error fetching analytics:", err);
        alert("Error loading analytics. Check your server connection.");
      })
      .finally(() => setAnalyticsLoading(false));
  };

  // Fetch users
  const fetchUsers = () => {
    setLoading(true);
    fetch("http://localhost:8000/admin/users")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch users");
        return res.json();
      })
      .then((data) => {
        setUsers(data.users || []);
      })
      .catch((err) => {
        console.error("Error fetching users:", err);
      })
      .finally(() => setLoading(false));
  };

  // Fetch devices (for preview)
  const fetchDevices = () => {
    setPreviewLoading(true);
    fetch("http://localhost:8000/admin/devices")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch devices");
        return res.json();
      })
      .then((data) => {
        console.log("Fetched devices:", data.devices);
        setDevices(data.devices || []);
        // Optional: update total devices in analytics automatically
        setAnalytics((prev) => ({
          ...prev,
          total_devices: data.total_devices || prev.total_devices,
        }));
      })
      .catch((err) => {
        console.error("Error fetching devices:", err);
        alert("Error loading devices. Check server connection.");
      })
      .finally(() => setPreviewLoading(false));
  };

  // Delete user
  const handleDeleteUser = (email) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete user: ${email}?`
    );
    if (!confirmDelete) return;

    fetch(`http://localhost:8000/admin/users/${email}`, {
      method: "DELETE",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to delete user");
        return res.json();
      })
      .then(() => {
        setUsers((prev) => prev.filter((u) => u.email !== email));
      })
      .catch((err) => {
        console.error("Error deleting user:", err);
        alert("Error deleting user. Check server logs.");
      });
  };

  // Format date (Philippine Time)
  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleString("en-PH", { timeZone: "Asia/Manila" });
  };

  // 📌 Handle card clicks
  const handleCardClick = (type) => {
    if (type === "users") {
      setShowUsersPreview(!showUsersPreview);
      if (!users.length) fetchUsers();
      setShowDevicesPreview(false);
      setShowEnergyPreview(false);
      setShowAveragePreview(false);
    } else if (type === "devices") {
      setShowDevicesPreview(!showDevicesPreview);
      if (!devices.length) fetchDevices();
      setShowUsersPreview(false);
      setShowEnergyPreview(false);
      setShowAveragePreview(false);
    } else if (type === "energy") {
      setShowEnergyPreview(!showEnergyPreview);
      setShowUsersPreview(false);
      setShowDevicesPreview(false);
      setShowAveragePreview(false);
    } else if (type === "average") {
      setShowAveragePreview(!showAveragePreview);
      setShowUsersPreview(false);
      setShowDevicesPreview(false);
      setShowEnergyPreview(false);
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
          <li
            className={activePage === "dashboard" ? "active" : ""}
            onClick={() => setActivePage("dashboard")}
          >
            <FaTachometerAlt className="icon" /> Dashboard
          </li>
          <li
            className={activePage === "users" ? "active" : ""}
            onClick={() => setActivePage("users")}
          >
            <FaUsers className="icon" /> Users
          </li>
        </ul>
      </div>

      {/* Main Content */}
      <div className={`content ${isOpen ? "shift" : ""}`}>
        {activePage === "dashboard" && (
          <>
            <h1>Welcome to the Admin Dashboard 🎉</h1>

            {analyticsLoading ? (
              <p>Loading analytics...</p>
            ) : (
              <>
                {/* 📊 Analytics Cards */}
                <div className="analytics-container">
                  <div
                    className="analytics-card"
                    onClick={() => handleCardClick("users")}
                  >
                    <FaUserAlt className="analytics-icon user-icon" />
                    <h3>Total Users</h3>
                    <p>{analytics.total_users}</p>
                  </div>

                  <div
                    className="analytics-card"
                    onClick={() => handleCardClick("devices")}
                  >
                    <FaPlug className="analytics-icon device-icon" />
                    <h3>Total Devices</h3>
                    <p>{analytics.total_devices}</p>
                  </div>

                  <div
                    className="analytics-card"
                    onClick={() => handleCardClick("energy")}
                  >
                    <FaBolt className="analytics-icon energy-icon" />
                    <h3>Total Energy (kWh)</h3>
                    <p>{analytics.total_energy_kwh.toFixed(4)}</p>
                  </div>

                  <div
                    className="analytics-card"
                    onClick={() => handleCardClick("average")}
                  >
                    <FaChartLine className="analytics-icon avg-icon" />
                    <h3>Avg. kWh per User</h3>
                    <p>{analytics.average_kwh_per_user.toFixed(4)}</p>
                  </div>
                </div>

                {/* 👇 Preview Tables Below Cards */}
                {showUsersPreview && (
                  <div className="preview-table">
                    <h2>User Preview</h2>
                    {loading ? (
                      <p>Loading users...</p>
                    ) : users.length > 0 ? (
                      <table>
                        <thead>
                          <tr>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Household ID</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.slice(0, 5).map((u, i) => (
                            <tr key={i}>
                              <td>{u.username || "N/A"}</td>
                              <td>{u.email}</td>
                              <td>{u.household_id || "N/A"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p>No users found</p>
                    )}
                  </div>
                )}

                {showDevicesPreview && (
                  <div className="preview-table">
                    <h2>Device Preview</h2>
                    {previewLoading ? (
                      <p>Loading devices...</p>
                    ) : devices.length > 0 ? (
                      <table>
                        <thead>
                          <tr>
                            <th>Device Name</th>
                            <th>Device ID</th>
                            <th>Appliance Name</th>
                            <th>Household ID</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {devices.slice(0, 5).map((d, i) => {
                            const status = d.status ? d.status.toLowerCase() : "unknown";
                            const badgeStyle = {
                              active: { color: "#22c55e", fontWeight: "600" },
                              inactive: { color: "#9ca3af", fontWeight: "600" },
                              unknown: { color: "#f59e0b", fontWeight: "600" },
                            };
                            return (
                              <tr key={i}>
                                <td>{d.device_name || "N/A"}</td>
                                <td>{d.device_id || "N/A"}</td>
                                <td>{d.appliance_name || "Not Registered"}</td>
                                <td>{d.household_id || "N/A"}</td>
                                <td style={badgeStyle[status] || badgeStyle.unknown}>
                                  {status === "active" && "🟢 Active"}
                                  {status === "inactive" && "🔴 Inactive"}
                                  {status === "unknown" && "🟠 Unknown"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <p>No devices found</p>
                    )}
                  </div>
                )}

                {showEnergyPreview && (
                  <div className="preview-table">
                    <h2>Total Energy Breakdown</h2>
                    <p>
                      System has recorded a total of{" "}
                      <strong>{analytics.total_energy_kwh.toFixed(4)} kWh</strong>{" "}
                      across all users and devices.
                    </p>
                  </div>
                )}

                {showAveragePreview && (
                  <div className="preview-table">
                    <h2>Average Energy Consumption</h2>
                    <p>
                      Each user consumes an average of{" "}
                      <strong>{analytics.average_kwh_per_user.toFixed(4)} kWh</strong>.
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activePage === "users" && (
          <>
            <h1>USERS</h1>
            <div className="table-container">
              {loading ? (
                <p>Loading users...</p>
              ) : (
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Username</th>
                      <th>Household ID</th>
                      <th>Last Logged In</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length > 0 ? (
                      users.map((user, index) => (
                        <tr key={index}>
                          <td>{user.email}</td>
                          <td>{user.username || "N/A"}</td>
                          <td>{user.household_id || "N/A"}</td>
                          <td>{formatDate(user.last_logged_in)}</td>
                          <td>
                            <button
                              className="delete-btn"
                              onClick={() => handleDeleteUser(user.email)}
                            >
                              <FaTrash /> Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5">No users found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
