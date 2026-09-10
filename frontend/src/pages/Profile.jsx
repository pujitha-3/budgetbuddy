import { useEffect, useState } from "react";
import {
  FaUserCircle,
  FaEnvelope,
  FaPhone,
  FaIdBadge,
  FaEdit,
  FaSave,
  FaTimes,
  FaShieldAlt,
} from "react-icons/fa";
import toast from "react-hot-toast";
import api from "../services/api";
import Layout from "../components/Layout";

const roleLabel = (role) => {
  const value = String(role || "student").toLowerCase();
  if (value === "admin") return "Admin";
  if (value === "premium") return "Premium";
  return "Student";
};

export default function Profile() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get("/profile/me");
      setUser(res.data);
      setForm({ name: res.data?.name || "", phone: res.data?.phone || "" });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    setSaving(true);
    try {
      const res = await api.put("/profile/me", {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
      });
      setUser(res.data);
      setForm({ name: res.data?.name || "", phone: res.data?.phone || "" });
      setEditing(false);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  const role = String(user?.role || "student").toLowerCase();
  const label = roleLabel(role);

  return (
    <Layout>
      <div className="page-head profile-head">
        <div>
          <div className="eyebrow">ACCOUNT</div>
          <h1>Profile</h1>
          <p className="muted">Manage your BudgetBuddy account details.</p>
        </div>
        {user && !editing && (
          <button className="secondary-btn profile-edit-btn" onClick={() => setEditing(true)}>
            <FaEdit /> Edit profile
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading">Loading your profile...</div>
      ) : !user ? (
        <div className="empty">Profile information is unavailable.</div>
      ) : editing ? (
        <form className="panel profile-edit-card" onSubmit={saveProfile}>
          <div className="profile-section-title">
            <div>
              <h2>Edit profile</h2>
              <p className="muted">Update your personal information.</p>
            </div>
            <span className={`role-badge ${role}`}>{label}</span>
          </div>

          <div className="profile-form-grid">
            <label>
              Full name
              <div className="profile-input">
                <FaUserCircle />
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your name"
                />
              </div>
            </label>

            <label>
              Email address
              <div className="profile-input readonly">
                <FaEnvelope />
                <input value={user.email} readOnly />
              </div>
            </label>

            <label>
              Phone number
              <div className="profile-input">
                <FaPhone />
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                  maxLength={30}
                />
              </div>
            </label>
          </div>

          <div className="profile-edit-actions">
            <button type="button" className="secondary-btn" onClick={() => {
              setForm({ name: user.name || "", phone: user.phone || "" });
              setEditing(false);
            }}>
              <FaTimes /> Cancel
            </button>
            <button type="submit" className="primary-btn" disabled={saving}>
              <FaSave /> {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      ) : (
        <div className="profile-modern-grid">
          <section className="panel profile-main-card">
            <div className="profile-avatar-wrap">
              <FaUserCircle className="profile-avatar" />
              <span className={`role-badge ${role}`}>{label}</span>
            </div>
            <h2>{user.name}</h2>
            <p className="muted">{user.email}</p>
            <div className="profile-status"><FaShieldAlt /> Account active</div>
          </section>

          <section className="panel profile-details-card">
            <div className="profile-section-title">
              <div>
                <h2>Personal information</h2>
                <p className="muted">Your account details.</p>
              </div>
            </div>

            <div className="profile-detail-list">
              <div className="profile-detail">
                <span className="profile-detail-icon"><FaUserCircle /></span>
                <div><small>Full name</small><strong>{user.name || "Not added"}</strong></div>
              </div>
              <div className="profile-detail">
                <span className="profile-detail-icon"><FaEnvelope /></span>
                <div><small>Email address</small><strong>{user.email}</strong></div>
              </div>
              <div className="profile-detail">
                <span className="profile-detail-icon"><FaPhone /></span>
                <div><small>Phone number</small><strong>{user.phone || "Not added"}</strong></div>
              </div>
              <div className="profile-detail">
                <span className="profile-detail-icon"><FaIdBadge /></span>
                <div><small>Account type</small><strong>{label}</strong></div>
              </div>
            </div>
          </section>
        </div>
      )}
    </Layout>
  );
}
