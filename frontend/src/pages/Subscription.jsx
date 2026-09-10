import { useEffect, useState } from "react";
import {
  FaCrown,
  FaCheckCircle,
  FaChartLine,
  FaFilePdf,
  FaFileExcel,
  FaClock,
  FaPaperPlane,
} from "react-icons/fa";
import toast from "react-hot-toast";
import Layout from "../components/Layout";
import api from "../services/api";

const benefits = [
  [FaChartLine, "6–12 month trends", "Track income and expenses over time."],
  [FaChartLine, "Custom date range", "Choose the period you want to analyze."],
  [FaChartLine, "Category spending over time", "See how your spending categories change month by month."],
  [FaChartLine, "Monthly comparison", "Compare this month with the previous month."],
  [FaChartLine, "Savings contribution trend", "Track contributions to your savings goals over time."],
  [FaFilePdf, "PDF reports", "Print or save your detailed financial report as PDF."],
  [FaFileExcel, "Excel / CSV export", "Export your report data for further analysis."],
];

export default function Subscription() {
  const [role, setRole] = useState(String(sessionStorage.getItem("role") || "student").toLowerCase());
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  const loadRequest = async () => {
    try {
      const profile = await api.get("/profile/me");
      const currentRole = String(profile.data?.role || role || "student").toLowerCase();
      setRole(currentRole);
      sessionStorage.setItem("role", currentRole);

      if (currentRole === "student") {
        const res = await api.get("/premium/my-request");
        setRequest(res.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not load subscription details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequest();
  }, []);

  const requestPremium = async () => {
    setRequesting(true);
    try {
      const res = await api.post("/premium/request");
      setRequest({ request_id: res.data.request_id, status: res.data.status });
      toast.success("Premium request sent to Admin");
    } catch (error) {
      const detail = error.response?.data?.detail || "Could not send Premium request";
      toast.error(detail);
      if (error.response?.status === 400) loadRequest();
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return <Layout><div className="loading">Loading subscription...</div></Layout>;
  }

  const isPremium = role === "premium";
  const isAdmin = role === "admin";
  const pending = request?.status === "Pending";
  const rejected = request?.status === "Rejected";

  return (
    <Layout>
      <div className="page-head subscription-page-head">
        <div>
          <div className="eyebrow">SUBSCRIPTION</div>
          <h1>Subscription</h1>
          <p className="muted">Manage your BudgetBuddy plan and unlock the right level of analytics.</p>
        </div>
        <span className={`role-badge ${role}`}>
          <FaCrown /> {isAdmin ? "Admin" : isPremium ? "Premium" : "Student"}
        </span>
      </div>

      {isAdmin ? (
        <section className="panel subscription-admin-card">
          <div className="subscription-crown"><FaCrown /></div>
          <div>
            <span className="subscription-kicker">ADMIN ACCESS</span>
            <h2>Full analytics enabled</h2>
            <p className="muted">Admin accounts already have Premium-level analytics. Premium access for other users is managed from User Management.</p>
          </div>
        </section>
      ) : isPremium ? (
        <>
          <section className="panel subscription-hero-card">
            <div className="subscription-crown"><FaCrown /></div>
            <div>
              <span className="subscription-kicker">CURRENT PLAN</span>
              <h2>BudgetBuddy Premium</h2>
              <p className="muted">Full financial analytics are enabled for your account.</p>
            </div>
            <div className="subscription-active"><FaCheckCircle /> Active</div>
          </section>

          <section className="panel subscription-benefits">
            <div className="profile-section-title">
              <div>
                <h2>Premium benefits</h2>
                <p className="muted">Everything you need for deeper financial analysis.</p>
              </div>
            </div>
            <div className="subscription-benefit-grid">
              {benefits.map(([Icon, title, text]) => (
                <div key={title}>
                  <Icon />
                  <div><strong>{title}</strong><p>{text}</p></div>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="panel premium-upgrade-card subscription-student-hero">
            <div className="premium-upgrade-icon"><FaCrown /></div>
            <div className="premium-upgrade-content">
              <div className="premium-upgrade-title">
                <h2>Premium — Full Analytics</h2>
                <span className="student-plan-pill">Current plan: Student</span>
              </div>
              <p className="muted">Upgrade to unlock 6–12 month trends, custom date ranges, category spending over time, month-to-month comparison, savings contribution trends and PDF/Excel export.</p>

              {pending ? (
                <div className="premium-request-status pending">
                  <FaClock />
                  <div><strong>Premium request pending</strong><span>Your request has been sent to the Admin for approval.</span></div>
                </div>
              ) : rejected ? (
                <div className="premium-request-status rejected">
                  <div><strong>Previous request was declined</strong><span>You can send a new request when you are ready.</span></div>
                  <button className="primary-btn" onClick={requestPremium} disabled={requesting}>
                    <FaPaperPlane /> {requesting ? "Sending..." : "Request Premium again"}
                  </button>
                </div>
              ) : (
                <button className="primary-btn premium-request-btn" onClick={requestPremium} disabled={requesting}>
                  <FaCrown /> {requesting ? "Sending request..." : "Request Premium"}
                </button>
              )}
            </div>
          </section>

          <section className="panel subscription-preview">
            <div className="profile-section-title">
              <div>
                <h2>What you will get</h2>
                <p className="muted">Your current Student plan keeps Reports simple. Premium unlocks these advanced features after Admin approval.</p>
              </div>
            </div>
            <div className="subscription-benefit-grid">
              {benefits.map(([Icon, title, text]) => (
                <div key={title}>
                  <Icon />
                  <div><strong>{title}</strong><p>{text}</p></div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </Layout>
  );
}
