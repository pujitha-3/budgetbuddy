# BudgetBuddy - Dashboard + Notifications Update

## Included
- Dashboard with total balance, income, expenses and budget cards.
- Bank account balances shown on dashboard, including last 4 digits.
- Cash and wallet balances shown in the dashboard money-source summary.
- Savings goals summary and progress cards on dashboard.
- Money overview bar chart and spending-by-category donut chart.
- Quick actions for income, expenses, budget and bank accounts.
- Sidebar navigation for Dashboard, Income, Expenses, Budget, Savings Goals, Notifications, Bank Accounts and Profile.
- Notifications are created automatically for successful operations:
  - Login / registration
  - Add, update and delete income
  - Add, update and delete expenses
  - Add, update and delete budgets
  - Add, update and delete bank accounts
  - Create, update progress and delete savings goals
  - Logout
- Notifications have unread state, mark-all-read, delete and clear-all controls.
- The sidebar displays an unread notification badge and updates immediately after an operation.

## Run frontend
```bash
cd frontend
npm install
npm run dev
```

## Run backend
Use the existing backend setup in the `backend` folder. Start FastAPI with your existing command, for example:
```bash
uvicorn app.main:app --reload
```

The frontend expects the API at:
`http://127.0.0.1:8000`
