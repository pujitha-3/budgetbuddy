# BudgetBuddy Role-Based Analytics

## Student / Basic User
The `/reports` page shows only:
- Spending by category for the current month
- Income vs Expense for the current month
- Savings-goal progress bars
- No date-range picker
- No PDF/Excel export

The backend `/reports/summary` endpoint is locked to the current month.

## Premium User
The `/reports` page shows everything in Basic plus:
- 6–12 month income/expense trend
- Custom From/To date range
- Category spending over time
- This month vs last month comparison
- Savings-goal contribution trend from the backend database
- Print / Save PDF
- Excel export

Premium data is served by `/reports/premium`.

## Admin
There is one seeded Admin account. Admin sees the same Premium analytics for the Admin account's own financial data, plus an Admin-only System Analytics page.

System Analytics is served by `/reports/system` and aggregates data across all users. Both frontend routing and backend authorization require the Admin role.

## Admin account
Run from `backend`:

```powershell
python create_admin.py
```

The script asks for the owner's email, password and name. It makes that account the single Admin, removes the old `admin@budgetbuddy.local` demo account if it exists, and downgrades any other Admin account to Premium.

Use the Admin Users page to assign normal accounts to `Student` or `Premium`.

## Savings goal account isolation
Savings goals are stored and loaded only through the authenticated user's backend endpoints. Dashboard and Savings Goals never use browser localStorage for goal data, so goals from one account cannot appear in another account's dashboard on the same computer.
