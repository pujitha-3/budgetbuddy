import { useEffect, useMemo, useState } from "react";
import { FaBullseye, FaPlus, FaTrash, FaCalendarAlt, FaCheckCircle, FaCoins, FaEdit, FaUniversity, FaWallet } from "react-icons/fa";
import toast from "react-hot-toast";
import Layout from "../components/Layout";
import { addNotification } from "../services/notificationService";
import { listSavingsGoals, createSavingsGoal, updateSavingsGoal, deleteSavingsGoal, addSavingsContribution } from "../services/savingsService";
import { getBankAccounts } from "../services/bankAccountService";
import api from "../services/api";

const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function SavingsGoals() {
  const [goals, setGoals] = useState([]);
  const [form, setForm] = useState({ name: "", target: "", saved: "", deadline: "" });
  const [contributions, setContributions] = useState({});
  const [sources, setSources] = useState({});
  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState({ bank: 0, cash: 0, wallet: 0 });
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [res, accountRes, dashRes] = await Promise.all([listSavingsGoals(), getBankAccounts(), api.get("/dashboard/")]);
      setGoals(res.data || []);
      const bankRows = dashRes.data?.bank_accounts || [];
      setAccounts((accountRes.data || []).map(a => ({ ...a, current_balance: Number(bankRows.find(b => b.account_id === a.account_id)?.balance ?? a.opening_balance ?? 0) })));
      setBalances({ bank: Number(dashRes.data?.total_bank_balance || 0), cash: Number(dashRes.data?.cash_balance || 0), wallet: Number(dashRes.data?.wallet_balance || 0) });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not load savings goals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addGoal = async (e) => {
    e.preventDefault();
    const target = Number(form.target);
    const saved = Number(form.saved || 0);
    if (!form.name.trim() || target <= 0 || saved < 0) {
      toast.error("Enter a goal name and valid target amount");
      return;
    }
    try {
      const res = await createSavingsGoal({ name: form.name.trim(), target, saved: Math.min(saved, target), deadline: form.deadline || null });
      setGoals((prev) => [res.data, ...prev]);
      addNotification({ type: "goal", title: "Savings goal created", text: `${res.data.name} was created with a target of ${money(res.data.target)}.` });
      if (res.data.saved >= res.data.target) {
        addNotification({ type: "success", title: "🎉 Savings goal completed", text: `Congratulations! You completed '${res.data.name}' at ${money(res.data.target)}.` });
      }
      setForm({ name: "", target: "", saved: "", deadline: "" });
      toast.success("Savings goal created");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not create goal");
    }
  };

  const addContribution = async (id) => {
    const amount = Number(contributions[id]);
    if (!Number.isFinite(amount) || amount <= 0) return toast.error("Enter a valid contribution amount");
    try {
      const sourceKey = sources[id] || (accounts.length ? `bank:${accounts[0].account_id}` : "Cash");
      let source_type = sourceKey === "Cash" || sourceKey === "Wallet" ? sourceKey : "Bank";
      let bank_account_id = source_type === "Bank" ? Number(sourceKey.split(":")[1]) : null;
      const res = await addSavingsContribution(id, { amount, source_type, bank_account_id });
      const data = res.data;
      setGoals((prev) => prev.map((g) => g.goal_id === id ? data.goal : g));
      setContributions((prev) => ({ ...prev, [id]: "" }));
      toast.success(data.notification.title.includes("completed") ? "Goal completed!" : "Contribution added");
      await load();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not add contribution");
    }
  };

  const saveEditedAmount = async (id) => {
    const goal = goals.find((g) => g.goal_id === id);
    if (!goal) return;
    const value = Math.min(Math.max(Number(editValue) || 0, 0), Number(goal.target));
    try {
      const res = await updateSavingsGoal(id, { saved: value });
      setGoals((prev) => prev.map((g) => g.goal_id === id ? res.data : g));
      if (value !== Number(goal.saved)) {
        addNotification({ type: "info", title: "Savings amount edited", text: `${goal.name} changed from ${money(goal.saved)} to ${money(value)}.` });
      }
      if (Number(goal.saved) < Number(goal.target) && value >= Number(goal.target)) {
        addNotification({ type: "success", title: "🎉 Savings goal completed", text: `Congratulations! You completed '${goal.name}' at ${money(goal.target)}.` });
      }
      setEditing(null); setEditValue("");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not update savings amount");
    }
  };

  const remove = async (id) => {
    const goal = goals.find((g) => g.goal_id === id);
    if (!goal) return;
    try {
      await deleteSavingsGoal(id);
      setGoals((prev) => prev.filter((g) => g.goal_id !== id));
      addNotification({ type: "warning", title: "Savings goal deleted", text: `${goal.name} was removed from your savings goals.` });
      toast.success("Savings goal deleted");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not delete goal");
    }
  };

  const totals = useMemo(() => ({
    target: goals.reduce((s, g) => s + Number(g.target || 0), 0),
    saved: goals.reduce((s, g) => s + Number(g.saved || 0), 0),
  }), [goals]);
  const overall = totals.target ? Math.min(100, Math.round(totals.saved / totals.target * 100)) : 0;

  return <Layout>
    <div className="extra-page">
      <div className="extra-head">
        <div><span className="eyebrow">PLAN AHEAD</span><h1>Savings Goals</h1><p>Set goals, add contributions, edit your saved amount and track your progress.</p></div>
        <div className="goal-summary"><FaBullseye /><div><small>Overall progress</small><strong>{overall}%</strong></div></div>
      </div>
      <div className="goal-layout">
        <form className="extra-card goal-form" onSubmit={addGoal}>
          <h2>Create a savings goal</h2><p>Give your goal a target and optional deadline.</p>
          <label>Goal name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. New Laptop" /></label>
          <label>Target amount<input type="number" min="1" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} placeholder="₹50,000" /></label>
          <label>Already saved<input type="number" min="0" value={form.saved} onChange={(e) => setForm({ ...form, saved: e.target.value })} placeholder="₹5,000" /></label>
          <label>Deadline<input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></label>
          <button className="primary-btn" type="submit"><FaPlus /> Create Goal</button>
        </form>
        <div className="goals-list">
          {loading ? <div className="extra-card empty-state"><h2>Loading goals...</h2></div> : goals.length === 0 ? <div className="extra-card empty-state"><FaBullseye /><h2>No savings goals yet</h2><p>Create your first goal and start tracking your progress.</p></div> : goals.map((g) => {
            const target = Number(g.target || 0); const saved = Number(g.saved || 0); const pct = target ? Math.min(100, Math.round(saved / target * 100)) : 0; const completed = pct >= 100;
            return <div className="extra-card goal-item" key={g.goal_id}>
              <div className="goal-top"><div><h3>{g.name}</h3>{g.deadline && <span><FaCalendarAlt /> {g.deadline}</span>}</div><button type="button" className="icon-danger" onClick={() => remove(g.goal_id)}><FaTrash /></button></div>
              <div className="goal-numbers"><strong>{money(saved)}</strong><span>of {money(target)}</span></div>
              <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
              <div className="goal-bottom"><span>{pct}% complete</span>{completed ? <b className="complete"><FaCheckCircle /> Goal completed</b> : editing === g.goal_id ? <div className="goal-edit-row"><input type="number" min="0" max={target} value={editValue} onChange={(e) => setEditValue(e.target.value)} /><button type="button" className="small-action primary" onClick={() => saveEditedAmount(g.goal_id)}>Save</button><button type="button" className="small-action" onClick={() => setEditing(null)}>Cancel</button></div> : <button type="button" className="edit-saved-btn" onClick={() => { setEditing(g.goal_id); setEditValue(String(saved)); }}><FaEdit /> Edit saved</button>}</div>
              {!completed && <div className="contribution-row"><div className="contribution-label"><FaCoins /><div><strong>Add contribution</strong><small>How much did you save for this goal?</small></div></div><div className="contribution-controls"><select value={sources[g.goal_id] || (accounts.length ? `bank:${accounts[0].account_id}` : "Cash")} onChange={(e) => setSources((p) => ({ ...p, [g.goal_id]: e.target.value }))}>
{accounts.map((a) => <option key={a.account_id} value={`bank:${a.account_id}`}>{a.nickname || a.bank_name} •••• {a.account_number_last4} (₹{Number(a.current_balance || 0).toLocaleString("en-IN")})</option>)}
<option value="Cash">Cash (₹{Number(balances.cash || 0).toLocaleString("en-IN")})</option><option value="Wallet">Wallet (₹{Number(balances.wallet || 0).toLocaleString("en-IN")})</option></select><input type="number" min="1" placeholder="₹ Amount" value={contributions[g.goal_id] || ""} onChange={(e) => setContributions((p) => ({ ...p, [g.goal_id]: e.target.value }))} /><button type="button" className="small-action primary" onClick={() => addContribution(g.goal_id)}><FaPlus /> Add</button></div></div>}
            </div>;
          })}
        </div>
      </div>
    </div>
  </Layout>;
}
