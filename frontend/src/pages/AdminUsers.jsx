import { useEffect, useState } from "react";
import { FaUsers, FaCrown, FaBell, FaCheck, FaTimes } from "react-icons/fa";
import toast from "react-hot-toast";
import Layout from "../components/Layout";
import api from "../services/api";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [usersRes, reqRes] = await Promise.all([
        api.get("/admin/users"),
        api.get("/premium/admin/requests"),
      ]);
      setUsers(usersRes.data || []);
      setRequests(reqRes.data || []);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Admin access required");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const changeRole = async (userId, role) => {
    try {
      const res = await api.put(`/admin/users/${userId}/role`, null, { params: { role } });
      setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, role: res.data.role } : u));
      toast.success(res.data.message);
    } catch (error) { toast.error(error.response?.data?.detail || "Could not change role"); }
  };

  const review = async (requestId, decision) => {
    try {
      const res = await api.put(`/premium/admin/requests/${requestId}`, null, { params: { decision } });
      toast.success(res.data.message);
      await load();
    } catch (error) { toast.error(error.response?.data?.detail || "Could not review request"); }
  };

  return <Layout>
    <div className="page-head">
      <div><div className="eyebrow">ADMIN CONTROL</div><h1>User Management</h1><p className="muted">One Admin controls Student and Premium access for all users.</p></div>
      <span className="role-badge admin"><FaCrown /> Admin</span>
    </div>

    <div className="panel admin-users-panel">
      <div className="chart-heading"><div><h3><FaBell /> Premium upgrade requests</h3><p className="muted">Students can request Premium. Approve a request to change Student → Premium.</p></div></div>
      {loading ? <div className="loading">Loading requests...</div> : requests.filter(r => r.status === "Pending").length === 0 ? <div className="admin-request-empty">No pending Premium requests.</div> :
        <div className="admin-request-list">{requests.filter(r => r.status === "Pending").map(r => <div className="admin-request-row" key={r.request_id}><div><strong>{r.name}</strong><span>{r.email}</span></div><div className="admin-request-actions"><button className="primary-btn" onClick={() => review(r.request_id,"approve")}><FaCheck/> Approve Premium</button><button className="secondary-btn" onClick={() => review(r.request_id,"reject")}><FaTimes/> Reject</button></div></div>)}</div>}
    </div>

    <div className="panel admin-users-panel">
      <div className="chart-heading"><div><h3><FaUsers /> All users</h3><p className="muted">The single Admin account cannot be changed from this page.</p></div></div>
      {loading ? <div className="loading">Loading users...</div> : <div className="admin-users-table"><div className="admin-user-row admin-user-head"><span>Name</span><span>Email</span><span>Role</span><span>Action</span></div>{users.map(u => <div className="admin-user-row" key={u.user_id}><span>{u.name}</span><span>{u.email}</span><span><b className={`mini-role ${String(u.role).toLowerCase()}`}>{u.role}</b></span><span>{String(u.role).toLowerCase()==="admin" ? <small>Single Admin account</small> : <select value={u.role} onChange={e => changeRole(u.user_id,e.target.value)}><option>Student</option><option>Premium</option></select>}</span></div>)}</div>}
    </div>
  </Layout>;
}
