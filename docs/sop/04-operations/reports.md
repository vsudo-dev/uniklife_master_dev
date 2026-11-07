# Reports & Analytics

---

## What Does the Reports Page Show?

The Reports page gives the Tenant Admin a summary of business and wellness performance.

---

## Revenue KPIs

Pulled from CRM invoices (`crm_invoices`).

| Metric | Description |
|--------|-------------|
| Total Revenue | Sum of all paid invoices (all time) |
| This Month | Revenue from paid invoices this calendar month |
| Unpaid | Total value of invoices not yet paid |
| Overdue | Count of invoices past due date and unpaid |

---

## Wellness KPIs

Pulled from the wellness database.

| Metric | Description |
|--------|-------------|
| Total Clients | Total contacts with wellness profiles activated |
| Active Clients | Clients with at least one active care plan or program |
| Assessments This Month | Health assessments done this month |
| Check-ins This Month | Progress check-ins completed this month |

---

## Program Outcomes

Shows how enrolled clients are progressing across all programs.

| Column | Description |
|--------|-------------|
| Program Name | Name of the wellness program |
| Enrolled | Total clients enrolled |
| Active | Currently ongoing |
| Completed | Finished successfully |
| Dropped | Left before completion |
| Completion Rate | % of completions out of all enrollments |

A progress bar shows the completion rate visually.

---

## Data Freshness

- Revenue data: refreshed when a new invoice webhook arrives from MyAppz
- Wellness data: live from Supabase
- Reports page does not auto-poll — refresh the page for the latest data

---

## Who Can View Reports?

| Role | Access |
|------|--------|
| Super Admin | ✅ All tenants |
| Tenant Admin | ✅ Own tenant only |
| Practitioner | ❌ |
| Staff | ❌ |
