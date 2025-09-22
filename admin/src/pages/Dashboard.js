import React, { useState, useEffect } from "react";
import {
  FaBars,
  FaTimes,
  FaTachometerAlt,
  FaUsers,
  FaSignOutAlt,
  FaTrash,
} from "react-icons/fa";
import HomesenseLogo from "../img/HomeSenseLogo.png";
import "../styles/DashboardStyle.css";

function Dashboard() {
  const [isOpen, setIsOpen] = useState(false);
  const [activePage, setActivePage] = useState("dashboard");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    const confirmLogout = window.confirm("Are you sure you want to logout?");
    if (confirmLogout) {
      localStorage.removeItem("authToken");
      window.location.href = "/";
    }
  };

  // Fetch users when "users" page is active
  useEffect(() => {
    if (activePage === "users") {
      fetchUsers();
    }
  }, [activePage]);

  const fetchUsers = () => {
    setLoading(true);
    fetch("http://localhost:8000/admin/users")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch users");
        }
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

  // Delete user function
  const handleDeleteUser = (email) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete user: ${email}?`
    );
    if (!confirmDelete) return;

    fetch(`http://localhost:8000/admin/users/${email}`, {
      method: "DELETE",
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to delete user");
        }
        return res.json();
      })
      .then(() => {
        // Remove user from state without refetching everything
        setUsers((prev) => prev.filter((u) => u.email !== email));
      })
      .catch((err) => {
        console.error("Error deleting user:", err);
        alert("Error deleting user. Check server logs.");
      });
  };

  // Format date for Last Logged In (Philippine time)
  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleString("en-PH", { timeZone: "Asia/Manila" });
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
                          <td>{user.household_id}</td>
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
