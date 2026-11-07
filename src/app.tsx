import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore, useAuthListener } from "@/hooks/use-auth";
import { useTenantContext } from "@/contexts/tenant-context";
import { LoginPage } from "@/platform/auth/login-page";
import { ResetPasswordPage } from "@/platform/auth/reset-password-page";
import { LoadingScreen } from "@/components/loading-screen";
import { ViewModeBanner } from "@/components/view-mode-banner";
import { DashboardShell } from "@/components/dashboard-shell";
import { TenantShell } from "@/components/tenant-shell";
import { CustomerPortalShell } from "@/components/customer-portal-shell";
import { TenantsPage } from "@/platform/tenants/tenants-page";
import { PortalLinksPage } from "@/platform/portal-links/portal-links-page";
import { TenantDetailPage } from "@/platform/tenants/tenant-detail-page";
import { DashboardPage } from "@/platform/dashboard/dashboard-page";
import { DelegationPage } from "@/platform/delegation/delegation-page";
import { AuditPage } from "@/platform/audit/audit-page";
import { IndustriesPage } from "@/platform/industries/industries-page";
import { ModulesPage } from "@/platform/modules/modules-page";
import { UsersPage } from "@/platform/users/users-page";
import { TenantDashboard } from "@/tenant/tenant-dashboard";
import { TenantSettingsPage } from "@/tenant/tenant-settings-page";
import { ClientsPage } from "@/tenant/clients-page";
import { ClientDetailPage } from "@/tenant/client-detail-page";
import { WorkspacePage } from "@/tenant/workspace-page";
import { AppointmentsPage } from "@/tenant/appointments-page";
import { ProgramsPage } from "@/tenant/programs-page";
import { BillingPage } from "@/tenant/billing-page";
import { InvoiceDetailPage } from "@/tenant/invoice-detail-page";
import { StaffPage } from "@/tenant/staff-page";
import { ReportsPage } from "@/tenant/reports-page";
import { BranchesOverviewPage } from "@/tenant/branches-overview-page";
import { ProgressReviewsPage } from "@/tenant/progress-reviews-page";
import { DocumentsPage } from "@/tenant/documents-page";
import { PlaceholderPage } from "@/tenant/placeholder-page";
import { StaffLoginPage } from "@/platform/auth/staff-login-page";
import { PortalLoginPage } from "@/portal/portal-login";
import { PortalHome } from "@/portal/portal-home";
import { PortalProgress } from "@/portal/portal-progress";
import { PortalAppointments } from "@/portal/portal-appointments";
import { PortalHealth } from "@/portal/portal-health";
import { PortalDocuments } from "@/portal/portal-documents";
import { SupportShell } from "@/components/support-shell";
import { SupportHome } from "@/platform/support/support-home";
import { SupportRequestsPage } from "@/platform/support/support-requests-page";
import { SupportDelegationsPage } from "@/platform/support/support-delegations-page";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function AuthGate({ children }: { children: React.ReactNode }) {
  useAuthListener();
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <LoginPage />;

  return <>{children}</>;
}

function RoleRedirect() {
  const { user, activeRole, activeTenantId, activeTenantSlug } = useAuthStore();
  const platformRole = user?.platform_role;

  if (platformRole === "super_admin") {
    return <DashboardPage />;
  }
  if (platformRole === "support_ops") {
    return <Navigate to="/support" replace />;
  }
  if (activeRole === "customer") {
    return <Navigate to="/portal" replace />;
  }
  if (activeTenantId && activeTenantSlug) {
    return <Navigate to={`/t/${activeTenantSlug}/dashboard`} replace />;
  }
  if (activeTenantId && !activeTenantSlug) {
    return <LoadingScreen />;
  }
  // DashboardShell handles the "not linked" case for non-admins
  return null;
}

function TenantRoute({ children }: { children: React.ReactElement<{ tenantId: string }> }) {
  const { tenantId } = useTenantContext();
  return React.cloneElement(children, { tenantId });
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public auth routes — no AuthGate */}
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/signup" element={<LoginPage initialMode="signup" />} />
          <Route path="/auth/reset" element={<ResetPasswordPage />} />
          <Route path="/join/:slug" element={<PortalLoginPage />} />
          <Route path="/login/:slug" element={<StaffLoginPage />} />

          {/* All other routes — protected by AuthGate */}
          <Route path="*" element={
            <AuthGate>
              <>
              <ViewModeBanner />
              <Routes>
                {/* Platform admin routes */}
                <Route path="/" element={<DashboardShell />}>
                  <Route index element={<RoleRedirect />} />
                  <Route path="tenants" element={<TenantsPage />} />
                  <Route path="tenants/:id" element={<TenantDetailPage />} />
                  <Route path="portal-links" element={<PortalLinksPage />} />
                  <Route path="users" element={<UsersPage />} />
                  <Route path="industries" element={<IndustriesPage />} />
                  <Route path="modules" element={<ModulesPage />} />
                  <Route path="delegation" element={<DelegationPage />} />
                  <Route path="audit" element={<AuditPage />} />
                </Route>

                {/* Support Ops shell */}
                <Route path="/support" element={<SupportShell />}>
                  <Route index element={<SupportHome />} />
                  <Route path="delegations" element={<SupportDelegationsPage />} />
                  <Route path="requests" element={<SupportRequestsPage />} />
                </Route>

                {/* Tenant user routes (admin/practitioner/staff) */}
                <Route path="/t/:slug" element={<TenantShell />}>
                  <Route path="dashboard" element={<TenantDashboard />} />
                  <Route path="workspace" element={<TenantRoute><WorkspacePage tenantId="" /></TenantRoute>} />
                  <Route path="clients" element={<TenantRoute><ClientsPage tenantId="" /></TenantRoute>} />
                  <Route path="clients/:clientId" element={<TenantRoute><ClientDetailPage tenantId="" /></TenantRoute>} />
                  <Route path="appointments" element={<TenantRoute><AppointmentsPage tenantId="" /></TenantRoute>} />
                  <Route path="documents" element={<TenantRoute><DocumentsPage tenantId="" /></TenantRoute>} />
                  <Route path="programs" element={<TenantRoute><ProgramsPage tenantId="" /></TenantRoute>} />
                  <Route path="health" element={<PlaceholderPage />} />
                  <Route path="progress" element={<TenantRoute><ProgressReviewsPage tenantId="" /></TenantRoute>} />
                  <Route path="billing" element={<TenantRoute><BillingPage tenantId="" /></TenantRoute>} />
                  <Route path="billing/:invoiceId" element={<TenantRoute><InvoiceDetailPage tenantId="" /></TenantRoute>} />
                  <Route path="members" element={<TenantRoute><StaffPage tenantId="" /></TenantRoute>} />
                  <Route path="branches" element={<TenantRoute><BranchesOverviewPage tenantId="" /></TenantRoute>} />
                  <Route path="reports" element={<TenantRoute><ReportsPage tenantId="" /></TenantRoute>} />
                  <Route path="settings" element={<TenantSettingsPage />} />
                </Route>

                {/* Customer portal routes */}
                <Route path="/portal" element={<CustomerPortalShell />}>
                  <Route index element={<PortalHome />} />
                  <Route path="appointments" element={<PortalAppointments />} />
                  <Route path="health" element={<PortalHealth />} />
                  <Route path="progress" element={<PortalProgress />} />
                  <Route path="documents" element={<PortalDocuments />} />
                </Route>

                <Route path="*" element={<RoleRedirect />} />
              </Routes>
              </>
            </AuthGate>
          } />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
