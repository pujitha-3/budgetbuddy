import { useEffect, useMemo, useState } from "react";
import {
  FaChartBar,
  FaDownload,
  FaCalendarAlt,
  FaRupeeSign,
  FaArrowUp,
  FaArrowDown,
  FaPiggyBank,
} from "react-icons/fa";

import toast from "react-hot-toast";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import Layout from "../components/Layout";
import api from "../services/api";
import { addNotification } from "../services/notificationService";


// =====================================================
// MONEY FORMAT
// =====================================================

const money = (v) =>
  `₹${Number(v || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;


// =====================================================
// CHART COLORS
// =====================================================

const CHART_COLORS = [
  "#4F46E5", // Blue
  "#EF4444", // Red
  "#10B981", // Green
  "#F59E0B", // Orange
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#84CC16", // Lime
];


// =====================================================
// REPORTS COMPONENT
// =====================================================

export default function Reports() {

  const today = new Date();

  const monthStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  )
    .toISOString()
    .slice(0, 10);


  const [start, setStart] = useState(monthStart);

  const [end, setEnd] = useState(
    today.toISOString().slice(0, 10)
  );

  const [report, setReport] = useState(null);

  const [loading, setLoading] = useState(true);


  // ===================================================
  // LOAD REPORT
  // ===================================================

  const load = async () => {

    setLoading(true);

    try {

      const res = await api.get(
        "/reports/summary",
        {
          params: {
            start,
            end,
          },
        }
      );

      setReport(res.data);

    } catch (err) {

      toast.error(
        err.response?.data?.detail ||
        "Could not load report"
      );

    } finally {

      setLoading(false);

    }
  };


  useEffect(() => {

    load();

  }, []);


  // ===================================================
  // REPORT DATA
  // ===================================================

  const categoryData =
    report?.categories || [];

  const topCategory =
    categoryData[0];

  const paymentData =
    report?.payment_methods || [];


  // ===================================================
  // CSV DATA
  // ===================================================

  const csv = useMemo(() => {

    if (!report) {
      return "";
    }


    const rows = [

      ["BudgetBuddy Financial Report"],

      [
        `Period,${report.period.start},${report.period.end}`,
      ],

      [],

      ["Summary"],

      [
        "Income",
        report.summary.income,
      ],

      [
        "Expenses",
        report.summary.expenses,
      ],

      [
        "Net",
        report.summary.net,
      ],

      [
        "Savings Rate",
        `${report.summary.savings_rate}%`,
      ],

      [
        "Transactions",
        report.summary.transaction_count,
      ],

      [
        "Average Expense",
        report.summary.average_expense,
      ],

      [],

      ["Monthly Trend"],

      [
        "Month",
        "Income",
        "Expenses",
        "Net",
      ],

      ...report.monthly.map((x) => [
        x.month,
        x.income,
        x.expenses,
        x.balance,
      ]),

      [],

      ["Expense Categories"],

      [
        "Category",
        "Amount",
      ],

      ...report.categories.map((x) => [
        x.category,
        x.amount,
      ]),

      [],

      ["Payment Methods"],

      [
        "Method",
        "Amount",
      ],

      ...report.payment_methods.map((x) => [
        x.method,
        x.amount,
      ]),
    ];


    return rows
      .map((row) =>
        row
          .map(
            (v) =>
              `"${String(v ?? "").replaceAll(
                '"',
                '""'
              )}"`
          )
          .join(",")
      )
      .join("\n");

  }, [report]);


  // ===================================================
  // DOWNLOAD CSV
  // ===================================================

  const download = () => {

    const blob = new Blob(
      [csv],
      {
        type: "text/csv;charset=utf-8",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const a =
      document.createElement("a");

    a.href = url;

    a.download =
      `budgetbuddy-report-${start}-to-${end}.csv`;

    a.click();

    URL.revokeObjectURL(url);


    addNotification({
      type: "success",
      title: "Report exported",
      text: `Financial report exported for ${start} to ${end}.`,
    });


    toast.success(
      "Report downloaded"
    );
  };


  // ===================================================
  // PAGE
  // ===================================================

  return (

    <Layout>

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="page-head report-head">

        <div>

          <div className="eyebrow">
            ANALYTICS
          </div>

          <h1>
            Financial Reports
          </h1>

          <p className="muted">
            Understand your income, spending,
            savings rate and financial trends.
          </p>

        </div>


        <div className="report-actions">

          <button
            className="secondary-btn report-download"
            onClick={() =>
              window.print()
            }
            disabled={!report}
          >
            Print / Save PDF
          </button>


          <button
            className="primary-btn report-download"
            onClick={download}
            disabled={!report}
          >
            <FaDownload />
            Export CSV
          </button>

        </div>

      </div>


      {/* =================================================
          DATE FILTER
      ================================================= */}

      <div className="report-filter panel">

        <div>

          <FaCalendarAlt />

          <label>

            From

            <input
              type="date"
              value={start}
              onChange={(e) =>
                setStart(e.target.value)
              }
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
              onChange={(e) =>
                setEnd(e.target.value)
              }
            />

          </label>

        </div>


        <button
          className="primary-btn"
          onClick={load}
        >
          Generate report
        </button>

      </div>


      {/* =================================================
          LOADING
      ================================================= */}

      {loading || !report ? (

        <div className="loading">
          Preparing your financial report...
        </div>

      ) : (

        <>

          {/* =============================================
              SUMMARY CARDS
          ============================================= */}

          <div className="report-stat-grid">

            <div className="report-stat">

              <FaArrowUp />

              <small>
                Total income
              </small>

              <strong>
                {money(
                  report.summary.income
                )}
              </strong>

            </div>


            <div className="report-stat">

              <FaArrowDown />

              <small>
                Total expenses
              </small>

              <strong>
                {money(
                  report.summary.expenses
                )}
              </strong>

            </div>


            <div className="report-stat">

              <FaPiggyBank />

              <small>
                Savings rate
              </small>

              <strong>
                {report.summary.savings_rate}%
              </strong>

            </div>


            <div className="report-stat">

              <FaRupeeSign />

              <small>
                Net cash flow
              </small>

              <strong
                className={
                  report.summary.net < 0
                    ? "red-text"
                    : "green-text"
                }
              >
                {money(
                  report.summary.net
                )}
              </strong>

            </div>

          </div>


          {/* =============================================
              HIGHLIGHTS
          ============================================= */}

          <div className="report-highlight-grid">

            <div className="panel report-highlight">

              <span>
                Top spending category
              </span>

              <strong>
                {topCategory?.category ||
                  "No expenses"}
              </strong>

              <b>
                {money(
                  topCategory?.amount
                )}
              </b>

            </div>


            <div className="panel report-highlight">

              <span>
                Average expense
              </span>

              <strong>
                {money(
                  report.summary.average_expense
                )}
              </strong>

              <b>
                {report.summary.transaction_count}{" "}
                transactions
              </b>

            </div>


            <div className="panel report-highlight">

              <span>
                Total budget configured
              </span>

              <strong>
                {money(
                  report.budget_total
                )}
              </strong>

              <b>
                Compare this with actual spending.
              </b>

            </div>

          </div>


          {/* =================================================
              MONTHLY CASH FLOW + CATEGORY
          ================================================= */}

          <div className="report-chart-grid">


            {/* MONTHLY CASH FLOW */}

            <div className="panel">

              <div className="chart-heading">

                <div>

                  <h3>
                    Monthly cash flow
                  </h3>

                  <p className="muted">
                    Income and expenses across
                    the selected period.
                  </p>

                </div>

              </div>


              <ResponsiveContainer
                width="100%"
                height={320}
              >

                <LineChart
                  data={report.monthly}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="month"
                  />

                  <YAxis
                    tickFormatter={(v) =>
                      `₹${Number(
                        v
                      ).toLocaleString()}`
                    }
                  />

                  <Tooltip
                    formatter={(v) =>
                      money(v)
                    }
                  />

                  <Legend />


                  {/* INCOME - BLUE */}

                  <Line
                    type="monotone"
                    dataKey="income"
                    name="Income"
                    stroke="#4F46E5"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      fill: "#4F46E5",
                    }}
                    activeDot={{
                      r: 6,
                    }}
                  />


                  {/* EXPENSES - RED */}

                  <Line
                    type="monotone"
                    dataKey="expenses"
                    name="Expenses"
                    stroke="#EF4444"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      fill: "#EF4444",
                    }}
                    activeDot={{
                      r: 6,
                    }}
                  />

                </LineChart>

              </ResponsiveContainer>

            </div>


            {/* SPENDING CATEGORY */}

            <div className="panel">

              <div className="chart-heading">

                <div>

                  <h3>
                    Spending by category
                  </h3>

                  <p className="muted">
                    Identify where most of your
                    money goes.
                  </p>

                </div>

              </div>


              {categoryData.length ? (

                <ResponsiveContainer
                  width="100%"
                  height={320}
                >

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

                      {categoryData.map(
                        (_, i) => (

                          <Cell
                            key={i}
                            fill={
                              CHART_COLORS[
                                i %
                                  CHART_COLORS.length
                              ]
                            }
                          />

                        )
                      )}

                    </Pie>

                    <Tooltip
                      formatter={(v) =>
                        money(v)
                      }
                    />

                    <Legend />

                  </PieChart>

                </ResponsiveContainer>

              ) : (

                <div className="chart-empty">
                  No expense data for this period.
                </div>

              )}

            </div>

          </div>


          {/* =================================================
              INCOME VS EXPENSES + PAYMENT METHODS
          ================================================= */}

          <div className="report-chart-grid">


            {/* INCOME VS EXPENSES */}

            <div className="panel">

              <div className="chart-heading">

                <div>

                  <h3>
                    Income vs expenses
                  </h3>

                  <p className="muted">
                    Quick comparison for the
                    selected period.
                  </p>

                </div>

              </div>


              <ResponsiveContainer
                width="100%"
                height={300}
              >

                <BarChart
                  data={[
                    {
                      name: "Selected period",
                      income:
                        report.summary.income,
                      expenses:
                        report.summary.expenses,
                    },
                  ]}
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
                    formatter={(v) =>
                      money(v)
                    }
                  />

                  <Legend />


                  {/* INCOME - BLUE */}

                  <Bar
                    dataKey="income"
                    name="Income"
                    fill="#4F46E5"
                    radius={[
                      8,
                      8,
                      0,
                      0,
                    ]}
                  />


                  {/* EXPENSES - RED */}

                  <Bar
                    dataKey="expenses"
                    name="Expenses"
                    fill="#EF4444"
                    radius={[
                      8,
                      8,
                      0,
                      0,
                    ]}
                  />

                </BarChart>

              </ResponsiveContainer>

            </div>


            {/* PAYMENT METHODS */}

            <div className="panel">

              <div className="chart-heading">

                <div>

                  <h3>
                    Payment methods
                  </h3>

                  <p className="muted">
                    How your expenses were paid.
                  </p>

                </div>

              </div>


              {paymentData.length ? (

                <ResponsiveContainer
                  width="100%"
                  height={300}
                >

                  <PieChart>

                    <Pie
                      data={paymentData}
                      dataKey="amount"
                      nameKey="method"
                      cx="50%"
                      cy="45%"
                      innerRadius={58}
                      outerRadius={100}
                      paddingAngle={3}
                    >

                      {paymentData.map(
                        (_, i) => (

                          <Cell
                            key={i}
                            fill={
                              CHART_COLORS[
                                i %
                                  CHART_COLORS.length
                              ]
                            }
                          />

                        )
                      )}

                    </Pie>

                    <Tooltip
                      formatter={(v) =>
                        money(v)
                      }
                    />

                    <Legend />

                  </PieChart>

                </ResponsiveContainer>

              ) : (

                <div className="chart-empty">
                  No payment data for this period.
                </div>

              )}

            </div>

          </div>

        </>

      )}

    </Layout>
  );
}