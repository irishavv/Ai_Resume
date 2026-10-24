import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogIn } from 'lucide-react';
import Button from '../../components/common/Button.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import FormField from '../../components/admin/FormField.jsx';
import StatusBanner from '../../components/admin/StatusBanner.jsx';
import { adminLoginSchema } from '../../schemas/adminLoginSchema.js';
import { useAdminAuth } from '../../context/AdminAuthContext.jsx';
import { useSiteSettings } from '../../context/SiteSettingsContext.jsx';
import { copy } from '../../constants/copy.js';

/**
 * The console sign-in screen. It is deliberately outside the console frame so
 * no part of the operator UI renders before the session is established.
 */
export default function AdminLoginPage() {
  const { status, signIn } = useAdminAuth();
  const { settings } = useSiteSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [failure, setFailure] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { username: '', password: '' },
  });

  // Only an in-console destination is honoured, so a crafted `from` value can
  // never redirect the operator off the admin area.
  const redirectTo = useMemo(() => {
    const from = location.state?.from;
    return typeof from === 'string' && from.startsWith('/admin') && from !== '/admin/login'
      ? from
      : '/admin';
  }, [location.state]);

  const onSubmit = useCallback(
    async (values) => {
      setFailure(null);
      try {
        await signIn(values);
        navigate(redirectTo, { replace: true });
      } catch (error) {
        setFailure({
          disabled: error?.status === 503,
          message: error?.message || copy.errors.generic,
        });
      }
    },
    [navigate, redirectTo, signIn],
  );

  if (status === 'loading') {
    return (
      <div className="flex h-dvh w-full items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  if (status === 'authenticated') {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-5 flex flex-col items-center gap-2 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-fg">
            {settings.site?.initials || 'AI'}
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">{copy.admin.brand.name}</p>
            <p className="text-2xs text-ink-subtle">{settings.site?.name || copy.brand.name}</p>
          </div>
        </div>

        <div className="surface-card p-5">
          <h1 className="text-base font-semibold text-ink">{copy.admin.login.title}</h1>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            {copy.admin.login.subtitle}
          </p>

          {failure ? (
            <StatusBanner
              className="mt-4"
              tone="danger"
              title={
                failure.disabled ? copy.admin.login.disabledTitle : copy.admin.login.failedTitle
              }
              description={failure.disabled ? copy.admin.login.disabledBody : failure.message}
              onDismiss={() => setFailure(null)}
            />
          ) : null}

          <form className="mt-4 space-y-3.5" onSubmit={handleSubmit(onSubmit)} noValidate>
            <FormField
              label={copy.admin.login.username}
              placeholder={copy.admin.login.usernamePlaceholder}
              autoComplete="username"
              error={errors.username?.message}
              {...register('username')}
            />
            <FormField
              label={copy.admin.login.password}
              type="password"
              placeholder={copy.admin.login.passwordPlaceholder}
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <Button type="submit" fullWidth leftIcon={LogIn} isLoading={isSubmitting}>
              {isSubmitting ? copy.admin.login.submitting : copy.admin.login.submit}
            </Button>
          </form>
        </div>

        <Link
          to="/"
          className="mt-4 flex items-center justify-center gap-1.5 text-2xs font-medium text-ink-subtle transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {copy.admin.login.backToSite}
        </Link>
      </div>
    </div>
  );
}
