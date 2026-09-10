# BudgetBuddy Premium Request Workflow

## Flow
1. Student opens Reports and clicks **Request Premium**.
2. The backend stores a pending Premium request.
3. The Admin receives an in-app notification (when the Admin account is opened; the UI polls for pending requests).
4. Clicking **View** on the notification opens **User Management**.
5. Admin can **Approve Premium** or **Reject**.
6. Approving changes the requested account from `Student` to `Premium`.
7. No payment gateway is required.

## Optional Admin email
The request is always stored and shown in-app. If Gmail SMTP is configured, the backend also emails the Admin.

Add to `backend/.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=yourgmail@gmail.com
SMTP_PASSWORD=your_gmail_app_password
SMTP_FROM=yourgmail@gmail.com
```

The Admin email is taken automatically from the single user whose role is `Admin`, so no Admin email needs to be hard-coded.

## Demo
- Student account: Reports -> Request Premium.
- Admin account: Notifications -> View -> User Management -> Approve Premium.
- Student logs in again: Reports now shows Premium analytics and PDF/Excel export.
