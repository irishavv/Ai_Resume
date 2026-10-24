import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUp } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader.jsx';
import SectionCard from '../../components/admin/SectionCard.jsx';
import Skeleton from '../../components/common/Skeleton.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import ResumePanel from '../../components/resume/ResumePanel.jsx';
import { useAdminProfile } from '../../hooks/useAdmin.js';
import { adminCopy } from '../../constants/adminCopy.js';

/**
 * Resume import and comparison. The extracted draft is a proposal: applying it
 * replaces the stored profile only after an explicit confirmation.
 */
export default function AdminResumePage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useAdminProfile();

  const handleViewProfile = useCallback(() => navigate('/admin/profile'), [navigate]);

  const profile = data?.profile ?? null;

  return (
    <div className="space-y-5">
      <PageHeader title={adminCopy.resume.title} description={adminCopy.resume.subtitle} />

      <SectionCard title={adminCopy.resume.cardTitle} description={adminCopy.resume.cardBody}>
        {isError ? (
          <ErrorState
            compact
            title={adminCopy.states.errorTitle}
            description={adminCopy.resume.loadFailed}
            onRetry={refetch}
          />
        ) : isLoading ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-full" rounded="rounded-xl" />
          </div>
        ) : (
          <ResumePanel profile={profile} onViewProfile={handleViewProfile} />
        )}
      </SectionCard>

      <p className="flex items-center gap-1.5 text-2xs leading-relaxed text-ink-subtle">
        <FileUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {adminCopy.resume.privacyNote}
      </p>
    </div>
  );
}
