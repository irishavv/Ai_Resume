import { Navigate, Route, Routes } from 'react-router-dom';
import App from '../App.jsx';
import AdminLayout from '../components/admin/AdminLayout.jsx';
import RequireAdminAuth from '../components/admin/RequireAdminAuth.jsx';
import AdminLoginPage from '../pages/admin/AdminLoginPage.jsx';
import AdminOverviewPage from '../pages/admin/AdminOverviewPage.jsx';
import AdminProfilePage from '../pages/admin/AdminProfilePage.jsx';
import AdminResumePage from '../pages/admin/AdminResumePage.jsx';
import AdminSettingsPage from '../pages/admin/AdminSettingsPage.jsx';
import AdminConversationsPage from '../pages/admin/AdminConversationsPage.jsx';
import AdminAiPage from '../pages/admin/AdminAiPage.jsx';
import AdminAuditPage from '../pages/admin/AdminAuditPage.jsx';

/**
 * The whole routing table: the public site at `/`, and the operator console
 * under `/admin`. Everything below `/admin` except the sign-in screen sits
 * behind the session guard and the console frame.
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<App />} />

      <Route path="/admin/login" element={<AdminLoginPage />} />

      <Route
        path="/admin"
        element={
          <RequireAdminAuth>
            <AdminLayout />
          </RequireAdminAuth>
        }
      >
        <Route index element={<AdminOverviewPage />} />
        <Route path="profile" element={<AdminProfilePage />} />
        <Route path="resume" element={<AdminResumePage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="conversations" element={<AdminConversationsPage />} />
        <Route path="ai" element={<AdminAiPage />} />
        <Route path="audit" element={<AdminAuditPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
