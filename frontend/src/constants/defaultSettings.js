/**
 * The client-side fallback for the public site settings.
 *
 * The backend is the source of truth (`GET /api/settings`); this document is
 * only used before that request resolves or when the backend is unreachable, so
 * the public site always renders complete copy instead of empty placeholders.
 * Keep it in step with `backend/src/main/resources/default-settings.json`.
 */
export const defaultSettings = {
  site: {
    name: 'AI Portfolio Assistant',
    shortName: 'AI Portfolio',
    initials: 'AI',
    tagline: 'Recruiter assistant',
    accentColor: '#4f46e5',
    logoUrl: '',
  },
  hero: {
    eyebrow: 'Ready when you are',
    headline: 'Verified candidate profile',
    summary:
      'The profile is loaded from the backend. Ask a question to see how the assistant answers from verified evidence.',
    summaryLabel: 'Summary',
    suggestedTitle: 'Suggested recruiter questions',
    suggestedSubtitle: 'Select a question to ask it straight away.',
    statLabels: {
      projects: 'Projects',
      skills: 'Skills',
      education: 'Education entries',
      experience: 'Experience entries',
      learning: 'Currently learning',
    },
  },
  questions: [
    {
      label: 'Why should we hire this candidate?',
      question:
        'Why should we hire this candidate? Build the case strictly from the verified profile, and be explicit about what is not evidenced.',
      featured: true,
    },
    {
      label: 'What are the strongest projects?',
      question:
        'Which projects in this profile best demonstrate production-oriented engineering, and what evidence supports that?',
      featured: false,
    },
    {
      label: 'How strong is the backend work?',
      question:
        'Summarise the backend engineering experience with Spring Boot, including the APIs, data modelling and testing the candidate has evidence for.',
      featured: false,
    },
    {
      label: 'Where is measurable impact shown?',
      question:
        'List the measurable outcomes the candidate has evidenced across projects and experience, with the numbers and how each was achieved.',
      featured: false,
    },
    {
      label: 'What applied AI work is evidenced?',
      question:
        'What applied AI or LLM integration work is evidenced in this profile, and which parts remain experimental rather than production-ready?',
      featured: false,
    },
    {
      label: 'What is missing or unverified?',
      question:
        'Which commonly expected areas are not evidenced in this verified profile, and how should a recruiter follow up on each of them?',
      featured: false,
    },
    {
      label: 'Would they fit a backend role?',
      question:
        'Assess the fit for an entry-level backend developer role focused on Java and Spring Boot, and explain which evidence supports or weakens that fit.',
      featured: false,
    },
    {
      label: 'What are they learning now?',
      question:
        'What is the candidate currently learning, and how does that align with the direction of the work they have already evidenced?',
      featured: false,
    },
    {
      label: 'What should we ask in an interview?',
      question:
        'Suggest interview questions that would verify the claims in this profile, and explain what each question is designed to test.',
      featured: false,
    },
  ],
  features: {
    chat: true,
    jobMatch: true,
    pdfExport: true,
    languageToggle: true,
    voiceInput: true,
    themeToggle: true,
  },
  contact: {
    showEmail: true,
    showPhone: true,
    showLocation: true,
  },
  footer: {
    text: '',
    showDisclaimer: true,
    disclaimerText:
      'Answers are generated from the verified profile. Treat unverified claims as unconfirmed.',
  },
};

export default defaultSettings;
