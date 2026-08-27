import { useEffect, useState } from "react";
import { FaTrash, FaEdit, FaUniversity, FaWallet, FaMoneyBillWave } from "react-icons/fa";
import toast from "react-hot-toast";
import { getExpenses, addExpense, updateExpense, deleteExpense } from "../services/expenseService";
import { getBankAccounts } from "../services/bankAccountService";
import Layout from "../components/Layout";
import { addNotification } from "../services/notificationService";

const initial = {
  title: "",
  category: "Food",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  payment_method: "Cash",
  bank_account_id: "",
  bank_name: "",
};

const bankLabel = (a) => `${a.nickname || a.bank_name} •••• ${a.account_number_last4}`;

export default function Expense() {
  const [items, setItems] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [f, setF] = useState(initial);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    try {
      const [expenseRes, accountRes] = await Promise.all([
        getExpenses(),
        getBankAccounts(),
      ]);
      setItems(expenseRes.data);
      setAccounts(accountRes.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not load expenses");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();

    if (!f.title.trim() || !f.amount || !f.date) {
      toast.error("Please fill all expense details");
      return;
    }

    if (f.payment_method === "Bank" && !f.bank_account_id) {
      toast.error("Please select a saved bank account");
      return;
    }

    try {
      const selected = accounts.find(
        (a) => String(a.account_id) === String(f.bank_account_id)
      );

      const payload = {
        title: f.title.trim(),
        category: f.category,
        amount: Number(f.amount),
        date: f.date,
        payment_method: f.payment_method,
        bank_account_id:
          f.payment_method === "Bank" ? Number(f.bank_account_id) : null,
        // Backend keeps this for compatibility and fills it from the selected account.
        bank_name:
          f.payment_method === "Bank" ? selected?.bank_name || f.bank_name : null,
      };

      if (editing) {
        await updateExpense(editing, payload);
        toast.success("Expense updated");
        addNotification({ type: "success", title: "Expense updated", text: `₹${Number(f.amount).toLocaleString("en-IN")} expense for ${f.title} was updated.` });
      } else {
        await addExpense(payload);
        toast.success("Expense added");
        addNotification({ type: "warning", title: "Expense added", text: `₹${Number(f.amount).toLocaleString("en-IN")} spent on ${f.title}.` });
      }

      setEditing(null);
      setF(initial);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not save expense");
    }
  };

  const edit = (item) => {
    setEditing(item.expense_id);

    // New records have bank_account_id. Old records may only have bank_name.
    let accountId = item.bank_account_id || "";
    if (!accountId && item.bank_name) {
      const match = accounts.find((a) => a.bank_name === item.bank_name);
      if (match) accountId = match.account_id;
    }

    setF({
      title: item.title,
      category: item.category,
      amount: item.amount,
      date: item.date,
      payment_method: item.payment_method || "Cash",
      bank_account_id: accountId,
      bank_name: item.bank_name || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const del = async (id) => {

    try {
      await deleteExpense(id);
      toast.success("Expense deleted");
      addNotification({ type: "info", title: "Expense deleted", text: "An expense transaction was deleted from your records." });
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Delete failed");
    }
  };

  const paymentText = (item) => {
    if (item.payment_method === "Bank") {
      const account = accounts.find(
        (a) => Number(a.account_id) === Number(item.bank_account_id)
      );

      if (account) return bankLabel(account);
      if (item.bank_name && item.bank_account_last4) {
        return `${item.bank_name} •••• ${item.bank_account_last4}`;
      }
      return item.bank_name || "Bank";
    }

    if (item.payment_method === "Wallet") return "Wallet";
    return "Cash";
  };

  return (
    <Layout>
      <div className="page-head">
        <div>
          <div className="eyebrow">MONEY OUT</div>
          <h1>Expenses</h1>
          <p className="muted">Track every purchase clearly.</p>
        </div>
      </div>

      <div className="panel">
        <h3>{editing ? "Edit expense" : "Add expense"}</h3>

        <form className="form-grid" onSubmit={submit}>
          <input
            placeholder="Expense title"
            value={f.title}
            onChange={(e) => setF({ ...f, title: e.target.value })}
          />

          <select
            value={f.category}
            onChange={(e) => setF({ ...f, category: e.target.value })}
          >
            {["Food", "Travel", "Shopping", "Education", "Entertainment", "Bills", "Health", "Other"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>

          <input
            type="number"
            min="1"
            placeholder="Amount"
            value={f.amount}
            onChange={(e) => setF({ ...f, amount: e.target.value })}
          />

          <input
            type="date"
            value={f.date}
            onChange={(e) => setF({ ...f, date: e.target.value })}
          />

          <select
            value={f.payment_method}
            onChange={(e) =>
              setF({
                ...f,
                payment_method: e.target.value,
                bank_account_id: e.target.value === "Bank" ? f.bank_account_id : "",
                bank_name: e.target.value === "Bank" ? f.bank_name : "",
              })
            }
          >
            <option value="Cash">Cash</option>
            <option value="Wallet">Wallet</option>
            <option value="Bank">Bank Account</option>
          </select>

          {f.payment_method === "Bank" && (
            <select
              value={f.bank_account_id}
              onChange={(e) => {
                const account = accounts.find(
                  (a) => String(a.account_id) === e.target.value
                );
                setF({
                  ...f,
                  bank_account_id: e.target.value,
                  bank_name: account?.bank_name || "",
                });
              }}
            >
              <option value="">Select bank account</option>
              {accounts.map((a) => (
                <option key={a.account_id} value={a.account_id}>
                  {bankLabel(a)}
                </option>
              ))}
            </select>
          )}

          <button className="primary-btn" type="submit">
            {editing ? "Update expense" : "Add expense"}
          </button>

          {editing && (
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                setEditing(null);
                setF(initial);
              }}
            >
              Cancel
            </button>
          )}
        </form>

        {f.payment_method === "Bank" && accounts.length === 0 && (
          <p className="muted" style={{ marginBottom: 0 }}>
            No saved bank accounts. Add one from <b>Bank Accounts</b> first.
          </p>
        )}
      </div>

      <div className="panel">
        <h3>Expense history</h3>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Payment</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {items.map((x) => (
                <tr key={x.expense_id}>
                  <td>{x.title}</td>
                  <td>{x.category}</td>
                  <td className="red-text">₹{Number(x.amount).toLocaleString()}</td>
                  <td>{x.date}</td>
                  <td>
                    {x.payment_method === "Bank" ? <FaUniversity /> : x.payment_method === "Wallet" ? <FaWallet /> : <FaMoneyBillWave />}{" "}
                    {paymentText(x)}
                  </td>
                  <td>
                    <button className="table-btn" onClick={() => edit(x)}>
                      <FaEdit />
                    </button>
                    <button className="table-btn danger" onClick={() => del(x.expense_id)}>
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!items.length && <div className="empty">No expense records yet.</div>}
        </div>
      </div>
    </Layout>
  );
}
