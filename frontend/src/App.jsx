import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute, GuestRoute, SetupRoute } from './routes/ProtectedRoute'
import TenantRoute from './routes/TenantRoute'
import TenantGuard from './routes/TenantGuard'
import ErrorBoundary from './ErrorBoundary'
import { useAuth } from './context/AuthContext'
import { TenantBrandingProvider } from './context/TenantBrandingContext'

import { Suspense, lazy } from 'react'

// Admin routes (fully isolated — see routes/AdminProtectedRoute.jsx)
import { AdminProtectedRoute, AdminGuestRoute } from './routes/AdminProtectedRoute'
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'))
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'))
const AdminTenantsPage = lazy(() => import('./pages/admin/AdminTenantsPage'))
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'))
const AdminPlansPage = lazy(() => import('./pages/admin/AdminPlansPage'))

// Auth pages
const LandingPage        = lazy(() => import('./pages/LandingPage'))
const SignupPage         = lazy(() => import('./pages/SignupPage'))
const VerifyEmailPage    = lazy(() => import('./pages/VerifyEmailPage'))
const WorkspaceSetupPage = lazy(() => import('./pages/WorkspaceSetupPage'))
const LoginPage          = lazy(() => import('./pages/LoginPage'))
const PortalsPage        = lazy(() => import('./pages/PortalsPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage  = lazy(() => import('./pages/ResetPasswordPage'))
const WorkspaceNotFoundPage = lazy(() => import('./pages/WorkspaceNotFoundPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

// Client pages
const AcceptInvitePage   = lazy(() => import('./pages/client/AcceptInvitePage'))
const ClientLoginPage    = lazy(() => import('./pages/client/ClientLoginPage'))
const ClientDashboard    = lazy(() => import('./pages/client/ClientDashboard'))
const ClientRequestsPage = lazy(() => import('./pages/client/ClientRequestsPage'))
const ClientRequestDetailPage  = lazy(() => import('./pages/client/ClientRequestDetailPage'))

// Provider pages
const ProviderDashboard  = lazy(() => import('./pages/provider/ProviderDashboard'))
const ClientsPage        = lazy(() => import('./pages/provider/ClientsPage'))
const ClientDetailPage   = lazy(() => import('./pages/provider/ClientDetailPage'))
const RequestsPage       = lazy(() => import('./pages/provider/RequestsPage'))
const RequestDetailPage  = lazy(() => import('./pages/provider/RequestDetailPage'))
const ActivityPage       = lazy(() => import('./pages/provider/ActivityPage'))
const UpgradePage        = lazy(() => import('./pages/provider/UpgradePage'))

import { BadgeProvider } from './context/BadgeContext'
import UpgradeModal from './components/modals/UpgradeModal'
import UpgradeSuccessModal from './components/modals/UpgradeSuccessModal'
import AdminBootstrap from './context/AdminBootstrap'
import { WalkthroughProvider } from './context/WalkthroughContext'
import PwaInstallPrompt from './components/ui/PwaInstallPrompt'


function RoleDashboard() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user?.role === 'provider') return <ProviderDashboard />
  if (user?.role === 'client')   return <ClientDashboard />
  return <Navigate to="/login" replace />
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen bg-[#F7F8F7]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F6E56]"></div>
          </div>
        }>
        {/* Groven Admin */}
        <Routes>
          <Route path="/grove-admin/*" element={
            <AdminBootstrap>
              <Routes>
                <Route element={<AdminGuestRoute />}>
                  <Route path="login" element={<AdminLoginPage />} />
                </Route>
                <Route element={<AdminProtectedRoute />}>
                  <Route path="dashboard" element={<AdminDashboardPage />} />
                  <Route path="tenants" element={<AdminTenantsPage />} />
                  <Route path="users" element={<AdminUsersPage />} />
                  <Route path="plans" element={<AdminPlansPage />} />
                </Route>
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </AdminBootstrap>
          } />

          {/* ── Everything else — the existing tenant/provider/client app ── */}
          <Route path="/*" element={
            <AuthProvider>
              <TenantBrandingProvider>
                <TenantGuard>
                <Routes>

                  {/* Public */}
                  <Route path="/" element={<LandingPage />} />

                  {/* ── Upgrade (Public) ── */}
                      <Route
                        path="/upgrade"
                        element={<UpgradePage />}
                      />


                  {/* Pre-auth — no session needed */}
                  <Route path="/accept-invite" element={<AcceptInvitePage />} />
                  <Route path="/client-login"  element={<ClientLoginPage />} />

                  {/* Guest only */}
                  <Route element={<GuestRoute />}>
                    <Route path="/signup"          element={<SignupPage />} />
                    <Route path="/login"           element={<LoginPage />} />
                    <Route path="/verify-email"    element={<VerifyEmailPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password"  element={<ResetPasswordPage />} />
                  </Route>

                  {/* Portal picker (root domain, authenticated) — BadgeProvider intentionally excluded */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/portals" element={<PortalsPage />} />
                  </Route>

                  {/* Setup (authenticated but no portal yet) */}
                  <Route element={<SetupRoute />}>
                    <Route path="/setup-workspace" element={<WorkspaceSetupPage />} />
                  </Route>

                  {/* Protected tenant routes — BadgeProvider only mounts here, inside a real tenant subdomain */}
                  <Route element={<ProtectedRoute />}>
                      <Route element={<BadgeProvider />}>
                        <Route element={<WalkthroughProvider />}>

                          {/* Dashboard */}
                          <Route
                            path="/dashboard"
                            element={<TenantRoute><RoleDashboard /></TenantRoute>}
                          />

                      {/* Client portal */}
                      <Route
                        path="/portal"
                        element={<TenantRoute><RoleDashboard /></TenantRoute>}
                      />

                      {/* ── Client management (provider) ── */}
                      <Route
                        path="/clients"
                        element={<TenantRoute><ClientsPage /></TenantRoute>}
                      />
                      <Route
                        path="/clients/:clientId"
                        element={<TenantRoute><ClientDetailPage /></TenantRoute>}
                      />

                      {/* ── Requests (provider) ── */}
                      <Route
                        path="/requests"
                        element={<TenantRoute><RequestsPage /></TenantRoute>}
                      />
                      <Route
                        path="/requests/:requestId"
                        element={<TenantRoute><RequestDetailPage /></TenantRoute>}
                      />

                      {/* ── Activity (provider) ── */}
                      <Route
                        path="/activity"
                        element={<TenantRoute><ActivityPage /></TenantRoute>}
                      />

                      {/* ── My requests (client) ── */}
                      <Route
                        path="/my-requests"
                        element={<TenantRoute><ClientRequestsPage /></TenantRoute>}
                      />
                      <Route
                        path="/my-requests/:requestId"
                        element={<TenantRoute><ClientRequestDetailPage /></TenantRoute>}
                      />
                        </Route>
                    </Route>
                  </Route>

                  {/* Misc */}
                  <Route path="/workspace-not-found" element={<WorkspaceNotFoundPage />} />
                  <Route path="*" element={<NotFoundPage />} />

                </Routes>
                <UpgradeModal />
                <UpgradeSuccessModal />
                <PwaInstallPrompt />
                </TenantGuard>
              </TenantBrandingProvider>
            </AuthProvider>
          } />

        </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  )
}