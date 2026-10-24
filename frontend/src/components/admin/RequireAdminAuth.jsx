import { Navigate, useLocation } from 'react-router-dom';
import Spinner from '../common/Spinner.jsx';
import { useAdminAuth } from '../../context/AdminAuthContext.jsx';
import { adminCopy } from '../../constants/adminCopy.js';

/**
 * Keeps the console behind a valid operator session. A restored token is
 * validated against the backend first, so an expired tab cannot reveal the
 * console before the sign-in screen appears.
 */
export default function RequireAdminAuth({ children }) {
  const { status } = useAdminAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="flex h-dvh w-full items-center justify-center gap-2 text-ink-muted">
        <Spinner size="md" />
        <span className="text-xs">{adminCopy.states.loading}</span>
      </div>
    );
  }

  if (status !== 'authenticated') {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return children;
}
