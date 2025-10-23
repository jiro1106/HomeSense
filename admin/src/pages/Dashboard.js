import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
  FaSortAmountDown,
  FaSortAmountUp,
  FaCalendarDay,
  FaCalendarWeek,
  FaCalendarAlt,
  FaChevronDown,
  FaChevronUp,
  FaHome,
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

  // 📊 Energy breakdown by household
  const [energyBreakdown, setEnergyBreakdown] = useState([]);
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  // Track active card
  const [activeCard, setActiveCard] = useState(null);

  // 🆕 Expanded household states
  const [expandedHouseholds, setExpandedHouseholds] = useState({});
  const [energyDetails, setEnergyDetails] = useState({});
  const [loadingDetails, setLoadingDetails] = useState({});

  // 🆕 Sorting states
  const [usersSortConfig, setUsersSortConfig] = useState({ key: null, direction: 'asc' });
  const [devicesSortConfig, setDevicesSortConfig] = useState({ key: null, direction: 'asc' });
  const [energySortConfig, setEnergySortConfig] = useState({ key: null, direction: 'asc' });
  const [averageSortConfig, setAverageSortConfig] = useState({ key: null, direction: 'asc' });
  const [detailsSortConfig, setDetailsSortConfig] = useState({ period: 'daily', key: 'date', direction: 'desc' });

  // 🆕 Dropdown visibility states
  const [showUsersSortDropdown, setShowUsersSortDropdown] = useState(false);
  const [showDevicesSortDropdown, setShowDevicesSortDropdown] = useState(false);
  const [showEnergySortDropdown, setShowEnergySortDropdown] = useState(false);
  const [showAverageSortDropdown, setShowAverageSortDropdown] = useState(false);

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
        console.log("Analytics data:", data);
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

  // 🆕 Fetch comprehensive energy breakdown with details
  const fetchEnergyBreakdown = () => {
    setBreakdownLoading(true);
    console.log("Fetching comprehensive energy breakdown...");
    fetch("http://localhost:8000/admin/all-households-energy-summary")
      .then((res) => {
        if (!res.ok) {
          return res.text().then(text => {
            throw new Error(`Failed to fetch energy breakdown: ${text}`);
          });
        }
        return res.json();
      })
      .then((data) => {
        console.log("Fetched comprehensive energy breakdown:", data);
        setEnergyBreakdown(data.households || []);
        
        // Initialize energy details
        const details = {};
        data.households.forEach(household => {
          details[household.household_id] = household.energy_details || {};
        });
        setEnergyDetails(details);
      })
      .catch((err) => {
        console.error("Error fetching energy breakdown:", err);
        // Fallback to basic breakdown if comprehensive fails
        fetchBasicEnergyBreakdown();
      })
      .finally(() => setBreakdownLoading(false));
  };

  // Fallback to basic energy breakdown
  const fetchBasicEnergyBreakdown = () => {
    fetch("http://localhost:8000/admin/energy-breakdown")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch basic energy breakdown");
        return res.json();
      })
      .then((data) => {
        setEnergyBreakdown(data.households || []);
        // Initialize empty details for basic breakdown
        const details = {};
        data.households.forEach(household => {
          details[household.household_id] = {
            daily: [],
            weekly: [],
            monthly: [],
            message: "Detailed data not available"
          };
        });
        setEnergyDetails(details);
      })
      .catch((err) => {
        console.error("Error fetching basic energy breakdown:", err);
        alert(`Error loading energy breakdown: ${err.message}`);
      });
  };

  // 🆕 Fetch detailed energy data for a specific household
  const fetchHouseholdEnergyDetails = (householdId) => {
    setLoadingDetails(prev => ({ ...prev, [householdId]: true }));
    
    fetch(`http://localhost:8000/admin/household-energy-details?household_id=${householdId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch household details");
        return res.json();
      })
      .then((data) => {
        setEnergyDetails(prev => ({
          ...prev,
          [householdId]: data
        }));
      })
      .catch((err) => {
        console.error(`Error fetching details for household ${householdId}:`, err);
        setEnergyDetails(prev => ({
          ...prev,
          [householdId]: {
            daily: [],
            weekly: [],
            monthly: [],
            error: err.message
          }
        }));
      })
      .finally(() => {
        setLoadingDetails(prev => ({ ...prev, [householdId]: false }));
      });
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
    // Reset all preview states first
    setShowUsersPreview(false);
    setShowDevicesPreview(false);
    setShowEnergyPreview(false);
    setShowAveragePreview(false);

    // Set active card
    setActiveCard(type);

    // Toggle the selected preview
    switch (type) {
      case "users":
        const newUsersState = !showUsersPreview;
        setShowUsersPreview(newUsersState);
        if (newUsersState && !users.length) fetchUsers();
        break;
      case "devices":
        const newDevicesState = !showDevicesPreview;
        setShowDevicesPreview(newDevicesState);
        if (newDevicesState && !devices.length) fetchDevices();
        break;
      case "energy":
        const newEnergyState = !showEnergyPreview;
        setShowEnergyPreview(newEnergyState);
        if (newEnergyState && !energyBreakdown.length) fetchEnergyBreakdown();
        break;
      case "average":
        const newAverageState = !showAveragePreview;
        setShowAveragePreview(newAverageState);
        if (newAverageState && !energyBreakdown.length) fetchEnergyBreakdown();
        break;
      default:
        setActiveCard(null);
    }
  };

  // 🆕 Toggle household expansion
  const toggleHouseholdExpansion = (householdId) => {
    setExpandedHouseholds(prev => ({
      ...prev,
      [householdId]: !prev[householdId]
    }));

    // Fetch details if not already loaded
    if (!energyDetails[householdId] || energyDetails[householdId].error) {
      fetchHouseholdEnergyDetails(householdId);
    }
  };

  // 🆕 SORTING FUNCTIONS
  const sortData = (data, key, direction) => {
    return [...data].sort((a, b) => {
      let aValue = a[key];
      let bValue = b[key];

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      // Convert to lowercase for string comparison
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // 🆕 Sort energy details data
  const sortEnergyDetails = (data, period, key, direction) => {
    if (!data || !data[period]) return [];
    
    return [...data[period]].sort((a, b) => {
      let aValue = a[key];
      let bValue = b[key];

      // Handle date sorting
      if (key === 'date' || key === 'week_start' || key === 'week_end' || key === 'month') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleUsersSort = (key) => {
    const direction = usersSortConfig.key === key && usersSortConfig.direction === 'asc' ? 'desc' : 'asc';
    setUsersSortConfig({ key, direction });
    setShowUsersSortDropdown(false);
  };

  const handleDevicesSort = (key) => {
    const direction = devicesSortConfig.key === key && devicesSortConfig.direction === 'asc' ? 'desc' : 'asc';
    setDevicesSortConfig({ key, direction });
    setShowDevicesSortDropdown(false);
  };

  const handleEnergySort = (key) => {
    const direction = energySortConfig.key === key && energySortConfig.direction === 'asc' ? 'desc' : 'asc';
    setEnergySortConfig({ key, direction });
    setShowEnergySortDropdown(false);
  };

  const handleAverageSort = (key) => {
    const direction = averageSortConfig.key === key && averageSortConfig.direction === 'asc' ? 'desc' : 'asc';
    setAverageSortConfig({ key, direction });
    setShowAverageSortDropdown(false);
  };

  const handleDetailsSort = (period, key) => {
    const direction = detailsSortConfig.key === key && detailsSortConfig.direction === 'asc' ? 'desc' : 'asc';
    setDetailsSortConfig({ period, key, direction });
  };

  // Get sorted data
  const getSortedUsers = () => {
    if (!usersSortConfig.key) return users;
    return sortData(users, usersSortConfig.key, usersSortConfig.direction);
  };

  const getSortedDevices = () => {
    if (!devicesSortConfig.key) return devices;
    return sortData(devices, devicesSortConfig.key, devicesSortConfig.direction);
  };

  const getSortedEnergy = () => {
    if (!energySortConfig.key) return energyBreakdown;
    return sortData(energyBreakdown, energySortConfig.key, energySortConfig.direction);
  };

  const getSortedAverage = () => {
    if (!averageSortConfig.key) return energyBreakdown;
    return sortData(energyBreakdown, averageSortConfig.key, averageSortConfig.direction);
  };

  const getSortedEnergyDetails = (details, period) => {
    return sortEnergyDetails(details, period, detailsSortConfig.key, detailsSortConfig.direction);
  };

  // 🆕 Helper function to get field display name
  const getFieldDisplayName = (key) => {
    const fieldNames = {
      'household_id': 'Household ID',
      'username': 'Username',
      'email': 'Email',
      'device_name': 'Device Name',
      'appliance_name': 'Appliance Name',
      'appliance_type': 'Appliance Type',
      'device_id': 'Device ID',
      'user_count': 'Number of Users',
      'total_household_kwh': 'Total Energy',
      'average_kwh_per_user': 'Average kWh',
      'date': 'Date',
      'kwh': 'Energy Usage'
    };
    return fieldNames[key] || key;
  };

  // 🆕 Sort button component
  const SortButton = ({ 
    sortConfig, 
    showDropdown, 
    setShowDropdown, 
    handleSort, 
    sortOptions,
    type 
  }) => (
    <div className="sort-button-container">
      <div className="sort-controls">
        {sortConfig.key && (
          <div className="sort-indicator-badge">
            Sorted by: {getFieldDisplayName(sortConfig.key)} {sortConfig.direction === 'asc' ? '↑' : '↓'}
          </div>
        )}
        <button 
          className="modern-sort-button"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <span className="sort-button-text">SORT</span>
          {sortConfig.direction === 'asc' ? 
            <FaSortAmountDown className="sort-icon" /> : 
            <FaSortAmountUp className="sort-icon" />
          }
        </button>
      </div>
      {showDropdown && (
        <div className="modern-sort-dropdown">
          {sortOptions.map((option) => (
            <div 
              key={option.key}
              className={`modern-sort-option ${sortConfig.key === option.key ? 'active' : ''}`}
              onClick={() => handleSort(option.key)}
            >
              <span>{option.label}</span>
              {sortConfig.key === option.key && (
                <span className="sort-arrow">
                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // 🆕 Details Sort Button Component
  const DetailsSortButton = ({ period, data, onSort }) => {
    if (!data || data.length === 0) return null;

    return (
      <div className="details-sort-container">
        <button 
          className="details-sort-button"
          onClick={() => onSort(period, 'date')}
        >
          <FaSortAmountDown className="sort-icon" />
          Sort by Date
        </button>
        <button 
          className="details-sort-button"
          onClick={() => onSort(period, 'kwh')}
        >
          <FaSortAmountDown className="sort-icon" />
          Sort by Usage
        </button>
        {detailsSortConfig.key && (
          <span className="sort-indicator">
            Sorted by: {getFieldDisplayName(detailsSortConfig.key)} 
            {detailsSortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
          </span>
        )}
      </div>
    );
  };

  const generateHouseholdPDF = (householdId, details, householdData) => {
    try {
      const doc = new jsPDF();
    const title = "HomeSense Energy Report";
    const dateStr = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
    doc.setFontSize(18);
    doc.text(title, 14, 20);
    doc.setFontSize(11);
    doc.text(`Generated: ${dateStr}`, 14, 28);
    doc.text(`Household ID: ${householdId}`, 14, 36);
    doc.text(`Number of Users: ${householdData?.user_count ?? 0}`, 14, 44);

    const safeDetails = details || {};
    const daily = safeDetails.daily || [];
    const weekly = safeDetails.weekly || [];
    const monthly = safeDetails.monthly || [];

    let startY = 52;

    doc.setFontSize(14);
    doc.text("Daily Consumption", 14, startY);
    startY += 4;
    autoTable(doc, {
      startY,
      head: [["Date", "Energy (kWh)"]],
      body: daily.map(d => [d.date || "-", d.kwh != null ? String(d.kwh) : "-"]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [0, 0, 0] },
      theme: "striped",
      margin: { left: 14, right: 14 }
    });
    startY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : startY + 20;

    doc.text("Weekly Consumption", 14, startY);
    startY += 4;
    autoTable(doc, {
      startY,
      head: [["Week Start", "Week End", "Energy (kWh)"]],
      body: weekly.map(w => [w.week_start || "-", w.week_end || "-", w.kwh != null ? String(w.kwh) : "-"]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [0, 0, 0] },
      theme: "striped",
      margin: { left: 14, right: 14 }
    });
    startY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : startY + 20;

    doc.text("Monthly Consumption", 14, startY);
    startY += 4;
    autoTable(doc, {
      startY,
      head: [["Month", "Energy (kWh)"]],
      body: monthly.map(m => [m.month || "-", m.kwh != null ? String(m.kwh) : "-"]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [0, 0, 0] },
      theme: "striped",
      margin: { left: 14, right: 14 }
    });

    // Total consumption summary at bottom
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 12 : 280;
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }

    const sumDaily = (daily || []).reduce((acc, d) => acc + (Number(d.kwh) || 0), 0);
    const totalKwh = (typeof householdData?.total_household_kwh === 'number' ? householdData.total_household_kwh : sumDaily);

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total Consumption: ${Number(totalKwh || 0).toFixed(4)} kWh`, 14, y);
    doc.setFont(undefined, 'normal');

    // Average per User below total
    const userCount = Number(householdData?.user_count) || 0;
    const avgFromData = typeof householdData?.average_kwh_per_user === 'number' ? householdData.average_kwh_per_user : null;
    const avgPerUser = avgFromData != null ? avgFromData : (userCount > 0 ? (Number(totalKwh || 0) / userCount) : 0);
    const nextY = y + 7 > pageHeight - 20 ? (doc.addPage(), 20) : y + 7;
    doc.setFont(undefined, 'bold');
    doc.text(`Average per Household: ${Number(avgPerUser).toFixed(4)} kWh`, 14, nextY);
    doc.setFont(undefined, 'normal');

      doc.save(`homesense_report_${householdId}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert(`Failed to generate PDF: ${err?.message || err}`);
    }
  };

  // 🆕 Energy Details Component - IMPROVED WITH BETTER DESIGN
  const EnergyDetailsPanel = ({ householdId, details, householdData, onGeneratePDF }) => {
    if (!details) return <div className="loading-details">Loading details...</div>;

    const { 
      daily = [], 
      weekly = [], 
      monthly = [], 
      error, 
      message
    } = details;

    if (error) {
      return (
        <div className="energy-details-error">
          <p>⚠️ Error loading detailed data: {error}</p>
        </div>
      );
    }

    // If only a message is provided (e.g., basic data), still render header and PDF button,
    // but show the message banner within the panel.

    const sortedDaily = getSortedEnergyDetails(details, 'daily');
    const sortedWeekly = getSortedEnergyDetails(details, 'weekly');
    const sortedMonthly = getSortedEnergyDetails(details, 'monthly');

    return (
      <div className="energy-details-panel">
        {/* Household Header */}
        <div className="household-header">
          <div className="household-info">
            <FaHome className="household-icon" />
            <div>
              <h3>Household: {householdId}</h3>
              <p className="household-stats">
                {householdData?.user_count || 0} users • 
                Total Energy: {householdData?.total_household_kwh?.toFixed(4) || '0.0000'} kWh
              </p>
            </div>
          </div>
          {onGeneratePDF && (
            <button
              type="button"
              className="pdf-button"
              onClick={(e) => { e.stopPropagation(); onGeneratePDF && onGeneratePDF(householdId, details, householdData); }}
            >
              Generate PDF Report
            </button>
          )}
        </div>

        {message && (
          <div className="energy-details-message">
            <p>ℹ️ {message}</p>
          </div>
        )}

        {/* Summary Cards */}
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-icon daily">
              <FaCalendarDay />
            </div>
            <div className="summary-content">
              <span className="summary-value">{daily.length}</span>
              <span className="summary-label">Daily Records</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon weekly">
              <FaCalendarWeek />
            </div>
            <div className="summary-content">
              <span className="summary-value">{weekly.length}</span>
              <span className="summary-label">Weekly Records</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon monthly">
              <FaCalendarAlt />
            </div>
            <div className="summary-content">
              <span className="summary-value">{monthly.length}</span>
              <span className="summary-label">Monthly Records</span>
            </div>
          </div>
        </div>

        {/* Daily Breakdown */}
        <div className="energy-breakdown-section">
          <div className="breakdown-header">
            <h4>
              <FaCalendarDay className="breakdown-icon" /> 
              Daily Energy Consumption
            </h4>
            <DetailsSortButton 
              period="daily" 
              data={daily} 
              onSort={handleDetailsSort}
            />
          </div>
          {sortedDaily.length > 0 ? (
            <div className="breakdown-table-container">
              <table className="breakdown-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Energy Consumption (kWh)</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDaily.map((day, idx) => (
                    <tr key={idx}>
                      <td className="date-cell">{day.date}</td>
                      <td className="energy-value">{day.kwh}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-data-message">
              <p>No daily energy data available for this household</p>
            </div>
          )}
        </div>

        {/* Weekly Breakdown */}
        <div className="energy-breakdown-section">
          <div className="breakdown-header">
            <h4>
              <FaCalendarWeek className="breakdown-icon" /> 
              Weekly Energy Consumption
            </h4>
            <DetailsSortButton 
              period="weekly" 
              data={weekly} 
              onSort={handleDetailsSort}
            />
          </div>
          {sortedWeekly.length > 0 ? (
            <div className="breakdown-table-container">
              <table className="breakdown-table">
                <thead>
                  <tr>
                    <th>Week Period</th>
                    <th>Energy Consumption (kWh)</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedWeekly.map((week, idx) => (
                    <tr key={idx}>
                      <td className="date-cell">
                        {week.week_start} to {week.week_end}
                      </td>
                      <td className="energy-value">{week.kwh}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-data-message">
              <p>No weekly energy data available for this household</p>
            </div>
          )}
        </div>

        {/* Monthly Breakdown */}
        <div className="energy-breakdown-section">
          <div className="breakdown-header">
            <h4>
              <FaCalendarAlt className="breakdown-icon" /> 
              Monthly Energy Consumption
            </h4>
            <DetailsSortButton 
              period="monthly" 
              data={monthly} 
              onSort={handleDetailsSort}
            />
          </div>
          {sortedMonthly.length > 0 ? (
            <div className="breakdown-table-container">
              <table className="breakdown-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Energy Consumption (kWh)</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMonthly.map((month, idx) => (
                    <tr key={idx}>
                      <td className="date-cell">{month.month}</td>
                      <td className="energy-value">{month.kwh}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-data-message">
              <p>No monthly energy data available for this household</p>
            </div>
          )}
        </div>
      </div>
    );
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
                    className={`analytics-card ${activeCard === "users" ? "active" : ""}`}
                    onClick={() => handleCardClick("users")}
                  >
                    <FaUserAlt className="analytics-icon user-icon" />
                    <h3>Total Users</h3>
                    <p>{analytics.total_users}</p>
                    {activeCard === "users" && <div className="active-indicator"></div>}
                  </div>

                  <div
                    className={`analytics-card ${activeCard === "devices" ? "active" : ""}`}
                    onClick={() => handleCardClick("devices")}
                  >
                    <FaPlug className="analytics-icon device-icon" />
                    <h3>Total Devices</h3>
                    <p>{analytics.total_devices}</p>
                    {activeCard === "devices" && <div className="active-indicator"></div>}
                  </div>

                  <div
                    className={`analytics-card ${activeCard === "energy" ? "active" : ""}`}
                    onClick={() => handleCardClick("energy")}
                  >
                    <FaBolt className="analytics-icon energy-icon" />
                    <h3>Total Energy (kWh)</h3>
                    <p>{analytics.total_energy_kwh.toFixed(4)}</p>
                    {activeCard === "energy" && <div className="active-indicator"></div>}
                  </div>

                  <div
                    className={`analytics-card ${activeCard === "average" ? "active" : ""}`}
                    onClick={() => handleCardClick("average")}
                  >
                    <FaChartLine className="analytics-icon avg-icon" />
                    <h3>Avg. kWh per Household</h3>
                    <p>{analytics.average_kwh_per_user.toFixed(4)}</p>
                    {activeCard === "average" && <div className="active-indicator"></div>}
                  </div>
                </div>

                {/* 👇 USERS PREVIEW WITH SORTING */}
                {showUsersPreview && (
                  <div className="preview-table">
                    <div className="preview-header">
                      <h2>👥 User Preview</h2>
                      <SortButton
                        sortConfig={usersSortConfig}
                        showDropdown={showUsersSortDropdown}
                        setShowDropdown={setShowUsersSortDropdown}
                        handleSort={handleUsersSort}
                        sortOptions={[
                          { key: 'household_id', label: 'Household ID' },
                          { key: 'username', label: 'Username' },
                          { key: 'email', label: 'Email' }
                        ]}
                        type="users"
                      />
                    </div>
                    {loading ? (
                      <p>Loading users...</p>
                    ) : getSortedUsers().length > 0 ? (
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>Username</th>
                              <th>Email</th>
                              <th>Household ID</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getSortedUsers().map((u, i) => (
                              <tr key={i}>
                                <td>{u.username || "N/A"}</td>
                                <td>{u.email}</td>
                                <td>{u.household_id || "N/A"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p>No users found</p>
                    )}
                  </div>
                )}

                {/* 👇 DEVICES PREVIEW WITH SORTING */}
                {showDevicesPreview && (
                  <div className="preview-table">
                    <div className="preview-header">
                      <h2>🔌 Device Preview</h2>
                      <SortButton
                        sortConfig={devicesSortConfig}
                        showDropdown={showDevicesSortDropdown}
                        setShowDropdown={setShowDevicesSortDropdown}
                        handleSort={handleDevicesSort}
                        sortOptions={[
                          { key: 'household_id', label: 'Household ID' },
                          { key: 'device_name', label: 'Device Name' },
                          { key: 'appliance_name', label: 'Appliance Name' },
                          { key: 'appliance_type', label: 'Appliance Type' },
                          { key: 'device_id', label: 'Device ID' }
                        ]}
                        type="devices"
                      />
                    </div>
                    {previewLoading ? (
                      <p>Loading devices...</p>
                    ) : getSortedDevices().length > 0 ? (
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>Device Name</th>
                              <th>Device ID</th>
                              <th>Appliance Name</th>
                              <th>Appliance Type</th>
                              <th>Household ID</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getSortedDevices().map((d, i) => {
                              const status = d.status
                                ? d.status.toLowerCase()
                                : "unknown";
                              const badgeStyle = {
                                active: { color: "#22c55e", fontWeight: "600" },
                                inactive: { color: "#9ca3af", fontWeight: "600" },
                                unknown: { color: "#f59e0b", fontWeight: "600" },
                              };
                              return (
                                <tr key={i}>
                                  <td>{d.device_name || "N/A"}</td>
                                  <td>{d.device_id || "N/A"}</td>
                                  <td>
                                    {d.appliance_name || "Not Registered"}
                                  </td>
                                  <td>{d.appliance_type || "N/A"}</td>
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
                      </div>
                    ) : (
                      <p>No devices found</p>
                    )}
                  </div>
                )}

                {/* 👇 ENERGY PREVIEW WITH IMPROVED DESIGN */}
                {showEnergyPreview && (
                  <div className="preview-table fullscreen-energy-preview">
                    <div className="preview-header">
                      <h2>📊 Total Energy Breakdown by Household</h2>
                      <div className="preview-controls">
                        <SortButton
                          sortConfig={energySortConfig}
                          showDropdown={showEnergySortDropdown}
                          setShowDropdown={setShowEnergySortDropdown}
                          handleSort={handleEnergySort}
                          sortOptions={[
                            { key: 'household_id', label: 'Household ID' },
                            { key: 'user_count', label: 'Number of Users' },
                            { key: 'total_household_kwh', label: 'Total Energy' }
                          ]}
                          type="energy"
                        />
                        <button 
                          className="close-preview-btn"
                          onClick={() => setShowEnergyPreview(false)}
                        >
                          Close Preview
                        </button>
                      </div>
                    </div>
                    
                    <div className="energy-preview-content">
                      {breakdownLoading ? (
                        <div className="loading-state">
                          <p>Loading energy breakdown data...</p>
                        </div>
                      ) : getSortedEnergy().length > 0 ? (
                        <div className="energy-table-container">
                          <div className="table-info">
                            <p>Showing {getSortedEnergy().length} households • Click on any household to view detailed energy consumption</p>
                          </div>
                          <table className="energy-breakdown-table">
                            <thead>
                              <tr>
                                <th style={{width: '60px'}}></th>
                                <th>Household ID</th>
                                <th>Number of Users</th>
                                <th>Total Energy (kWh)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getSortedEnergy().map((household, idx) => (
                                <React.Fragment key={idx}>
                                  <tr 
                                    className={`expandable-row ${expandedHouseholds[household.household_id] ? 'expanded' : ''}`}
                                    onClick={() => toggleHouseholdExpansion(household.household_id)}
                                  >
                                    <td className="expand-icon">
                                      {expandedHouseholds[household.household_id] ? 
                                        <FaChevronUp /> : <FaChevronDown />
                                      }
                                    </td>
                                    <td className="household-id-cell">
                                      <FaHome className="household-icon-small" />
                                      {household.household_id || "Unknown"}
                                    </td>
                                    <td className="center-align">
                                      <span className="user-count-badge">{household.user_count}</span>
                                    </td>
                                    <td className="energy-value-cell">
                                      {household.total_household_kwh.toFixed(4)} kWh
                                    </td>
                                  </tr>
                                  {expandedHouseholds[household.household_id] && (
                                    <tr className="details-row">
                                      <td colSpan="4">
                                        {loadingDetails[household.household_id] ? (
                                          <div className="loading-details">
                                            <p>Loading detailed energy consumption data...</p>
                                          </div>
                                        ) : (
                                          <EnergyDetailsPanel 
                                            householdId={household.household_id}
                                            details={energyDetails[household.household_id]}
                                            householdData={household}
                                            onGeneratePDF={generateHouseholdPDF}
                                          />
                                        )}
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="no-data-state">
                          <p>No energy consumption data available</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 👇 AVERAGE PREVIEW WITH IMPROVED DESIGN */}
                {showAveragePreview && (
                  <div className="preview-table fullscreen-energy-preview">
                    <div className="preview-header">
                      <h2>📈 Average Energy Consumption by Household</h2>
                      <div className="preview-controls">
                        <SortButton
                          sortConfig={averageSortConfig}
                          showDropdown={showAverageSortDropdown}
                          setShowDropdown={setShowAverageSortDropdown}
                          handleSort={handleAverageSort}
                          sortOptions={[
                            { key: 'household_id', label: 'Household ID' },
                            { key: 'user_count', label: 'Number of Users' },
                            { key: 'total_household_kwh', label: 'Total Energy' },
                            { key: 'average_kwh_per_user', label: 'Average kWh' }
                          ]}
                          type="average"
                        />
                        <button 
                          className="close-preview-btn"
                          onClick={() => setShowAveragePreview(false)}
                        >
                          Close Preview
                        </button>
                      </div>
                    </div>
                    
                    <div className="energy-preview-content">
                      {breakdownLoading ? (
                        <div className="loading-state">
                          <p>Loading energy consumption data...</p>
                        </div>
                      ) : getSortedAverage().length > 0 ? (
                        <div className="energy-table-container">
                          <div className="table-info">
                            <p>Showing {getSortedAverage().length} households • Click on any household to view detailed energy consumption</p>
                          </div>
                          <table className="energy-breakdown-table">
                            <thead>
                              <tr>
                                <th style={{width: '60px'}}></th>
                                <th>Household ID</th>
                                <th>Number of Users</th>
                                <th>Total Energy (kWh)</th>
                                <th>Avg kWh per Household</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getSortedAverage().map((household, idx) => (
                                <React.Fragment key={idx}>
                                  <tr 
                                    className={`expandable-row ${expandedHouseholds[household.household_id] ? 'expanded' : ''}`}
                                    onClick={() => toggleHouseholdExpansion(household.household_id)}
                                  >
                                    <td className="expand-icon">
                                      {expandedHouseholds[household.household_id] ? 
                                        <FaChevronUp /> : <FaChevronDown />
                                      }
                                    </td>
                                    <td className="household-id-cell">
                                      <FaHome className="household-icon-small" />
                                      {household.household_id || "Unknown"}
                                    </td>
                                    <td className="center-align">
                                      <span className="user-count-badge">{household.user_count}</span>
                                    </td>
                                    <td className="energy-value-cell">
                                      {household.total_household_kwh.toFixed(4)} kWh
                                    </td>
                                    <td className="average-value-cell">
                                      {household.average_kwh_per_user.toFixed(4)} kWh
                                    </td>
                                  </tr>
                                  {expandedHouseholds[household.household_id] && (
                                    <tr className="details-row">
                                      <td colSpan="5">
                                        {loadingDetails[household.household_id] ? (
                                          <div className="loading-details">
                                            <p>Loading detailed energy consumption data...</p>
                                          </div>
                                        ) : (
                                          <EnergyDetailsPanel 
                                            householdId={household.household_id}
                                            details={energyDetails[household.household_id]}
                                            householdData={household}
                                          />
                                        )}
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="no-data-state">
                          <p>No energy consumption data available</p>
                        </div>
                      )}
                    </div>
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