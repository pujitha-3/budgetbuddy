import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FaWallet, FaChartPie, FaMoneyBillWave, FaReceipt, FaBullseye, FaUserCircle, FaSignOutAlt, FaBell, FaPiggyBank, FaUniversity, FaFileAlt, FaCrown } from "react-icons/fa";
import { addNotification, getUnreadCount } from "../services/notificationService";
import api from "../services/api";

export default function Layout({ children }) {
  const nav = useNavigate();
  const [unread, setUnread] = useState(0);
  const [role, setRole] = useState("");

  useEffect(() => {
    const refresh = () => getUnreadCount().then(setUnread);
    refresh();
    const timer = setInterval(refresh, 10000);
    window.addEventListener("storage", refresh);
    window.addEventListener("budgetbuddy:notifications", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("budgetbuddy:notifications", refresh);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!sessionStorage.getItem("token")) return;
    api.get("/profile/me")
      .then((res) => setRole(String(res.data?.role || "").toLowerCase()))
      .catch(() => setRole(""));
  }, []);

  const links = [
    ["/dashboard", "Dashboard", FaChartPie],
    ["/income", "Income", FaMoneyBillWave],
    ["/expense", "Expenses", FaReceipt],
    ["/budget", "Budget", FaBullseye],
    ["/savings", "Savings Goals", FaPiggyBank],
    ["/notifications", "Notifications", FaBell],
    ["/reports", "Reports", FaFileAlt],
    ...(role === "admin" ? [["/system-analytics", "System Analytics", FaChartPie], ["/admin-users", "User Management", FaUserCircle]] : []),
    ...((role === "premium" || role === "student") ? [["/subscription", "Subscription", FaCrown]] : []),
    ["/bank-accounts", "Bank Accounts", FaUniversity],
    ["/profile", "Profile", FaUserCircle],
  ];

  const logout = () => {
    addNotification({ type: "info", title: "Logged out", text: "You signed out of BudgetBuddy." });
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("role");
    nav("/");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><FaWallet />BudgetBuddy</div>
        {role && <div className={`sidebar-role ${role}`}><FaCrown /> {role === "admin" ? "Admin" : role === "premium" ? "Premium" : "Student"}</div>}
        <nav>
          {links.map(([to, title, Icon]) => (
            <NavLink key={to} to={to} className={({ isActive }) => isActive ? "active" : ""}>
              <Icon />
              <span>{title}</span>
              {to === "/notifications" && unread > 0 && <b className="nav-badge">{unread > 99 ? "99+" : unread}</b>}
            </NavLink>
          ))}
        </nav>
        <button className="logout" onClick={logout}><FaSignOutAlt />Logout</button>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
