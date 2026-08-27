import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FaWallet, FaChartPie, FaMoneyBillWave, FaReceipt, FaBullseye, FaUserCircle, FaSignOutAlt, FaBell, FaPiggyBank, FaUniversity, FaFileAlt } from "react-icons/fa";
import { addNotification, getUnreadCount } from "../services/notificationService";

export default function Layout({ children }) {
  const nav = useNavigate();
  const [unread, setUnread] = useState(getUnreadCount());

  useEffect(() => {
    const refresh = () => setUnread(getUnreadCount());
    window.addEventListener("storage", refresh);
    window.addEventListener("budgetbuddy:notifications", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("budgetbuddy:notifications", refresh);
    };
  }, []);

  const links = [
    ["/dashboard", "Dashboard", FaChartPie],
    ["/income", "Income", FaMoneyBillWave],
    ["/expense", "Expenses", FaReceipt],
    ["/budget", "Budget", FaBullseye],
    ["/savings", "Savings Goals", FaPiggyBank],
    ["/notifications", "Notifications", FaBell],
    ["/reports", "Reports", FaFileAlt],
    ["/bank-accounts", "Bank Accounts", FaUniversity],
    ["/profile", "Profile", FaUserCircle],
  ];

  const logout = () => {
    addNotification({ type: "info", title: "Logged out", text: "You signed out of BudgetBuddy." });
    localStorage.removeItem("token");
    nav("/");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><FaWallet />BudgetBuddy</div>
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
