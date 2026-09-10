import { useEffect, useMemo, useState } from "react";
import {
  FaArrowDown,
  FaArrowUp,
  FaCalendarAlt,
  FaChartLine,
  FaCrown,
  FaDownload,
  FaLock,
  FaPiggyBank,
  FaRupeeSign,
} from "react-icons/fa";
import toast from "react-hot-toast";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Layout from "../components/Layout";
import api from "../services/api";
import { addNotification } from "../services/notificationService";

const COLORS = [
  "#4F46E5",
  "#06B6D4",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#84CC16",
];

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const formatDate = (date) => date.toISOString().slice(0, 10);

const getToday = () => formatDate(new Date());

const getMonthStart = () => {
  const now = new Date();
  return formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
};

const getTwelveMonthStart = () => {
  const now = new Date();
  return formatDate(new Date(now.getFullYear(), now.getMonth() - 11, 1));
};

const roleLabel = (role) => {
  if (role === "admin") return "Admin";
  if (role === "premium") return "Premium";
  return "Student";
};

export default function Reports() {
  const [profile, setProfile] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [start, setStart] = useState(getTwelveMonthStart());
  const [end, setEnd] = useState(getToday());
  const [premiumRequest, setPremiumRequest] = useState(null);
  const [requestingPremium, setRequestingPremium] = useState(false);

  const role = String(profile?.role || "student").trim().toLowerCase();
  const isPremium = role === "premium" || role === "admin";
  const isAdmin = role === "admin";

  const loadBasicReport = async () => {
    // Student analytics are deliberately locked to the current month.
    const res = await api.get("/reports/summary");
    setReport({ ...res.data, display_period_label: "Current month" });
  };

  const loadPremiumReport = async (from = start, to = end) => {
    const res = await api.get("/reports/premium", {
      params: { start_date: from, end_date: to },
    });
    setReport({ ...res.data, display_period_label: "Selected date range" });
  };

  const load = async (currentRole = role) => {
    setLoading(true);
    try {
      if (currentRole === "premium" || currentRole === "admin") {
        await loadPremiumReport();
      } else {
        await loadBasicReport();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not load report");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    api
      .get("/profile/me")
      .then(async (res) => {
        if (!mounted) return;
        const currentRole = String(res.data?.role || "student")
          .trim()
          .toLowerCase();
        setProfile(res.data);
        if (currentRole === "student") {
          api.get("/premium/my-request").then((r) => setPremiumRequest(r.data)).catch(() => {});
        }

        try {
          if (currentRole === "premium" || currentRole === "admin") {
            await loadPremiumReport();
          } else {
            await loadBasicReport();
          }
        } catch (error) {
          toast.error(
            error.response?.data?.detail || "Could not load report"
          );
          if (mounted) setReport(null);
        } finally {
          if (mounted) setLoading(false);
        }
      })
      .catch((error) => {
        toast.error(error.response?.data?.detail || "Could not load profile");
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const summary = report?.summary || {};
  const categoryData = report?.categories || [];
  const monthly = report?.monthly || [];
  const categoryTrend = report?.category_trend || [];
  const comparison = report?.comparison;
  const savingsTrend = report?.savings_trend || [];
  const goals = report?.savings_goals || [];
  const topCategory = categoryData[0];

  const categoryKeys = useMemo(() => {
    const keys = new Set();
    categoryTrend.forEach((row) => {
      Object.keys(row).forEach((key) => {
        if (key !== "month") keys.add(key);
      });
    });
    return [...keys];
  }, [categoryTrend]);

  const csv = useMemo(() => {
    if (!report) return "";

    const rows = [
      ["BudgetBuddy Financial Report"],
      ["Role", roleLabel(role)],
      ["Period", report.period?.start, report.period?.end],
      [],
      ["Summary"],
      ["Income", summary.income],
      ["Expenses", summary.expenses],
      ["Net", summary.net],
      ["Savings Rate", `${summary.savings_rate || 0}%`],
      ["Transactions", summary.transaction_count || 0],
      ["Average Expense", summary.average_expense || 0],
      [],
      ["Monthly Trend"],
      ["Month", "Income", "Expenses", "Balance"],
      ...monthly.map((item) => [
        item.month,
        item.income,
        item.expenses,
        item.balance,
      ]),
      [],
      ["Expense Categories"],
      ["Category", "Amount"],
      ...categoryData.map((item) => [item.category, item.amount]),
      [],
      ["Savings Goal Progress"],
      ["Goal", "Saved", "Target", "Percentage"],
      ...goals.map((goal) => [
        goal.name,
        goal.saved,
        goal.target,
        `${goal.percentage || 0}%`,
      ]),
      [],
      ["Savings Contributions"],
      ["Month", "Amount"],
      ...savingsTrend.map((item) => [item.month, item.amount]),
    ];

    return rows
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");
  }, [report, role, summary, monthly, categoryData, goals, savingsTrend]);

  const exportExcel = () => {
    if (!report) return;

    const rows = csv
      .split("\n")
      .map(
        (row) =>
          `<tr>${row
            .split(",")
            .map((cell) => `<td>${cell.replace(/^"|"$/g, "").replaceAll('""', '"')}</td>`)
            .join("")}</tr>`
      )
      .join("");

    const html = `<!doctype html><html><head><meta charset="UTF-8"></head><body><table border="1">${rows}</table></body></html>`;
    const url = URL.createObjectURL(
      new Blob([html], { type: "application/vnd.ms-excel" })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `budgetbuddy-report-${report.period.start}-to-${report.period.end}.xls`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    addNotification({
      type: "success",
      title: "Report exported",
      text: `Financial report exported for ${report.period.start} to ${report.period.end}.`,
    });
    toast.success("Excel report downloaded");
  };

  const requestPremium = async () => {
    setRequestingPremium(true);
    try {
      const res = await api.post("/premium/request");
      setPremiumRequest(res.data);
      toast.success("Premium request sent to Admin");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not send Premium request");
    } finally {
      setRequestingPremium(false);
    }
  };

  const generatePremium = async () => {
    if (!start || !end) {
      toast.error("Please select both dates");
      return;
    }

    if (start > end) {
      toast.error("From date cannot be after To date");
      return;
    }

    setLoading(true);
    try {
      await loadPremiumReport(start, end);
      toast.success("Premium report generated");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not generate report");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading">Preparing your financial report...</div>
      </Layout>
    );
  }

  if (!report) {
    return (
      <Layout>
        <div className="loading">No report data available.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-head report-head">
        <div>
          <div className="eyebrow">ANALYTICS</div>
          <h1>Financial Reports</h1>
          <p className="muted">
            Understand your income, spending, savings and financial trends.
          </p>
        </div>

        <div className="report-actions">
          <span className={`role-badge ${role}`}>
            <FaCrown /> {roleLabel(role)}
          </span>

          {isPremium && (
            <>
              <button
                className="secondary-btn report-download"
                onClick={() => window.print()}
              >
                <FaDownload /> Print / Save PDF
              </button>
              <button
                className="primary-btn report-download"
                onClick={exportExcel}
              >
                <FaDownload /> Export Excel
              </button>
            </>
          )}
        </div>
      </div>

      {role === "student" && (
        <div className="basic-report-banner">
          <strong>Student — Basic Analytics</strong>
          <span>
            Current month only. Premium unlocks historical trends, custom date
            ranges, comparisons and exports.
          </span>
        </div>
      )}

      {role === "premium" && (
        <div className="basic-report-banner premium-report-banner">
          <strong>Premium — Full Analytics</strong>
          <span>
            Advanced trends, custom date ranges, comparisons, savings trends
            and PDF/Excel export are enabled.
          </span>
        </div>
      )}

      {isAdmin && (
        <div className="basic-report-banner admin-report-banner">
          <strong>Admin — Full Analytics</strong>
          <span>
            This report contains the Admin account's own Premium analytics. Use
            System Analytics for aggregated data across all users.
          </span>
        </div>
      )}

      {isPremium && (
        <div className="report-filter panel">
          <div>
            <FaCalendarAlt />
            <label>
              From
              <input
                type="date"
                value={start}
                onChange={(event) => setStart(event.target.value)}
              />
            </label>
          </div>
          <div>
            <FaCalendarAlt />
            <label>
              To
              <input
                type="date"
                value={end}
                onChange={(event) => setEnd(event.target.value)}
              />
            </label>
          </div>
          <button className="primary-btn" onClick={generatePremium}>
            Generate report
          </button>
        </div>
      )}

      <div className="report-stat-grid">
        <div className="report-stat">
          <FaArrowUp />
          <small>Total income</small>
          <strong>{money(summary.income)}</strong>
        </div>
        <div className="report-stat">
          <FaArrowDown />
          <small>Total expenses</small>
          <strong>{money(summary.expenses)}</strong>
        </div>
        <div className="report-stat">
          <FaPiggyBank />
          <small>Savings rate</small>
          <strong>{summary.savings_rate || 0}%</strong>
        </div>
        <div className="report-stat">
          <FaRupeeSign />
          <small>Net cash flow</small>
          <strong className={summary.net < 0 ? "red-text" : "green-text"}>
            {money(summary.net)}
          </strong>
        </div>
      </div>

      <div className="report-highlight-grid">
        <div className="panel report-highlight">
          <span>Top spending category</span>
          <strong>{topCategory?.category || "No expenses"}</strong>
          <b>{money(topCategory?.amount)}</b>
        </div>
        <div className="panel report-highlight">
          <span>Average expense</span>
          <strong>{money(summary.average_expense)}</strong>
          <b>{summary.transaction_count || 0} transactions</b>
        </div>
        <div className="panel report-highlight">
          <span>Total budget configured</span>
          <strong>{money(report.budget_total)}</strong>
          <b>Compare this with actual spending.</b>
        </div>
      </div>

      {/* BASIC ANALYTICS — Student, Premium and Admin */}
      <div className="report-chart-grid">
        <div className="panel">
          <div className="chart-heading">
            <div>
              <h3>Spending by category</h3>
              <p className="muted">
                {isPremium ? "Selected date range." : "Current month."}
              </p>
            </div>
          </div>

          {categoryData.length ? (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="amount"
                  nameKey="category"
                  cx="50%"
                  cy="45%"
                  innerRadius={58}
                  outerRadius={100}
                  paddingAngle={3}
                >
                  {categoryData.map((item, index) => (
                    <Cell
                      key={`${item.category}-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => money(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">No expense data for this period.</div>
          )}
        </div>

        <div className="panel">
          <div className="chart-heading">
            <div>
              <h3>Income vs Expense</h3>
              <p className="muted">Quick comparison for the selected period.</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={[
                {
                  name: isPremium ? "Selected period" : "Current month",
                  income: summary.income || 0,
                  expenses: summary.expenses || 0,
                },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis
                tickFormatter={(value) =>
                  `₹${Number(value).toLocaleString("en-IN")}`
                }
              />
              <Tooltip formatter={(value) => money(value)} />
              <Legend />
              <Bar
                dataKey="income"
                name="Income"
                fill="#10B981"
                radius={[8, 8, 0, 0]}
              />
              <Bar
                dataKey="expenses"
                name="Expenses"
                fill="#EF4444"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel savings-report-panel">
        <div className="chart-heading">
          <div>
            <h3>Savings Goal Progress</h3>
            <p className="muted">
              Track the percentage completed for each active goal.
            </p>
          </div>
        </div>

        {goals.length ? (
          <div className="report-goals-list">
            {goals.map((goal) => (
              <div className="goal-progress-row" key={goal.goal_id}>
                <div className="goal-progress-top">
                  <strong>{goal.name}</strong>
                  <span>{Math.round(goal.percentage || 0)}%</span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(100, Number(goal.percentage || 0))}%`,
                    }}
                  />
                </div>
                <div className="goal-money">
                  {money(goal.saved)} of {money(goal.target)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="chart-empty">No active savings goals.</div>
        )}
      </div>

      {/* PREMIUM ANALYTICS — Premium and Admin only */}
      {isPremium ? (
        <>
          <div className="panel premium-section-panel">
            <div className="chart-heading">
              <div>
                <h3>
                  <FaChartLine /> 6–12 month income & expense trend
                </h3>
                <p className="muted">
                  Historical monthly income and expenses for the selected range.
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis
                  tickFormatter={(value) =>
                    `₹${Number(value).toLocaleString("en-IN")}`
                  }
                />
                <Tooltip formatter={(value) => money(value)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  name="Expenses"
                  stroke="#EF4444"
                  strokeWidth={3}
                  dot
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="panel premium-section-panel">
            <div className="chart-heading">
              <div>
                <h3>Category spending over time</h3>
                <p className="muted">
                  See how each expense category changes month by month.
                </p>
              </div>
            </div>

            {categoryTrend.length ? (
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={categoryTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis
                    tickFormatter={(value) =>
                      `₹${Number(value).toLocaleString("en-IN")}`
                    }
                  />
                  <Tooltip formatter={(value) => money(value)} />
                  <Legend />
                  {categoryKeys.map((category, index) => (
                    <Bar
                      key={category}
                      dataKey={category}
                      name={category}
                      stackId="expenses"
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">No category trend data.</div>
            )}
          </div>

          <div className="report-highlight-grid">
            <div className="panel report-highlight">
              <span>This month expenses</span>
              <strong>{money(comparison?.this_month?.expenses)}</strong>
              <b>Current month</b>
            </div>
            <div className="panel report-highlight">
              <span>Last month expenses</span>
              <strong>{money(comparison?.last_month?.expenses)}</strong>
              <b>Previous month</b>
            </div>
            <div className="panel report-highlight">
              <span>Spending change</span>
              <strong
                className={
                  Number(comparison?.change_percentage || 0) > 0
                    ? "red-text"
                    : "green-text"
                }
              >
                {comparison?.change_percentage || 0}%
              </strong>
              <b>Compared with last month</b>
            </div>
          </div>

          <div className="panel premium-section-panel">
            <div className="chart-heading">
              <div>
                <h3>Savings-goal contribution trend</h3>
                <p className="muted">
                  Contribution history stored in the backend database.
                </p>
              </div>
            </div>

            {savingsTrend.length ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={savingsTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis
                    tickFormatter={(value) =>
                      `₹${Number(value).toLocaleString("en-IN")}`
                    }
                  />
                  <Tooltip formatter={(value) => money(value)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    name="Savings contributions"
                    stroke="#8B5CF6"
                    strokeWidth={3}
                    dot
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">
                No savings contributions recorded in this period.
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="premium-upgrade-card">
          <div className="premium-icon"><FaLock /></div>
          <div>
            <h3>Premium — Full Analytics</h3>
            <p>Upgrade to unlock 6–12 month trends, custom date ranges, category spending over time, month-to-month comparison, savings contribution trends and PDF/Excel export.</p>
            {premiumRequest?.status === "Pending" ? <button className="secondary-btn" disabled>Premium request pending</button> : <button className="primary-btn" onClick={requestPremium} disabled={requestingPremium}>{requestingPremium ? "Sending request..." : "Request Premium"}</button>}
            {premiumRequest?.status === "Rejected" && <small className="muted" style={{display:"block",marginTop:8}}>Your previous request was declined. You can request again.</small>}
          </div>
        </div>
      )}

      {/* ADMIN-ONLY SYSTEM ANALYTICS */}
      {isAdmin && (
        <div className="panel admin-analytics-link">
          <div>
            <FaChartLine />
            <div>
              <h3>Admin System Analytics</h3>
              <p className="muted">
                View aggregated income, expenses and activity across all users.
                This section is available only to the single Admin account.
              </p>
            </div>
          </div>
          <a className="primary-btn" href="/system-analytics">
            Open System Analytics
          </a>
        </div>
      )}
    </Layout>
  );
}
