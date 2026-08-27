import { useEffect, useState } from "react";
import { FaMoneyBillWave, FaTrash, FaEdit, FaUniversity, FaWallet } from "react-icons/fa";
import toast from "react-hot-toast";
import { getIncome, addIncome, updateIncome, deleteIncome } from "../services/incomeService";
import { getBankAccounts } from "../services/bankAccountService";
import Layout from "../components/Layout";
import { addNotification } from "../services/notificationService";

const initial = {
  source: "",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  account_type: "Cash",
  bank_name: "",
  bank_account_id: "",
};

export default function Income() {
  const [items, setItems] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(initial);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    try {
      const [incomeRes, accountRes] = await Promise.all([getIncome(), getBankAccounts()]);
      setItems(Array.isArray(incomeRes.data) ? incomeRes.data : []);
      setAccounts(Array.isArray(accountRes.data) ? accountRes.data : []);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not load income");
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.source.trim() || !form.amount || !form.date) {
      toast.error("Please fill all income details");
      return;
    }
    if (form.account_type === "Bank" && !form.bank_account_id) {
      toast.error("Please select a bank account first");
      return;
    }
    const action = editing ? "update" : "add";
    try {
      const payload = {
        source: form.source.trim(),
        amount: Number(form.amount),
        date: form.date,
        account_type: form.account_type,
        bank_name: form.account_type === "Bank" ? form.bank_name || null : null,
        bank_account_id: form.account_type === "Bank" && form.bank_account_id
          ? Number(form.bank_account_id)
          : null,
      };
      if (editing) {
        await updateIncome(editing, payload);
        toast.success("Income updated");
        addNotification({ type: "success", title: "Income updated", text: `Income of ₹${Number(form.amount).toLocaleString("en-IN")} from ${form.source} was updated.` });
      } else {
        await addIncome(payload);
        toast.success("Income added");
        addNotification({ type: "success", title: "Income added", text: `₹${Number(form.amount).toLocaleString("en-IN")} income from ${form.source} was added.` });
      }
      setEditing(null);
      setForm(initial);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not save income");
    }
  };

  const edit = (item) => {
    setEditing(item.income_id);
    setForm({
      source: item.source,
      amount: item.amount,
      date: item.date,
      account_type: item.account_type || "Cash",
      bank_name: item.bank_name || "",
      bank_account_id: item.bank_account_id ? String(item.bank_account_id) : "",
    });
  };

  const del = async (id) => {
    try {
      await deleteIncome(id);
      toast.success("Income deleted");
      addNotification({ type: "warning", title: "Income deleted", text: "An income transaction was deleted from your records." });
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Delete failed");
    }
  };

  const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <Layout>
      <div className="page-head">
        <div>
          <div className="eyebrow">MONEY IN</div>
          <h1>Income</h1>
          <p className="muted">Record income and choose where the money was received.</p>
        </div>
        <div className="total-chip"><FaMoneyBillWave /> Total income&nbsp; <b>₹{total.toLocaleString()}</b></div>
      </div>

      <div className="panel">
        <h3>{editing ? "Edit income" : "Add income"}</h3>
        <form className="form-grid" onSubmit={submit}>
          <input placeholder="Income source" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} />
          <input type="number" min="1" placeholder="Amount" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          <select value={form.account_type} onChange={e => setForm({ ...form, account_type: e.target.value, bank_name: e.target.value === "Bank" ? form.bank_name : "", bank_account_id: e.target.value === "Bank" ? form.bank_account_id : "" })}>
            <option>Cash</option>
            <option>Wallet</option>
            <option>Bank</option>
          </select>

          {form.account_type === "Bank" && (
            <select value={form.bank_account_id} onChange={e => { const id=e.target.value; const a=accounts.find(x=>String(x.account_id)===id); setForm({ ...form, bank_account_id:id, bank_name:a?.bank_name || "" }); }}>
              <option value="">Select saved bank account</option>
              {accounts.filter(a => a.is_active !== false).map(a => (
                <option key={a.account_id} value={String(a.account_id)}>
                  {a.nickname || a.bank_name} •••• {a.account_number_last4}
                </option>
              ))}
            </select>
          )}

          <button className="primary-btn" type="submit">{editing ? "Update income" : "Add income"}</button>
          {editing && <button type="button" className="secondary-btn" onClick={() => { setEditing(null); setForm(initial); }}>Cancel</button>}
        </form>
        {form.account_type === "Bank" && accounts.length === 0 && (
          <p className="muted" style={{ marginBottom: 0 }}>
            No saved bank accounts. Add one from <b>Bank Accounts</b> first.
          </p>
        )}
      </div>

      <div className="panel">
        <h3>Income history</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Source</th><th>Amount</th><th>Date</th><th>Account</th><th>Actions</th></tr></thead>
            <tbody>
              {items.map(item => (
                <tr key={item.income_id}>
                  <td>{item.source}</td>
                  <td className="green-text">₹{Number(item.amount).toLocaleString()}</td>
                  <td>{item.date}</td>
                  <td>
                    {item.account_type === "Bank" ? <><FaUniversity /> {item.bank_name}{item.bank_account_last4 ? ` •••• ${item.bank_account_last4}` : ""}{item.bank_account_id && !accounts.some(a => String(a.account_id) === String(item.bank_account_id)) ? " (Deleted Account)" : ""}</> : item.account_type === "Wallet" ? <><FaWallet /> Wallet</> : <><FaMoneyBillWave /> Cash</>}
                  </td>
                  <td>
                    <button className="table-btn" onClick={() => edit(item)}><FaEdit /></button>
                    <button className="table-btn danger" onClick={() => del(item.income_id)}><FaTrash /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!items.length && <div className="empty">No income records yet.</div>}
        </div>
      </div>
    </Layout>
  );
}
