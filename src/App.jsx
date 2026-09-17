/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/employees";

// Deterministic color palette for avatars
const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
  "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
  "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
  "linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)",
];

const getAvatarColor = (name = "") => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
};

const getInitials = (name = "") => {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "EP";
};

// Role styling helper
const getRoleStyle = (role = "") => {
  const r = role.toLowerCase();
  if (r.includes("dev") || r.includes("engineer") || r.includes("tech")) {
    return { bg: "rgba(6, 182, 212, 0.15)", text: "#22d3ee", border: "rgba(6, 182, 212, 0.3)" };
  }
  if (r.includes("design") || r.includes("ui") || r.includes("ux")) {
    return { bg: "rgba(168, 85, 247, 0.15)", text: "#c084fc", border: "rgba(168, 85, 247, 0.3)" };
  }
  if (r.includes("manage") || r.includes("lead") || r.includes("director")) {
    return { bg: "rgba(16, 185, 129, 0.15)", text: "#34d399", border: "rgba(16, 185, 129, 0.3)" };
  }
  if (r.includes("qa") || r.includes("test") || r.includes("analyst")) {
    return { bg: "rgba(245, 158, 11, 0.15)", text: "#fbbf24", border: "rgba(245, 158, 11, 0.3)" };
  }
  return { bg: "rgba(99, 102, 241, 0.15)", text: "#818cf8", border: "rgba(99, 102, 241, 0.3)" };
};

const POPULAR_ROLES = [
  "Fullstack Developer",
  "Frontend Engineer",
  "Backend Engineer",
  "UI/UX Designer",
  "Product Manager",
  "DevOps Engineer",
  "QA Specialist",
];

function App() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  // Form State
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "",
    salary: "",
  });
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_URL);
      setEmployees(res.data);
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.message || "Failed to load employees", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Form Handling
  const handleOpenAddModal = () => {
    setEditingEmployee(null);
    setForm({ name: "", email: "", role: "", salary: "" });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (employee) => {
    setEditingEmployee(employee);
    setForm({
      name: employee.name,
      email: employee.email,
      role: employee.role,
      salary: employee.salary.toString(),
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
    setFormError("");
  };

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!form.name.trim() || !form.email.trim() || !form.role.trim() || form.salary === "") {
      setFormError("All fields are required.");
      return;
    }

    if (isNaN(Number(form.salary)) || Number(form.salary) < 0) {
      setFormError("Salary must be a positive number.");
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingEmployee) {
        await axios.put(`${API_URL}/${editingEmployee.id}`, form);
        addToast("Employee details updated successfully!");
      } else {
        await axios.post(API_URL, form);
        addToast("Employee added successfully!");
      }
      handleCloseModal();
      fetchEmployees();
    } catch (err) {
      console.error(err);
      setFormError(
        err.response?.data?.message || "Operation failed. Check server logs."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`${API_URL}/${deleteTarget.id}`);
      addToast(`Deleted ${deleteTarget.name} successfully!`);
      setDeleteTarget(null);
      fetchEmployees();
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.message || "Failed to delete employee", "error");
    }
  };

  // Stats Calculations
  const stats = useMemo(() => {
    const total = employees.length;
    const totalPayroll = employees.reduce((acc, curr) => acc + (Number(curr.salary) || 0), 0);
    const avgSalary = total > 0 ? Math.round(totalPayroll / total) : 0;
    const uniqueRoles = new Set(employees.map((e) => e.role)).size;
    return { total, totalPayroll, avgSalary, uniqueRoles };
  }, [employees]);

  // Unique Roles for Filter Pills
  const availableRoles = useMemo(() => {
    const roles = Array.from(new Set(employees.map((e) => e.role).filter(Boolean)));
    return ["All", ...roles];
  }, [employees]);

  // Filtered & Sorted Employees
  const filteredEmployees = useMemo(() => {
    return employees
      .filter((emp) => {
        const query = searchQuery.toLowerCase();
        const matchesQuery =
          emp.name?.toLowerCase().includes(query) ||
          emp.email?.toLowerCase().includes(query) ||
          emp.role?.toLowerCase().includes(query);

        const matchesRole =
          selectedRoleFilter === "All" || emp.role === selectedRoleFilter;

        return matchesQuery && matchesRole;
      })
      .sort((a, b) => {
        if (sortBy === "newest") return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortBy === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
        if (sortBy === "name-asc") return a.name.localeCompare(b.name);
        if (sortBy === "name-desc") return b.name.localeCompare(a.name);
        if (sortBy === "salary-high") return Number(b.salary) - Number(a.salary);
        if (sortBy === "salary-low") return Number(a.salary) - Number(b.salary);
        return 0;
      });
  }, [employees, searchQuery, selectedRoleFilter, sortBy]);

  return (
    <div className="app-container">
      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            {toast.type === "success" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <div className="brand-title">
              StaffSync
              <span className="brand-badge">Prisma + MongoDB</span>
            </div>
            <div className="brand-subtitle">
              Enterprise Employee Directory & Payroll Management
            </div>
          </div>
        </div>

        <div className="header-actions">
          <button className="btn-primary" onClick={handleOpenAddModal}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Employee
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <section className="stats-grid">
        <div className="stat-card" style={{ "--card-accent": "linear-gradient(90deg, #6366f1, #8b5cf6)" }}>
          <div className="stat-card-header">
            <span className="stat-label">Total Workforce</span>
            <div className="stat-icon-wrap" style={{ color: "#818cf8" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-subtext">Active team members</div>
        </div>

        <div className="stat-card" style={{ "--card-accent": "linear-gradient(90deg, #10b981, #059669)" }}>
          <div className="stat-card-header">
            <span className="stat-label">Total Payroll</span>
            <div className="stat-icon-wrap" style={{ color: "#34d399" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <div className="stat-value">₹{stats.totalPayroll.toLocaleString("en-IN")}</div>
          <div className="stat-subtext">Annual cumulative salary</div>
        </div>

        <div className="stat-card" style={{ "--card-accent": "linear-gradient(90deg, #06b6d4, #3b82f6)" }}>
          <div className="stat-card-header">
            <span className="stat-label">Avg. Compensation</span>
            <div className="stat-icon-wrap" style={{ color: "#22d3ee" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </div>
          </div>
          <div className="stat-value">₹{stats.avgSalary.toLocaleString("en-IN")}</div>
          <div className="stat-subtext">Per employee baseline</div>
        </div>

        <div className="stat-card" style={{ "--card-accent": "linear-gradient(90deg, #f59e0b, #ec4899)" }}>
          <div className="stat-card-header">
            <span className="stat-label">Roles & Departments</span>
            <div className="stat-icon-wrap" style={{ color: "#fbbf24" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </div>
          </div>
          <div className="stat-value">{stats.uniqueRoles}</div>
          <div className="stat-subtext">Specialized functions</div>
        </div>
      </section>

      {/* Toolbar / Filters */}
      <section className="toolbar-card">
        <div className="toolbar-main-row">
          <div className="search-wrapper">
            <span className="search-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              className="search-input"
              placeholder="Search by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="search-clear" onClick={() => setSearchQuery("")}>
                ✕
              </button>
            )}
          </div>

          <div className="toolbar-actions">
            <div className="select-wrapper">
              <span>Sort:</span>
              <select
                className="custom-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name-asc">Name (A - Z)</option>
                <option value="name-desc">Name (Z - A)</option>
                <option value="salary-high">Salary (High to Low)</option>
                <option value="salary-low">Salary (Low to High)</option>
              </select>
            </div>

            <div className="view-toggle-group">
              <button
                className={`view-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
                onClick={() => setViewMode("grid")}
                title="Grid View"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </button>
              <button
                className={`view-toggle-btn ${viewMode === "table" ? "active" : ""}`}
                onClick={() => setViewMode("table")}
                title="Table View"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Chips */}
        {availableRoles.length > 2 && (
          <div className="filter-chips-row">
            {availableRoles.map((role) => (
              <button
                key={role}
                className={`filter-chip ${selectedRoleFilter === role ? "active" : ""}`}
                onClick={() => setSelectedRoleFilter(role)}
              >
                {role}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "16px", fontWeight: "600" }}>Loading directory...</div>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="10" />
              <line x1="8" y1="15" x2="16" y2="15" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </div>
          <div className="empty-title">
            {searchQuery || selectedRoleFilter !== "All"
              ? "No matching employees found"
              : "No employees added yet"}
          </div>
          <div className="empty-desc">
            {searchQuery || selectedRoleFilter !== "All"
              ? "Try adjusting your search query or reset the role filters to view all records."
              : "Start building your team roster by adding your first employee."}
          </div>
          {searchQuery || selectedRoleFilter !== "All" ? (
            <button
              className="btn-secondary"
              onClick={() => {
                setSearchQuery("");
                setSelectedRoleFilter("All");
              }}
            >
              Reset Filters
            </button>
          ) : (
            <button className="btn-primary" onClick={handleOpenAddModal}>
              + Add First Employee
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="employees-grid">
          {filteredEmployees.map((emp) => {
            const roleStyle = getRoleStyle(emp.role);
            return (
              <div key={emp.id} className="employee-card">
                <div>
                  <div className="card-top">
                    <div className="avatar-info">
                      <div
                        className="avatar"
                        style={{ background: getAvatarColor(emp.name) }}
                      >
                        {getInitials(emp.name)}
                      </div>
                      <div>
                        <div className="employee-name">{emp.name}</div>
                        <div
                          className="role-badge"
                          style={{
                            background: roleStyle.bg,
                            color: roleStyle.text,
                            border: `1px solid ${roleStyle.border}`,
                          }}
                        >
                          {emp.role}
                        </div>
                      </div>
                    </div>

                    <div className="card-actions">
                      <button
                        className="btn-icon edit"
                        title="Edit Employee"
                        onClick={() => handleOpenEditModal(emp)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        className="btn-icon delete"
                        title="Delete Employee"
                        onClick={() => setDeleteTarget(emp)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="card-details">
                    <div className="detail-row">
                      <svg className="detail-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                      <span>{emp.email}</span>
                    </div>

                    <div className="detail-row">
                      <svg className="detail-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="1" x2="12" y2="23" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                      <span className="salary-highlight">₹{Number(emp.salary).toLocaleString("en-IN")}</span>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>/ year</span>
                    </div>

                    <div className="detail-row" style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      <svg className="detail-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <span>
                        Added {emp.createdAt ? new Date(emp.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recently"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Role</th>
                <th>Email</th>
                <th>Salary</th>
                <th>Joined</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => {
                const roleStyle = getRoleStyle(emp.role);
                return (
                  <tr key={emp.id}>
                    <td>
                      <div className="table-user-cell">
                        <div
                          className="avatar"
                          style={{
                            width: "36px",
                            height: "36px",
                            fontSize: "13px",
                            background: getAvatarColor(emp.name),
                          }}
                        >
                          {getInitials(emp.name)}
                        </div>
                        <div className="table-user-name">{emp.name}</div>
                      </div>
                    </td>
                    <td>
                      <span
                        className="role-badge"
                        style={{
                          background: roleStyle.bg,
                          color: roleStyle.text,
                          border: `1px solid ${roleStyle.border}`,
                        }}
                      >
                        {emp.role}
                      </span>
                    </td>
                    <td>{emp.email}</td>
                    <td>
                      <span className="salary-highlight">₹{Number(emp.salary).toLocaleString("en-IN")}</span>
                    </td>
                    <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {emp.createdAt ? new Date(emp.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <button
                          className="btn-icon edit"
                          title="Edit"
                          onClick={() => handleOpenEditModal(emp)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          className="btn-icon delete"
                          title="Delete"
                          onClick={() => setDeleteTarget(emp)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-light)" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
                {editingEmployee ? "Edit Employee" : "Add New Employee"}
              </div>
              <button className="modal-close" onClick={handleCloseModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="alert-box alert-error">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {formError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <div className="form-input-wrap">
                    <span className="form-input-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </span>
                    <input
                      name="name"
                      className="form-input"
                      placeholder="e.g. Alex Morgan"
                      value={form.name}
                      onChange={handleInputChange}
                      autoFocus
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Corporate Email</label>
                  <div className="form-input-wrap">
                    <span className="form-input-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </span>
                    <input
                      name="email"
                      type="email"
                      className="form-input"
                      placeholder="e.g. alex.morgan@company.com"
                      value={form.email}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Role / Job Title</label>
                  <div className="form-input-wrap">
                    <span className="form-input-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                      </svg>
                    </span>
                    <input
                      name="role"
                      className="form-input"
                      placeholder="e.g. Senior Frontend Engineer"
                      value={form.role}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="role-suggestions">
                    {POPULAR_ROLES.map((r) => (
                      <button
                        key={r}
                        type="button"
                        className="suggestion-chip"
                        onClick={() => setForm((prev) => ({ ...prev, role: r }))}
                      >
                        + {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Annual Salary (INR ₹)</label>
                  <div className="form-input-wrap">
                    <span className="form-input-icon" style={{ fontWeight: "700", fontSize: "15px" }}>
                      ₹
                    </span>
                    <input
                      name="salary"
                      type="number"
                      className="form-input"
                      placeholder="e.g. 850000"
                      value={form.salary}
                      onChange={handleInputChange}
                    />
                  </div>
                  {form.salary && !isNaN(Number(form.salary)) && (
                    <div style={{ fontSize: "12px", color: "#34d399", marginTop: "4px" }}>
                      Formatted: ₹{Number(form.salary).toLocaleString("en-IN")} / year
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : editingEmployee ? "Update Employee" : "Add Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-content" style={{ maxWidth: "420px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ color: "#fb7185" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Confirm Delete
              </div>
              <button className="modal-close" onClick={() => setDeleteTarget(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.6" }}>
                Are you sure you want to permanently delete{" "}
                <strong style={{ color: "var(--text-primary)" }}>{deleteTarget.name}</strong>?
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "8px" }}>
                This record will be immediately removed from the MongoDB database and cannot be recovered.
              </p>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleDeleteConfirm}
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;