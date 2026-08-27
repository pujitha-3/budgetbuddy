import { useEffect, useMemo, useState } from "react";
import { FaBullseye, FaPlus, FaTrash, FaCalendarAlt, FaCheckCircle, FaCoins, FaEdit } from "react-icons/fa";
import Layout from "../components/Layout";
import {
  addNotification,
  hasSavingsCompletionNotification,
} from "../services/notificationService";

const KEY = "budgetbuddy_savings_goals";

export default function SavingsGoals() {
  const [goals, setGoals] = useState([]);
  const [form, setForm] = useState({ name: "", target: "", saved: "", deadline: "" });
  const [contributions, setContributions] = useState({});
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || "[]");
      setGoals(Array.isArray(data) ? data : []);
    } catch {
      setGoals([]);
    }
  }, []);

  const save = (next) => {
    setGoals(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };

  const addGoal = (e) => {
    e.preventDefault();
    const target = Number(form.target);
    const saved = Number(form.saved || 0);
    if (!form.name.trim() || target <= 0) return;

    const initialSaved = Math.min(Math.max(saved, 0), target);
    save([
      ...goals,
      {
        id: Date.now(),
        name: form.name.trim(),
        target,
        saved: initialSaved,
        deadline: form.deadline,
      },
    ]);

    addNotification({
      type: "goal",
      title: "Savings goal created",
      text: `${form.name.trim()} goal was created with a target of ₹${target.toLocaleString("en-IN")}.`,
    });

    if (initialSaved > 0) {
      addNotification({
        type: "goal",
        title: "Initial savings added",
        text: `₹${initialSaved.toLocaleString("en-IN")} was added to ${form.name.trim()}.`,
      });
    }

    if (initialSaved === target) {
      addNotification({
        type: "success",
        title: "Savings goal completed",
        text: `Congratulations! You reached your savings goal '${form.name.trim()}' of ₹${target.toLocaleString("en-IN")}.`,
      });
    }

    setForm({ name: "", target: "", saved: "", deadline: "" });
  };

  const addContribution = (id) => {
    const amount = Number(contributions[id]);
    if (!Number.isFinite(amount) || amount <= 0) return;

    const goal = goals.find((g) => g.id === id);
    if (!goal) return;

    const target = Number(goal.target || 0);
    const previousAmount = Number(goal.saved || 0);
    const remaining = Math.max(0, target - previousAmount);
    if (remaining === 0) return;

    const added = Math.min(amount, remaining);
    const newAmount = previousAmount + added;
    const completed = newAmount >= target;
    const newPercentage = target > 0 ? (newAmount / target) * 100 : 0;

    const nextGoal = {
      ...goal,
      saved: newAmount,
      completionNotified: completed ? true : Boolean(goal.completionNotified),
    };

    save(goals.map((g) => (g.id === id ? nextGoal : g)));
    setContributions((prev) => ({ ...prev, [id]: "" }));

    // Every contribution creates exactly one progress notification.
    // We intentionally do not create retroactive 70/80/90% notifications.
    if (!completed) {
      const progress = Math.min(100, Math.round(newPercentage));
      addNotification({
        type: "goal",
        title: "Savings contribution added",
        text: `₹${added.toLocaleString("en-IN")} added to '${goal.name}'. Progress: ${progress}% (₹${newAmount.toLocaleString("en-IN")} of ₹${target.toLocaleString("en-IN")}).`,
      });
      return;
    }

    // Reaching 100% creates only the single completion notification.
    if (!goal.completionNotified && !hasSavingsCompletionNotification(goal.name)) {
      addNotification({
        type: "success",
        title: "🎉 Savings goal completed",
        text: `Congratulations! You completed '${goal.name}' at ₹${target.toLocaleString("en-IN")}.`,
      });
    }
  };

  const startEdit = (goal) => {
    setEditing(goal.id);
    setEditValue(String(goal.saved));
  };

  const saveEditedAmount = (id) => {
    const goal = goals.find((g) => g.id === id);
    if (!goal) return;

    const value = Math.min(Math.max(Number(editValue) || 0, 0), goal.target);
    const oldValue = goal.saved;
    if (value === oldValue) { setEditing(null); setEditValue(""); return; }
    save(goals.map((g) => (g.id === id ? { ...g, saved: value, completionNotified: value >= goal.target ? true : g.completionNotified } : g)));
    setEditing(null);
    setEditValue("");

    if (value !== oldValue) {
      addNotification({
        type: "info",
        title: "Savings amount edited",
        text: `${goal.name} savings amount changed from ₹${oldValue.toLocaleString("en-IN")} to ₹${value.toLocaleString("en-IN")}.`,
      });
    }

    if (oldValue < goal.target && value === goal.target && !goal.completionNotified && !hasSavingsCompletionNotification(goal.name)) {
      addNotification({
        type: "success",
        title: "Savings goal completed",
        text: `Congratulations! You reached your savings goal '${goal.name}' of ₹${goal.target.toLocaleString("en-IN")}.`,
      });
    }
  };

  const remove = (id) => {
    const goal = goals.find((g) => g.id === id);
    if (!goal) return;
    save(goals.filter((g) => g.id !== id));
    if (goal) {
      addNotification({
        type: "warning",
        title: "Savings goal deleted",
        text: `${goal.name} was removed from your savings goals.`,
      });
    }
  };

  const totals = useMemo(
    () => ({
      target: goals.reduce((s, g) => s + Number(g.target || 0), 0),
      saved: goals.reduce((s, g) => s + Number(g.saved || 0), 0),
    }),
    [goals]
  );

  const overall = totals.target ? Math.min(100, Math.round((totals.saved / totals.target) * 100)) : 0;

  return (
    <Layout>
      <div className="extra-page">
        <div className="extra-head">
          <div>
            <span className="eyebrow">PLAN AHEAD</span>
            <h1>Savings Goals</h1>
            <p>Set goals, add contributions, edit your saved amount and track your progress.</p>
          </div>
          <div className="goal-summary">
            <FaBullseye />
            <div>
              <small>Overall progress</small>
              <strong>{overall}%</strong>
            </div>
          </div>
        </div>

        <div className="goal-layout">
          <form className="extra-card goal-form" onSubmit={addGoal}>
            <h2>Create a savings goal</h2>
            <p>Give your goal a target and optional deadline.</p>

            <label>
              Goal name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. New Laptop" />
            </label>

            <label>
              Target amount
              <input type="number" min="1" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} placeholder="₹50,000" />
            </label>

            <label>
              Already saved
              <input type="number" min="0" value={form.saved} onChange={(e) => setForm({ ...form, saved: e.target.value })} placeholder="₹5,000" />
            </label>

            <label>
              Deadline
              <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </label>

            <button className="primary-btn" type="submit">
              <FaPlus /> Create Goal
            </button>
          </form>

          <div className="goals-list">
            {goals.length === 0 ? (
              <div className="extra-card empty-state">
                <FaBullseye />
                <h2>No savings goals yet</h2>
                <p>Create your first goal and start tracking your progress.</p>
              </div>
            ) : (
              goals.map((g) => {
                const target = Number(g.target || 0);
                const saved = Number(g.saved || 0);
                const pct = target ? Math.min(100, Math.round((saved / target) * 100)) : 0;
                const completed = pct >= 100;

                return (
                  <div className="extra-card goal-item" key={g.id}>
                    <div className="goal-top">
                      <div>
                        <h3>{g.name}</h3>
                        {g.deadline && (
                          <span>
                            <FaCalendarAlt /> {g.deadline}
                          </span>
                        )}
                      </div>
                      <button className="icon-danger" onClick={() => remove(g.id)} title="Delete goal">
                        <FaTrash />
                      </button>
                    </div>

                    <div className="goal-numbers">
                      <strong>₹{saved.toLocaleString("en-IN")}</strong>
                      <span>of ₹{target.toLocaleString("en-IN")}</span>
                    </div>

                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>

                    <div className="goal-bottom">
                      <span>{pct}% complete</span>
                      {completed ? (
                        <b className="complete">
                          <FaCheckCircle /> Goal completed
                        </b>
                      ) : editing === g.id ? (
                        <div className="goal-edit-row">
                          <input type="number" min="0" max={target} value={editValue} onChange={(e) => setEditValue(e.target.value)} />
                          <button className="small-action primary" onClick={() => saveEditedAmount(g.id)}>Save</button>
                          <button className="small-action" onClick={() => setEditing(null)}>Cancel</button>
                        </div>
                      ) : (
                        <button className="edit-saved-btn" onClick={() => startEdit(g)}>
                          <FaEdit /> Edit saved
                        </button>
                      )}
                    </div>

                    {!completed && (
                      <div className="contribution-row">
                        <div className="contribution-label">
                          <FaCoins />
                          <div>
                            <strong>Add contribution</strong>
                            <small>How much did you save for this goal?</small>
                          </div>
                        </div>
                        <div className="contribution-controls">
                          <input
                            type="number"
                            min="1"
                            placeholder="₹ Amount"
                            value={contributions[g.id] || ""}
                            onChange={(e) => setContributions((prev) => ({ ...prev, [g.id]: e.target.value }))}
                          />
                          <button className="small-action primary" onClick={() => addContribution(g.id)}>
                            <FaPlus /> Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
