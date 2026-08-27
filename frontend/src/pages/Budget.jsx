import { useEffect, useMemo, useState } from "react";
import { FaEdit, FaTrash, FaBullseye, FaCheckCircle } from "react-icons/fa";
import toast from "react-hot-toast";
import { getBudgets, addBudget, updateBudget, deleteBudget } from "../services/budgetService";
import api from "../services/api";
import Layout from "../components/Layout";
import { addNotification } from "../services/notificationService";

const CATEGORIES = ["Food", "Transport", "Shopping", "Bills", "Entertainment", "Health", "Education", "Other"];

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export default function Budget() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [budgets, setBudgets] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState({ month: currentMonth, category: "Food", amount: "" });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [b, e] = await Promise.all([getBudgets(), api.get("/expense/")]);
      setBudgets(b.data || []);
      setExpenses(e.data || []);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not load budget data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const spentByCategory = useMemo(() => {
    const map = {};
    expenses.forEach((x) => {
      const date = String(x.date || "");
      if (date.slice(0, 7) !== form.month) return;
      map[x.category || "Other"] = (map[x.category || "Other"] || 0) + Number(x.amount || 0);
    });
    return map;
  }, [expenses, form.month]);

  const budgetMap = useMemo(() => {
    const map = {};
    budgets.forEach((x) => {
      if (x.month === form.month && x.category !== "Overall") map[x.category] = x;
    });
    return map;
  }, [budgets, form.month]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("Enter a valid budget amount");
      return;
    }
    try {
      if (editing) {
        await updateBudget(editing, form);
        addNotification({ type: "success", title: "Budget updated", text: `${form.category} budget was updated to ₹${Number(form.amount).toLocaleString("en-IN")}.` });
      } else {
        await addBudget(form);
        addNotification({ type: "success", title: "Budget added", text: `${form.category} budget of ₹${Number(form.amount).toLocaleString("en-IN")} was saved.` });
      }
      toast.success(editing ? "Budget updated" : `${form.category} budget saved`);
      setEditing(null);
      setForm({ month: form.month, category: "Food", amount: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not save budget");
    }
  };

  const edit = (item) => {
    setEditing(item.budget_id);
    setForm({ month: item.month, category: item.category, amount: item.amount });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (id) => {
    try {
      await deleteBudget(id);
      toast.success("Budget deleted");
      addNotification({ type: "warning", title: "Budget deleted", text: "A category budget was removed." });
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Delete failed");
    }
  };

  const cards = CATEGORIES.map((category) => {
    const budget = Number(budgetMap[category]?.amount || 0);
    const spent = Number(spentByCategory[category] || 0);
    const percent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
    const exceeded = budget > 0 && spent > budget;
    return { category, budget, spent, percent, exceeded, item: budgetMap[category] };
  });

  const totalBudget = cards.reduce((s, x) => s + x.budget, 0);
  const totalSpent = cards.reduce((s, x) => s + x.spent, 0);
  const overallPercent = totalBudget ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

  return (
    <Layout>
      <div className="page-head budget-page-head">
        <div>
          <div className="eyebrow">PLAN AHEAD</div>
          <h1>Budget</h1>
          <p className="muted">Set limits for each category and see exactly how much you have left.</p>
        </div>
        <div className="budget-month-picker">
          <label>Month</label>
          <input type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} />
        </div>
      </div>

      <div className="budget-summary-grid">
        <div className="budget-summary-card"><FaBullseye /><div><small>Total planned</small><strong>{money(totalBudget)}</strong></div></div>
        <div className="budget-summary-card"><span className="summary-dot spent-dot" /><div><small>Spent this month</small><strong>{money(totalSpent)}</strong></div></div>
        <div className="budget-summary-card"><span className="summary-dot remaining-dot" /><div><small>Remaining</small><strong>{money(Math.max(totalBudget - totalSpent, 0))}</strong></div></div>
        <div className="budget-summary-card"><span className="summary-percent">{Math.round(overallPercent)}%</span><div><small>Overall used</small><strong>{totalBudget ? (totalSpent > totalBudget ? "Over budget" : "On track") : "Set budgets"}</strong></div></div>
      </div>

      <div className="panel budget-form-panel">
        <div className="section-title-row">
          <div><h3>{editing ? "Edit category budget" : "Add category budget"}</h3><p className="muted small">Create a separate limit for Food, Transport, Bills and more.</p></div>
        </div>
        <form className="budget-form-grid" onSubmit={submit}>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input type="number" min="1" placeholder="Budget amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <button className="primary-btn" type="submit">{editing ? "Update budget" : "Save budget"}</button>
          {editing && <button type="button" className="secondary-btn" onClick={() => { setEditing(null); setForm({ month: form.month, category: "Food", amount: "" }); }}>Cancel</button>}
        </form>
      </div>

      <div className="budget-section-heading">
        <div><h2>Category budgets</h2><p className="muted">Your monthly progress at a glance.</p></div>
      </div>

      {loading ? <div className="loading">Loading budgets...</div> : (
        <div className="budget-category-grid">
          {cards.map((card) => (
            <div className={`budget-category-card ${card.exceeded ? "budget-exceeded" : ""}`} key={card.category}>
              <div className="budget-card-top">
                <div><span className="budget-category-icon">{card.category === "Food" ? "🍽️" : card.category === "Transport" ? "🚗" : card.category === "Shopping" ? "🛍️" : card.category === "Bills" ? "🧾" : card.category === "Entertainment" ? "🎬" : card.category === "Health" ? "❤️" : card.category === "Education" ? "📚" : "✨"}</span><div><h3>{card.category}</h3><small>{card.budget ? `Limit ${money(card.budget)}` : "No budget set"}</small></div></div>
                {card.item && <div className="budget-card-actions"><button className="table-btn" onClick={() => edit(card.item)} title="Edit"><FaEdit /></button><button className="table-btn danger" onClick={() => remove(card.item.budget_id)} title="Delete"><FaTrash /></button></div>}
              </div>
              <div className="budget-numbers"><div><small>Spent</small><strong>{money(card.spent)}</strong></div><div><small>{card.budget ? "Remaining" : "Set a limit"}</small><strong>{card.budget ? money(Math.max(card.budget - card.spent, 0)) : "—"}</strong></div></div>
              <div className="progress-track budget-progress"><div className={`progress-fill ${card.exceeded ? "over" : ""}`} style={{ width: `${card.percent}%` }} /></div>
              <div className="budget-card-bottom"><span>{card.budget ? `${Math.round((card.spent / card.budget) * 100)}% used` : "No limit yet"}</span>{card.exceeded ? <b className="budget-warning">Over budget</b> : card.budget && card.percent >= 80 ? <b className="budget-warning">Almost full</b> : card.budget ? <b className="budget-good"><FaCheckCircle /> On track</b> : null}</div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
