import { useEffect, useMemo, useState } from "react";
import { FaUniversity, FaEdit, FaTrash, FaPlus, FaWallet } from "react-icons/fa";
import toast from "react-hot-toast";
import Layout from "../components/Layout";
import { addNotification } from "../services/notificationService";
import {
  getBankAccounts,
  addBankAccount,
  updateBankAccount,
  deleteBankAccount,
} from "../services/bankAccountService";

const initial = {
  bank_name: "",
  account_holder: "",
  account_type: "Savings",
  account_number_last4: "",
  ifsc_code: "",
  branch_name: "",
  nickname: "",
  opening_balance: "",
};

const banks = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Canara Bank",
  "Bank of Baroda",
  "Union Bank of India",
  "Punjab National Bank",
  "Other",
];

export default function BankAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(initial);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const res = await getBankAccounts();
      setAccounts(res.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not load bank accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const totalOpening = useMemo(
    () => accounts.reduce((sum, a) => sum + Number(a.opening_balance || 0), 0),
    [accounts]
  );

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.bank_name || !form.account_holder || !/^\d{4}$/.test(form.account_number_last4)) {
      toast.error("Please fill the bank, holder and last 4 account digits");
      return;
    }
    try {
      const payload = { ...form, opening_balance: Number(form.opening_balance || 0) };
      if (editing) {
        await updateBankAccount(editing, payload);
        toast.success("Bank account updated");
        addNotification({ type: "success", title: "Bank account updated", text: `${payload.bank_name} •••• ${payload.account_number_last4} was updated.` });
      } else {
        await addBankAccount(payload);
        toast.success("Bank account added");
        addNotification({ type: "success", title: "Bank account added", text: `${payload.bank_name} •••• ${payload.account_number_last4} was added.` });
      }
      setForm(initial);
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not save bank account");
    }
  };

  const edit = (a) => {
    setEditing(a.account_id);
    setForm({
      bank_name: a.bank_name,
      account_holder: a.account_holder,
      account_type: a.account_type,
      account_number_last4: a.account_number_last4,
      ifsc_code: a.ifsc_code || "",
      branch_name: a.branch_name || "",
      nickname: a.nickname || "",
      opening_balance: a.opening_balance ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (id) => {
    try {
      await deleteBankAccount(id);
      toast.success("Bank account deleted");
      addNotification({ type: "warning", title: "Bank account removed", text: `${accounts.find(a => a.account_id === id)?.bank_name || "Bank account"} •••• ${accounts.find(a => a.account_id === id)?.account_number_last4 || ""} was removed. Your income and expense history has been preserved.` });
      if (editing === id) { setEditing(null); setForm(initial); }
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Delete failed");
    }
  };

  return (
    <Layout>
      <div className="page-head">
        <div>
          <div className="eyebrow">ACCOUNT MANAGEMENT</div>
          <h1>Bank Accounts</h1>
          <p className="muted">Keep your bank details organized in one secure place.</p>
        </div>
        <div className="total-chip"><FaUniversity /> {accounts.length} account{accounts.length !== 1 ? "s" : ""}</div>
      </div>

      <div className="account-layout">
        <section className="panel account-form-card">
          <div className="section-title-row">
            <div>
              <h3>{editing ? "Edit bank account" : "Add bank account"}</h3>
              <p className="muted small">Only the last 4 digits are stored.</p>
            </div>
            <FaUniversity className="section-icon" />
          </div>

          <form className="account-form" onSubmit={submit}>
            <label>Bank name<select name="bank_name" value={form.bank_name} onChange={change}><option value="">Select bank</option>{banks.map(b => <option key={b}>{b}</option>)}</select></label>
            <label>Account holder<input name="account_holder" value={form.account_holder} onChange={change} placeholder="Full name" /></label>
            <label>Account type<select name="account_type" value={form.account_type} onChange={change}><option>Savings</option><option>Current</option><option>Salary</option></select></label>
            <label>Last 4 account digits<input name="account_number_last4" inputMode="numeric" maxLength="4" value={form.account_number_last4} onChange={e => setForm({...form, account_number_last4:e.target.value.replace(/\D/g, "").slice(0,4)})} placeholder="1234" /></label>
            <label>IFSC code<input name="ifsc_code" value={form.ifsc_code} onChange={change} placeholder="SBIN0000000" /></label>
            <label>Branch<input name="branch_name" value={form.branch_name} onChange={change} placeholder="Branch name" /></label>
            <label>Nickname<input name="nickname" value={form.nickname} onChange={change} placeholder="My Salary Account" /></label>
            <label>Opening balance<input type="number" min="0" name="opening_balance" value={form.opening_balance} onChange={change} placeholder="0" /></label>
            <div className="account-form-actions">
              <button className="primary-btn" type="submit">{editing ? <FaEdit /> : <FaPlus />}{editing ? "Update account" : "Add account"}</button>
              {editing && <button className="secondary-btn" type="button" onClick={() => { setEditing(null); setForm(initial); }}>Cancel</button>}
            </div>
          </form>
        </section>

        <section className="account-list">
          <div className="account-summary panel">
            <div><span>Total opening balance</span><strong>₹{totalOpening.toLocaleString()}</strong></div>
            <FaWallet />
          </div>

          {loading ? <div className="panel empty">Loading accounts...</div> : !accounts.length ? (
            <div className="panel empty"><FaUniversity /><h3>No bank accounts yet</h3><p>Add your first bank account to manage it separately.</p></div>
          ) : accounts.map(a => (
            <div className="bank-card panel" key={a.account_id}>
              <div className="bank-card-icon"><FaUniversity /></div>
              <div className="bank-card-main">
                <div className="bank-card-top">
                  <div><h3>{a.nickname || a.bank_name}</h3><p>{a.bank_name} · {a.account_type}</p></div>
                  <div className="bank-actions"><button className="table-btn" onClick={() => edit(a)}><FaEdit /></button><button className="table-btn danger" onClick={() => remove(a.account_id)}><FaTrash /></button></div>
                </div>
                <div className="bank-details">
                  <div><span>Account holder</span><b>{a.account_holder}</b></div>
                  <div><span>Account number</span><b>•••• {a.account_number_last4}</b></div>
                  <div><span>IFSC</span><b>{a.ifsc_code || "—"}</b></div>
                  <div><span>Branch</span><b>{a.branch_name || "—"}</b></div>
                </div>
                <div className="bank-balance"><span>Opening balance</span><strong>₹{Number(a.opening_balance || 0).toLocaleString()}</strong></div>
              </div>
            </div>
          ))}
        </section>
      </div>
    </Layout>
  );
}
