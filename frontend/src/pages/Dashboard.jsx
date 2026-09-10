import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  FaArrowUp,
  FaArrowDown,
  FaWallet,
  FaBullseye,
  FaPlus,
  FaUniversity,
  FaChevronRight,
  FaPiggyBank,
  FaCalendarAlt,
} from "react-icons/fa";

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import api from "../services/api";
import Layout from "../components/Layout";

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);

  // =========================
  // LOAD DASHBOARD DATA
  // =========================

  const loadDashboard = async () => {
    try {
      const [dash, inc, exp] = await Promise.all([
        api.get("/dashboard/"),
        api.get("/income/"),
        api.get("/expense/"),
      ]);

      setD(dash.data);
      setIncomes(inc.data);
      setExpenses(exp.data);

      // Savings goals come from the authenticated user's backend data.
      // This prevents goals from being shared between different accounts
      // on the same browser/device.
      setSavingsGoals(dash.data?.savings_goals || []);
    } catch (error) {
      console.error("Dashboard loading error:", error);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // =========================
  // EXPENSE CATEGORY DATA
  // =========================

  const categoryData = useMemo(() => {
    const map = {};

    expenses.forEach((x) => {
      const category = x.category || "Other";

      map[category] =
        (map[category] || 0) + Number(x.amount || 0);
    });

    return Object.entries(map)
      .map(([category, amount]) => ({
        category,
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  // =========================
  // MONEY OVERVIEW DATA
  // =========================

  const cashflowData = useMemo(() => {
    const income = incomes.reduce(
      (sum, x) => sum + Number(x.amount || 0),
      0
    );

    const expense = expenses.reduce(
      (sum, x) => sum + Number(x.amount || 0),
      0
    );

    return [
      {
        name: "Income",
        amount: income,
      },
      {
        name: "Expenses",
        amount: expense,
      },
      {
        name: "Balance",
        amount: Number(d?.balance || 0),
      },
    ];
  }, [incomes, expenses, d?.balance]);

  // =========================
  // LOADING
  // =========================

  if (!d) {
    return (
      <Layout>
        <div className="loading">
          Loading your finances...
        </div>
      </Layout>
    );
  }

  // =========================
  // BANK ACCOUNTS
  // =========================

  const bankAccounts = d.bank_accounts || [];

  // =========================
  // SAVINGS GOALS
  // =========================

  const savingsTarget = savingsGoals.reduce(
    (sum, goal) =>
      sum + Number(goal.target || 0),
    0
  );

  const savingsSaved = savingsGoals.reduce(
    (sum, goal) =>
      sum + Number(goal.saved || 0),
    0
  );

  const savingsProgress = savingsTarget
    ? Math.min(
        100,
        Math.round(
          (savingsSaved / savingsTarget) * 100
        )
      )
    : 0;

  // =========================
  // CATEGORY COLORS
  // =========================

  const categoryColors = [
    "#3B82F6", // Blue
    "#22C55E", // Green
    "#F97316", // Orange
    "#A855F7", // Purple
    "#EC4899", // Pink
    "#EAB308", // Yellow
    "#06B6D4", // Cyan
    "#14B8A6", // Teal
  ];

  // =========================
  // DASHBOARD
  // =========================

  return (
    <Layout>
      <div className="page-head">
        <div>
          <div className="eyebrow">
            OVERVIEW
          </div>

          <h1>
            Welcome to BudgetBuddy 👋
          </h1>

          <p className="muted">
            See your money clearly and make better
            decisions.
          </p>
        </div>
      </div>

      {/* =========================
          STAT CARDS
      ========================= */}

      <div className="stats-grid">

        <div className="stat">
          <FaWallet />

          <div>
            <small>Total balance</small>

            <strong>
              ₹
              {Number(
                d.balance
              ).toLocaleString()}
            </strong>
          </div>
        </div>

        <div className="stat">
          <FaArrowUp />

          <div>
            <small>Total income</small>

            <strong>
              ₹
              {Number(
                d.total_income
              ).toLocaleString()}
            </strong>
          </div>
        </div>

        <div className="stat">
          <FaArrowDown />

          <div>
            <small>Total expenses</small>

            <strong>
              ₹
              {Number(
                d.total_expenses
              ).toLocaleString()}
            </strong>
          </div>
        </div>

        <div className="stat">
          <FaBullseye />

          <div>
            <small>Budget</small>

            <strong>
              ₹
              {Number(
                d.monthly_budget
              ).toLocaleString()}
            </strong>
          </div>
        </div>

      </div>

      {/* =========================
          BANK BALANCES
      ========================= */}

      <div className="panel bank-dashboard-panel">

        <div className="chart-heading bank-dashboard-heading">

          <div>
            <div className="eyebrow">
              BANKING
            </div>

            <h3>
              Bank Account Balances
            </h3>

            <p className="muted">
              Current balance = opening balance +
              bank income − bank expenses.
            </p>
          </div>

          <div className="bank-total-box">

            <FaUniversity />

            <div>
              <small>
                Total in bank accounts
              </small>

              <strong>
                ₹
                {Number(
                  d.total_bank_balance || 0
                ).toLocaleString()}
              </strong>
            </div>

          </div>

        </div>

        {bankAccounts.length > 0 ? (

          <div className="dashboard-bank-grid">

            {bankAccounts.map((account) => (

              <div
                className="dashboard-bank-card"
                key={account.account_id}
              >

                <div className="dashboard-bank-icon">
                  <FaUniversity />
                </div>

                <div className="dashboard-bank-main">

                  <div className="dashboard-bank-title">

                    <div>

                      <h4>
                        {account.nickname ||
                          account.bank_name}
                      </h4>

                      <p>
                        {account.bank_name} ••••{" "}
                        {account.last4}
                      </p>

                    </div>

                    <span>
                      {account.account_type}
                    </span>

                  </div>

                  <strong
                    className={
                      Number(account.balance) < 0
                        ? "red-text"
                        : "green-text"
                    }
                  >
                    ₹
                    {Number(
                      account.balance || 0
                    ).toLocaleString()}
                  </strong>

                </div>

              </div>

            ))}

          </div>

        ) : (

          <div className="bank-dashboard-empty">

            <FaUniversity />

            <div>
              <h4>
                No bank accounts added yet
              </h4>

              <p>
                Add your bank account to see its
                balance here.
              </p>
            </div>

            <Link to="/bank-accounts">
              Add Bank Account{" "}
              <FaChevronRight />
            </Link>

          </div>

        )}

        <div className="money-source-summary">

          <div>
            <span>Bank</span>

            <strong>
              ₹
              {Number(
                d.total_bank_balance || 0
              ).toLocaleString()}
            </strong>
          </div>

          <div>
            <span>Cash</span>

            <strong>
              ₹
              {Number(
                d.cash_balance || 0
              ).toLocaleString()}
            </strong>
          </div>

          <div>
            <span>Wallet</span>

            <strong>
              ₹
              {Number(
                d.wallet_balance || 0
              ).toLocaleString()}
            </strong>
          </div>

          <div className="money-source-total">

            <span>
              Total available
            </span>

            <strong>
              ₹
              {Number(
                d.balance || 0
              ).toLocaleString()}
            </strong>

          </div>

        </div>

      </div>

      {/* =========================
          SAVINGS GOALS
      ========================= */}

      <div className="panel savings-dashboard-panel">

        <div className="chart-heading savings-dashboard-heading">

          <div>

            <div className="eyebrow">
              PLAN AHEAD
            </div>

            <h3>
              Savings Goals
            </h3>

            <p className="muted">
              Track how close you are to your
              financial goals.
            </p>

          </div>

          <Link
            className="dashboard-view-link"
            to="/savings"
          >
            View all{" "}
            <FaChevronRight />
          </Link>

        </div>

        {savingsGoals.length > 0 ? (

          <>

            <div className="savings-dashboard-summary">

              <div className="savings-summary-icon">
                <FaPiggyBank />
              </div>

              <div className="savings-summary-main">

                <div>

                  <strong>
                    ₹
                    {savingsSaved.toLocaleString()}
                  </strong>

                  <span>
                    {" "}
                    saved of ₹
                    {savingsTarget.toLocaleString()}
                  </span>

                </div>

                <div className="progress-track">

                  <div
                    className="progress-fill"
                    style={{
                      width: `${savingsProgress}%`,
                    }}
                  />

                </div>

                <small>
                  {savingsProgress}% overall progress •{" "}
                  {savingsGoals.length} goal
                  {savingsGoals.length !== 1
                    ? "s"
                    : ""}
                </small>

              </div>

            </div>

            <div className="dashboard-goals-grid">

              {savingsGoals
                .slice(0, 3)
                .map((goal) => {

                  const target =
                    Number(
                      goal.target || 0
                    );

                  const saved =
                    Number(
                      goal.saved || 0
                    );

                  const pct = target
                    ? Math.min(
                        100,
                        Math.round(
                          (saved / target) *
                            100
                        )
                      )
                    : 0;

                  return (

                    <Link
                      to="/savings"
                      className="dashboard-goal-card"
                      key={goal.goal_id}
                    >

                      <div className="dashboard-goal-top">

                        <div>

                          <h4>
                            {goal.name}
                          </h4>

                          {goal.deadline && (

                            <span>
                              <FaCalendarAlt />{" "}
                              {goal.deadline}
                            </span>

                          )}

                        </div>

                        <strong>
                          {pct}%
                        </strong>

                      </div>

                      <div className="progress-track">

                        <div
                          className="progress-fill"
                          style={{
                            width: `${pct}%`,
                          }}
                        />

                      </div>

                      <div className="dashboard-goal-bottom">

                        <span>
                          ₹
                          {saved.toLocaleString()}{" "}
                          saved
                        </span>

                        <span>
                          ₹
                          {target.toLocaleString()}
                        </span>

                      </div>

                    </Link>

                  );

                })}

            </div>

          </>

        ) : (

          <div className="savings-dashboard-empty">

            <FaBullseye />

            <div>

              <h4>
                No savings goals yet
              </h4>

              <p>
                Create a goal and track your
                progress from the dashboard.
              </p>

            </div>

            <Link to="/savings">
              Create Goal{" "}
              <FaChevronRight />
            </Link>

          </div>

        )}

      </div>

      {/* =========================
          CHARTS
      ========================= */}

      <div className="dashboard-charts">

        {/* MONEY OVERVIEW */}

        <div className="chart-panel">

          <div className="chart-heading">

            <div>

              <h3>
                Money overview
              </h3>

              <p className="muted">
                Income vs expenses vs remaining
                balance.
              </p>

            </div>

          </div>

          <ResponsiveContainer
            width="100%"
            height={300}
          >

            <BarChart
              data={cashflowData}
              margin={{
                top: 10,
                right: 15,
                left: 5,
                bottom: 5,
              }}
            >

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis
                dataKey="name"
              />

              <YAxis
                tickFormatter={(v) =>
                  `₹${Number(
                    v
                  ).toLocaleString()}`
                }
              />

              <Tooltip
                formatter={(v) => [
                  `₹${Number(
                    v
                  ).toLocaleString()}`,
                  "Amount",
                ]}
              />

              {/* DIFFERENT COLORS */}

              <Bar
                dataKey="amount"
                radius={[8, 8, 0, 0]}
              >

                <Cell
                  fill="#4F46E5"
                />

                <Cell
                  fill="#EF4444"
                />

                <Cell
                  fill="#10B981"
                />

              </Bar>

            </BarChart>

          </ResponsiveContainer>

        </div>

        {/* SPENDING BY CATEGORY */}

        <div className="chart-panel">

          <div className="chart-heading">

            <div>

              <h3>
                Spending by category
              </h3>

              <p className="muted">
                Where your money is going.
              </p>

            </div>

          </div>

          {categoryData.length ? (

            <ResponsiveContainer
              width="100%"
              height={300}
            >

              <PieChart>

                <Pie
                  data={categoryData}
                  dataKey="amount"
                  nameKey="category"
                  cx="50%"
                  cy="48%"
                  outerRadius={95}
                  innerRadius={52}
                  paddingAngle={3}
                >

                  {categoryData.map(
                    (_, i) => (

                      <Cell
                        key={i}
                        fill={
                          categoryColors[
                            i %
                              categoryColors.length
                          ]
                        }
                      />

                    )
                  )}

                </Pie>

                <Tooltip
                  formatter={(v) =>
                    `₹${Number(
                      v
                    ).toLocaleString()}`
                  }
                />

                <Legend />

              </PieChart>

            </ResponsiveContainer>

          ) : (

            <div className="chart-empty">
              Add expenses to see your category
              breakdown.
            </div>

          )}

        </div>

      </div>

      {/* =========================
          QUICK ACTIONS
      ========================= */}

      <div className="panel">

        <div className="chart-heading">

          <div>

            <h3>
              Quick actions
            </h3>

            <p className="muted">
              Add transactions without leaving
              your dashboard.
            </p>

          </div>

        </div>

        <div className="quick-grid">

          <Link to="/income">
            <FaPlus />
            Add income
          </Link>

          <Link to="/expense">
            <FaPlus />
            Add expense
          </Link>

          <Link to="/budget">
            <FaPlus />
            Set budget
          </Link>

          <Link to="/bank-accounts">
            <FaUniversity />
            Manage bank accounts
          </Link>

        </div>

      </div>

    </Layout>
  );
}