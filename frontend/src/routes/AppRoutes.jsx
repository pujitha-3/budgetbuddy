import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import Income from "../pages/Income";
import Expense from "../pages/Expense";
import Budget from "../pages/Budget";
import Profile from "../pages/Profile";
import SavingsGoals from "../pages/SavingsGoals";
import Notifications from "../pages/Notifications";
import BankAccounts from "../pages/BankAccounts";
import Reports from "../pages/Reports";

function Protected({ children }) {
  return localStorage.getItem("token") ? children : <Navigate to="/" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/income" element={<Protected><Income /></Protected>} />
      <Route path="/expense" element={<Protected><Expense /></Protected>} />
      <Route path="/budget" element={<Protected><Budget /></Protected>} />
      <Route path="/savings" element={<Protected><SavingsGoals /></Protected>} />
      <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
      <Route path="/bank-accounts" element={<Protected><BankAccounts /></Protected>} />
      <Route path="/profile" element={<Protected><Profile /></Protected>} />
      <Route path="/reports" element={<Protected><Reports /></Protected>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
