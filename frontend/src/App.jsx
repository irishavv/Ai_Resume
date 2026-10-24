import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Target, FileDown } from 'lucide-react';
import AppShell from './components/layout/AppShell.jsx';
import Sidebar from './components/layout/Sidebar.jsx';
import TopBar from './components/layout/TopBar.jsx';
import PanelTabs from './components/layout/PanelTabs.jsx';
import ThemeToggle from './components/layout/ThemeToggle.jsx';
import ChatPanel from './components/chat/ChatPanel.jsx';
import ProfilePanel from './components/profile/ProfilePanel.jsx';
import JobMatchPanel from './components/jobmatch/JobMatchPanel.jsx';
import Modal from './components/common/Modal.jsx';
import IconButton from './components/common/IconButton.jsx';
import useProfile from './hooks/useProfile.js';
import useConversations from './hooks/useConversations.js';
import useConversation from './hooks/useConversation.js';
import useChatStream from './hooks/useChatStream.js';
import useLanguage from './hooks/useLanguage.js';
import { exportConversationPdf } from './lib/pdf.js';
import { useSiteSettings } from './context/SiteSettingsContext.jsx';
import { copy } from './constants/copy.js';

const DESKTOP_QUERY = '(min-width: 1024px)';
const JOB_MATCH_PANEL_WIDTH = 384;

/** Tracks the large breakpoint so the job match panel can be a panel or a modal. */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(DESKTOP_QUERY).matches
      : true,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mediaQuery = window.matchMedia(DESKTOP_QUERY);
    const handleChange = (event) => setIsDesktop(event.matches);
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return isDesktop;
}

export default function App() {
  const { settings } = useSiteSettings();
  const features = settings.features ?? {};
  const showChat = features.chat !== false;
  const showJobMatch = features.jobMatch !== false;
  const showPdfExport = features.pdfExport !== false;
  const showThemeToggle = features.themeToggle !== false;
  const siteName = settings.site?.name?.trim() || copy.brand.name;
  const siteTagline = settings.site?.tagline?.trim() || copy.brand.tagline;
  const logoUrl = settings.site?.logoUrl?.trim();

  const {
    data: profilePayload,
    isLoading: isProfileLoading,
    isError: isProfileError,
    refetch: refetchProfile,
  } = useProfile();

  const {
    conversations,
    isLoading: isConversationsLoading,
    isError: isConversationsError,
    refetch: refetchConversations,
    create,
    remove,
  } = useConversations();

  const [activeTab, setActiveTab] = useState(showChat ? 'chat' : 'profile');
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [jobMatchOpen, setJobMatchOpen] = useState(false);
  const [actionError, setActionError] = useState(null);

  const isDesktop = useIsDesktop();
  const prefersReducedMotion = useReducedMotion();
  const { language, setLanguage } = useLanguage();

  const {
    messages: serverMessages,
    isLoading: isConversationLoading,
    isError: isConversationError,
    error: conversationError,
    refetch: refetchConversation,
  } = useConversation(activeConversationId);

  const {
    messages,
    isStreaming,
    error: streamError,
    sendMessage,
    retryLast,
    stop,
    clearError,
  } = useChatStream({
    conversationId: activeConversationId,
    initialMessages: serverMessages,
    language,
  });

  const pendingQuestionRef = useRef(null);

  // A question asked before any conversation existed is sent as soon as the
  // freshly created conversation becomes the active one.
  useEffect(() => {
    if (!activeConversationId) return;
    const pending = pendingQuestionRef.current;
    if (!pending) return;
    pendingQuestionRef.current = null;
    sendMessage(pending);
  }, [activeConversationId, sendMessage]);

  // A conversation that no longer exists should not block the composer.
  useEffect(() => {
    if (isConversationError && conversationError?.status === 404) {
      setActiveConversationId(null);
    }
  }, [isConversationError, conversationError]);

  // The chat can be switched off from the console after this page has loaded,
  // so the active tab has to fall back to a panel that still exists.
  useEffect(() => {
    if (!showChat && activeTab === 'chat') setActiveTab('profile');
  }, [activeTab, showChat]);

  const dismissErrors = useCallback(() => {
    clearError();
    setActionError(null);
  }, [clearError]);

  const handleSend = useCallback(
    async (text) => {
      const trimmed = String(text ?? '').trim();
      if (!trimmed || isStreaming) return false;

      clearError();
      setActionError(null);
      setActiveTab('chat');

      if (activeConversationId) {
        await sendMessage(trimmed);
        return true;
      }

      pendingQuestionRef.current = trimmed;
      try {
        const created = await create.mutateAsync({});
        if (!created?.id) {
          pendingQuestionRef.current = null;
          return false;
        }
        setActiveConversationId(created.id);
        return true;
      } catch (error) {
        pendingQuestionRef.current = null;
        setActionError({ code: error?.code, message: error?.message || copy.errors.generic });
        return false;
      }
    },
    [activeConversationId, clearError, create, isStreaming, sendMessage],
  );

  const handleNewChat = useCallback(() => {
    clearError();
    setActionError(null);
    setSidebarOpen(false);
    setActiveTab('chat');
    setActiveConversationId(null);
  }, [clearError]);

  const handleSelectConversation = useCallback(
    (conversationId) => {
      clearError();
      setActionError(null);
      setSidebarOpen(false);
      setActiveTab('chat');
      if (conversationId !== activeConversationId) setActiveConversationId(conversationId);
    },
    [activeConversationId, clearError],
  );

  const handleDeleteConversation = useCallback(
    async (conversationId) => {
      await remove.mutateAsync(conversationId);
      setActiveConversationId((current) => (current === conversationId ? null : current));
    },
    [remove],
  );

  const handleRetryConversation = useCallback(() => {
    refetchConversation();
  }, [refetchConversation]);

  const handleToggleJobMatch = useCallback(() => {
    setJobMatchOpen((open) => !open);
  }, []);

  const handleOpenJobMatch = useCallback(() => {
    setJobMatchOpen(true);
  }, []);

  const handleCloseJobMatch = useCallback(() => {
    setJobMatchOpen(false);
  }, []);

  const candidateName = profilePayload?.profile?.fullName?.trim() || siteName;
  const profile = profilePayload?.profile ?? null;
  const updatedAt = profilePayload?.updatedAt ?? null;

  const hasExportableMessages = messages.some((message) => String(message.content || '').trim());

  const handleExportConversation = useCallback(() => {
    const active = conversations.find((conversation) => conversation.id === activeConversationId);
    exportConversationPdf({
      candidateName,
      title: active?.title || copy.chat.title,
      messages: messages.filter(
        (message) =>
          message.role === 'user' || (message.role === 'assistant' && message.status !== 'failed'),
      ),
    });
  }, [activeConversationId, candidateName, conversations, messages]);

  const jobMatchAside = (
    <AnimatePresence initial={false}>
      {showJobMatch && jobMatchOpen && isDesktop ? (
        <motion.aside
          key="job-match-panel"
          aria-label={copy.jobMatch.title}
          className="relative shrink-0 overflow-hidden border-l border-line bg-surface"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: JOB_MATCH_PANEL_WIDTH, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={
            prefersReducedMotion ? { duration: 0 } : { type: 'tween', duration: 0.24, ease: 'easeOut' }
          }
        >
          <div
            className="absolute inset-y-0 right-0"
            style={{ width: JOB_MATCH_PANEL_WIDTH }}
          >
            <JobMatchPanel onClose={handleCloseJobMatch} candidateName={candidateName} className="w-full" />
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );

  return (
    <>
      <AppShell
        sidebarOpen={sidebarOpen}
        onSidebarClose={() => setSidebarOpen(false)}
        aside={jobMatchAside}
        sidebarContent={
          <Sidebar
            profile={profile}
            isProfileLoading={isProfileLoading}
            isProfileError={isProfileError}
            onRetryProfile={refetchProfile}
            conversations={conversations}
            isConversationsLoading={isConversationsLoading}
            isConversationsError={isConversationsError}
            onRetryConversations={refetchConversations}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
            onDeleteConversation={handleDeleteConversation}
          />
        }
        topBar={
          <TopBar
            candidateName={candidateName}
            onOpenSidebar={() => setSidebarOpen(true)}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onOpenJobMatch={handleOpenJobMatch}
          />
        }
        header={
          <header className="flex h-14 w-full items-center gap-3 border-b border-line bg-surface px-4">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt=""
                className="h-8 w-8 shrink-0 rounded-lg border border-line object-contain"
              />
            ) : null}

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{candidateName}</p>
              <p className="truncate text-2xs text-ink-subtle">{siteTagline}</p>
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              <PanelTabs activeTab={activeTab} onTabChange={setActiveTab} showChat={showChat} />
              {showChat && activeTab === 'chat' && showPdfExport ? (
                <IconButton
                  label={copy.chat.exportPdf}
                  icon={FileDown}
                  size="md"
                  disabled={!hasExportableMessages || isStreaming}
                  onClick={handleExportConversation}
                />
              ) : null}
              {showJobMatch ? (
                <IconButton
                  label={copy.jobMatch.togglePanel}
                  icon={Target}
                  size="md"
                  variant={jobMatchOpen ? 'solid' : 'ghost'}
                  aria-pressed={jobMatchOpen}
                  onClick={handleToggleJobMatch}
                />
              ) : null}
              {showThemeToggle ? <ThemeToggle size="md" /> : null}
            </div>
          </header>
        }
      >
        {showChat ? (
          <div
            id="panel-chat"
            role="tabpanel"
            aria-labelledby="tab-chat"
            className={activeTab === 'chat' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}
          >
            <ChatPanel
              conversationId={activeConversationId}
              messages={messages}
              isStreaming={isStreaming}
              isStarting={create.isPending}
              error={streamError || actionError}
              onDismissError={dismissErrors}
              onSend={handleSend}
              onStop={stop}
              onRetry={retryLast}
              canRetry={!isStreaming}
              profile={profile}
              isProfileLoading={isProfileLoading}
              isLoadingConversation={Boolean(activeConversationId) && isConversationLoading}
              isConversationError={isConversationError}
              onRetryConversation={handleRetryConversation}
              language={language}
              onLanguageChange={setLanguage}
            />
          </div>
        ) : null}

        <div
          id="panel-profile"
          role="tabpanel"
          aria-labelledby="tab-profile"
          className={activeTab === 'profile' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}
        >
          <ProfilePanel
            profile={profile}
            updatedAt={updatedAt}
            isLoading={isProfileLoading}
            isError={isProfileError}
            onRetry={refetchProfile}
          />
        </div>
      </AppShell>

      <Modal
        open={showJobMatch && jobMatchOpen && !isDesktop}
        onClose={handleCloseJobMatch}
        title={copy.jobMatch.title}
        description={copy.jobMatch.subtitle}
        size="lg"
      >
        <JobMatchPanel embedded candidateName={candidateName} />
      </Modal>
    </>
  );
}
