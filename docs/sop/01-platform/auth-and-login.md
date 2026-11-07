# Auth & Login

---

## Login Flow

1. User visits the UNIKLIFE URL
2. Enters email + password
3. System checks their role in the database
4. Redirected to the correct dashboard based on role:

| Role | Lands On |
|------|----------|
| Super Admin | Platform dashboard — sees all tenants |
| Tenant Admin | Tenant dashboard — `/t/{slug}/dashboard` |
| Practitioner | Practitioner workspace — `/t/{slug}/workspace` |
| Staff | Tenant dashboard |
| Customer | Customer portal (future) |

---

## Password Reset

1. Click **Forgot Password** on the login page
2. Enter email address
3. Check email — click the reset link
4. Enter new password on the reset page
5. Automatically logged in after reset

> The reset link expires after 1 hour. If expired, request a new one.

---

## Session Behaviour

- Sessions are persistent — you stay logged in unless you sign out
- If you open the app and your session has expired, you are redirected to login automatically
- Each device/browser has its own session

---

## Common Issues

| Issue | Fix |
|-------|-----|
| Logged in but seeing wrong dashboard | Sign out and sign in again — role may have been updated |
| Reset email not arriving | Check spam folder. Wait 2 minutes. Request again if still missing. |
| "Access denied" after login | Your role may not have been assigned yet — contact the Tenant Admin |
