import { useEffect, useState } from "react";
import { FaUsers, FaRupeeSign, FaArrowUp, FaArrowDown } from "react-icons/fa";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import toast from "react-hot-toast";
import Layout from "../components/Layout";
import api from "../services/api";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function SystemAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/reports/system")
      .then((res) => setData(res.data))
      .catch((error) => toast.error(error.response?.data?.detail || "Could not load system analytics"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout><div className="loading">Loading system analytics...</div></Layout>;

  return <Layout>
    <div className="page-head">
      <div>
        <div className="eyebrow">ADMIN</div>
        <h1>System Analytics</h1>
        <p className="muted">Aggregated financial statistics across all users.</p>
      </div>
    </div>

    <div className="report-stat-grid">
      <div className="report-stat"><FaUsers /><small>Total users</small><strong>{data?.total_users || 0}</strong></div>
      <div className="report-stat"><FaArrowUp /><small>Total income</small><strong>{money(data?.total_income)}</strong></div>
      <div className="report-stat"><FaArrowDown /><small>Total expenses</small><strong>{money(data?.total_expenses)}</strong></div>
      <div className="report-stat"><FaRupeeSign /><small>Total balance</small><strong>{money(data?.total_balance)}</strong></div>
    </div>

    <div className="panel">
      <div className="chart-heading"><div><h3>System monthly activity</h3><p className="muted">Aggregated income and expenses for the last 12 active months.</p></div></div>
      {data?.monthly?.length ? <ResponsiveContainer width="100%" height={380}><BarChart data={data.monthly}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis tickFormatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} /><Tooltip formatter={(v) => money(v)} /><Legend /><Bar dataKey="income" name="Income" fill="#10B981" radius={[8,8,0,0]} /><Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[8,8,0,0]} /></BarChart></ResponsiveContainer> : <div className="chart-empty">No system transaction data yet.</div>}
    </div>
  </Layout>;
}
