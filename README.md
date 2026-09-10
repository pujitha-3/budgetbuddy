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

## Role-based analytics
- **Student:** current-month spending by category, income vs expense, savings-goal progress. No date range and no export buttons.
- **Premium:** 6–12 month trends, custom date range, category spending over time, this-vs-last-month comparison, database-backed savings contribution trend, Print/Save PDF and Excel export.
- **Admin:** all Premium analytics for the Admin's own account, plus Admin-only System Analytics and User Management for all users. The project keeps one seeded Admin account and lets Admin assign Student/Premium roles.

### Single Admin account
There is only **one Admin** account. Use your own email and password for it.

From the `backend` folder, run:
```powershell
python create_admin.py
```

The script will ask you for:
- Your Admin email
- Your Admin password (entered privately; it is not printed)
- Admin name

If that email already exists, the existing account is upgraded to **Admin** and its password is updated. Any other existing Admin account is automatically changed to **Premium**, keeping exactly one Admin.

If the database was replaced, run the same command again to recreate your Admin account.


### Dashboard savings-goal isolation
Savings goals shown on the Dashboard are loaded from the authenticated user's backend data, not browser localStorage. This means each account sees only its own goals. The Dashboard goal cards link to Savings Goals where the user can edit saved amounts and add contributions.

The bundled SQLite demo database contains only the configured owner/admin account; the old `admin@budgetbuddy.local` demo account has been removed. Savings goals are also strictly account-scoped and are not shared through browser localStorage.

## Final role, notification and savings behavior

- Authentication uses **sessionStorage** rather than localStorage, so two browser tabs can stay logged in as different users without one tab changing the other tab's role.
- Notifications are stored in the backend and are scoped by `user_id`, so each account has its own notification list.
- Students can request Premium from Reports. The single Admin receives an in-app request notification with a link to User Management. Admin can approve/reject; approval changes Student -> Premium and notifies the user.
- Savings contributions require a source: a saved bank account, Cash, or Wallet. The contribution is stored as a transfer and is deducted from that source's available Dashboard balance. Savings transfers are not counted as normal expenses.
- Savings goals and contributions are scoped to the logged-in user.
- Savings milestone notifications are generated only when a milestone is crossed by the current contribution; a direct jump to 100% produces only the completion notification.
