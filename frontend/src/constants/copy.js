/**
 * Every user-facing string for the public site lives here so the UI never
 * scatters copy inline. The operator console keeps its own vocabulary in
 * `adminCopy.js`, re-exported as `copy.admin`.
 */

import { adminCopy } from './adminCopy.js';

export const APP_NAME = 'AI Portfolio Assistant';
export const APP_INITIALS_FALLBACK = 'AI';

export const copy = {
  admin: adminCopy,

  brand: {
    name: APP_NAME,
    tagline: 'Recruiter assistant',
  },

  tabs: {
    chat: 'Chat',
    profile: 'Profile',
  },

  language: {
    label: 'Answer language',
    english: 'English',
    hindi: 'Hindi',
    englishShort: 'EN',
    hindiShort: 'हिं',
    switchToEnglish: 'Answer in English',
    switchToHindi: 'Answer in Hindi',
  },

  sidebar: {
    newChat: 'New chat',
    history: 'Conversations',
    historyEmpty: 'No conversations yet. Ask the first question to start one.',
    deleteConversation: 'Delete conversation',
    deleteConversationConfirmTitle: 'Delete this conversation?',
    deleteConversationConfirmBody:
      'The conversation and all of its messages are permanently removed. This cannot be undone.',
    deleteConfirm: 'Delete',
    cancel: 'Cancel',
    theme: 'Theme',
    openNavigation: 'Open navigation',
  },

  chat: {
    title: 'Conversation',
    you: 'You',
    copyAnswer: 'Copy answer',
    copied: 'Copied',
    copyFailed: 'Copy failed',
    retry: 'Retry',
    exportPdf: 'Export conversation as PDF',
    scrollToBottom: 'Scroll to latest',
    generating: 'Generating answer',
    stopped: 'Stopped before the answer finished.',
    failedLabel: 'This answer did not complete.',
    disclaimer:
      'Answers are generated from the verified profile. Treat unverified claims as unconfirmed.',
  },

  composer: {
    label: 'Your question',
    placeholder: 'Ask about the candidate — projects, experience, skills, fit for a role…',
    send: 'Send',
    stop: 'Stop',
    stopGenerating: 'Stop generating',
    counterHint: 'characters remaining',
    hintEnter: 'Enter to send, Shift + Enter for a new line',
  },

  voice: {
    start: 'Dictate your question',
    stop: 'Stop dictation',
    listening: 'Listening…',
    unsupported: 'Voice input is not supported by this browser. Chrome or Edge is required.',
    denied: 'Microphone access was blocked. Allow it in your browser settings and try again.',
    noSpeech: 'No speech was detected. Check your microphone and try again.',
    network: 'The speech service could not be reached. Check your connection and try again.',
    error: 'Voice input stopped unexpectedly. Try again.',
  },

  speak: {
    play: 'Read this answer aloud',
    stop: 'Stop reading',
    unsupported: 'Voice playback is not supported by this browser.',
  },

  welcome: {
    eyebrow: 'Ready when you are',
    fallbackName: 'Candidate',
    fallbackHeadline: 'Verified candidate profile',
    fallbackSummary:
      'The profile is loaded from the backend. Ask a question to see how the assistant answers from verified evidence.',
    summaryLabel: 'Summary',
    suggestedTitle: 'Suggested recruiter questions',
    suggestedSubtitle: 'Select a question to ask it straight away.',
    statsTitle: 'At a glance',
    statProjects: 'Projects',
    statSkills: 'Skills',
    statEducation: 'Education entries',
    statExperience: 'Experience entries',
    statLearning: 'Currently learning',
    primaryStack: 'Primary stack',
    noStack: 'Not listed yet',
  },

  profile: {
    subtitle: 'Rendered directly from the verified profile served by the backend.',
    sampleNotice:
      'This profile is flagged as sample data by the backend, so treat it as a demonstration.',
    sampleBadge: 'Sample data',
    updatedAt: 'Profile last updated',
    contact: 'Contact',
    summary: 'Professional summary',
    skills: 'Skills',
    skillsEmpty: 'No skills were listed in this profile.',
    skillsCount: 'skills',
    skillUnit: 'skill',
    skillGroups: {
      languages: 'Languages',
      frameworks: 'Frameworks',
      databases: 'Databases',
      tools: 'Tools',
      concepts: 'Concepts',
    },
    currentlyLearning: 'Currently learning',
    projects: 'Projects',
    projectUnit: 'project',
    projectsEmpty:
      'No projects were listed in this profile, so there is no project evidence to review.',
    education: 'Education',
    educationEmpty: 'No education entries were provided in this profile.',
    experience: 'Experience',
    experienceEmpty:
      'No work experience was provided in this profile. Any hands-on experience is evidenced through the listed projects instead.',
    internship: 'Internship',
    achievements: 'Achievements',
    achievementsEmpty: 'No achievements were listed in this profile.',
    certifications: 'Certifications',
    certificationsEmpty: 'No certifications were listed in this profile.',
    codingProfiles: 'Coding profiles',
    links: 'Links',
    linksEmpty: 'No links were listed in this profile.',
    careerInterests: 'Career interests',
    careerInterestsEmpty: 'No career preferences were listed in this profile.',
    preferredRoles: 'Preferred roles',
    preferredLocations: 'Preferred locations',
    workType: 'Work type',
    repository: 'Repository',
    liveSite: 'Live',
    credential: 'View credential',
    verified: 'Verified',
    unverified: 'Unverified',
    present: 'Present',
    grade: 'Grade',
    highlights: 'Highlights',
  },

  resume: {
    title: 'Import from resume',

    uploadStep: 'Step 1 of 2',
    uploadTitle: 'Upload a resume',
    uploadBody: 'PDF only, up to 5 MB. The file is validated in memory and never written to disk.',
    dropzoneIdle: 'Drag and drop a PDF here, or',
    dropzoneBrowse: 'browse your files',
    dropzoneActive: 'Drop the PDF to select it',
    selectedFile: 'Selected file',
    removeFile: 'Remove',
    extract: 'Extract profile data',
    extracting: 'Extracting…',

    reviewNotice:
      'Nothing has been saved yet. Correct anything that is wrong, clear the fields you do not want to apply, then confirm.',
    unverifiedTitle: 'Unverified extraction',
    sourceFile: 'Source file',
    analysed: 'characters analysed',
    detectedTitle: 'Detected sections',
    detectedEmpty: 'No labelled sections were detected in this document.',
    fieldsTitle: 'Extracted fields',
    fieldsEmpty:
      'No structured information could be extracted from this document. Upload a text-based PDF or add the profile manually.',
    includeField: 'Apply',
    excludedField: 'Skipped',
    listHint: 'One entry per line.',
    jsonHint: 'Edit as JSON.',
    jsonInvalid: 'Not valid JSON — this field will be skipped.',
    mergeNote:
      'Applied fields replace their profile counterparts; skills, links and career interests are merged so nothing already there is lost.',
    apply: 'Apply to profile',
    applying: 'Applying…',
    discard: 'Start over',
    keepAll: 'Select all',
    clearAll: 'Clear all',

    appliedTitle: 'Profile updated',
    appliedBody: 'The confirmed values were applied to the candidate profile.',
    appliedCount: 'fields applied',
    viewProfile: 'View the updated profile',
    importAnother: 'Import another resume',

    failedTitle: 'The resume could not be processed',
    emptyTitle: 'No resume imported yet',
    emptyBody: 'Upload a PDF resume to preview what the AI service can extract into the profile.',

    modeImport: 'Import',
    modeCompare: 'Compare versions',

    compare: {
      title: 'Compare two resume versions',
      body: 'Upload an older and a newer resume. Both are extracted and the differences between the resulting profile drafts are listed below.',
      olderLabel: 'Older version',
      newerLabel: 'Newer version',
      run: 'Extract and compare',
      running: 'Comparing…',
      needBoth: 'Choose both PDF files before comparing.',
      resultTitle: 'Detected changes',
      addedLabel: 'added',
      changedLabel: 'changed',
      removedLabel: 'removed',
      noChanges:
        'The two resumes produced the same profile data, so no differences were detected.',
      unchangedTitle: 'Unchanged fields',
      showUnchanged: 'Show unchanged fields',
      hideUnchanged: 'Hide unchanged fields',
      before: 'Before',
      after: 'After',
      statusAdded: 'Added',
      statusRemoved: 'Removed',
      statusChanged: 'Changed',
      statusUnchanged: 'Unchanged',
      failedTitle: 'The comparison could not be completed',
      emptyTitle: 'No comparison yet',
      emptyBody:
        'Choose an older and a newer resume, then run the comparison to see what changed between them.',
      reset: 'Start over',
    },
  },

  jobMatch: {
    title: 'Job match',
    subtitle:
      'Compare the verified profile against a job description to see where the evidence lines up.',
    openPanel: 'Open job match',
    closePanel: 'Close job match',
    togglePanel: 'Toggle job match panel',
    formTitle: 'Paste a job description',
    formDescription:
      'Include the responsibilities and requirements. The longer and more specific the description, the more precise the report.',
    fieldLabel: 'Job description',
    fieldPlaceholder:
      'Paste the full job description here: responsibilities, required skills, preferred skills and seniority…',
    analyse: 'Analyse match',
    analysing: 'Analysing…',
    reset: 'Analyse another role',
    resultTitle: 'Match report',
    exportPdf: 'Export PDF',
    scoreCaption:
      'Approximate profile-to-job match. This is not a probability of being hired and not an automated hiring decision.',
    scoreLabelFallback: 'Suitability',
    rubric: 'Scoring rubric',
    rubricCriterion: 'Criterion',
    rubricWeight: 'Weight',
    rubricAwarded: 'Awarded',
    rubricRationale: 'Rationale',
    rubricEmpty: 'No rubric detail was returned for this analysis.',
    matchedRequired: 'Required requirements',
    matchedPreferred: 'Preferred requirements',
    matchedEvidence: 'Evidence',
    matchedNone: 'No required requirements were matched against the profile.',
    matchedPreferredNone: 'No preferred requirements were matched against the profile.',
    matched: 'Matched',
    notMatched: 'Not evidenced',
    missingTitle: 'Missing or unverified',
    missingNote: 'Not evidenced in the verified profile.',
    strengthsTitle: 'Strengths',
    areasTitle: 'Areas to evaluate',
    questionsTitle: 'Suggested interview questions',
    limitationsTitle: 'Limitations of this analysis',
    disclaimerTitle: 'Disclaimer',
    emptyTitle: 'No analysis yet',
    emptyBody:
      'Paste a job description and run the analysis to see the score, the rubric breakdown and the evidence behind it.',
  },

  states: {
    retry: 'Try again',
    errorTitle: 'Something went wrong',
    profileErrorTitle: 'The candidate profile could not be loaded',
    profileErrorBody:
      'The chat still works, but profile details and quick stats are unavailable until the backend responds.',
    conversationsErrorTitle: 'Conversations could not be loaded',
    conversationsErrorBody: 'Check that the backend is running, then try again.',
    conversationErrorTitle: 'This conversation could not be loaded',
    conversationErrorBody: 'The conversation is no longer available. Start a new chat.',
    emptyTitle: 'Nothing here yet',
    emptyBody: 'There is nothing to show for this section.',
    dismiss: 'Dismiss',
    crashTitle: 'The interface hit an unexpected error',
    crashBody:
      'Reloading the page usually resolves this. No data has been submitted anywhere from this screen.',
    reload: 'Reload the page',
  },

  errors: {
    generic: 'Something went wrong. Please try again.',
    network: 'Could not reach the server. Check your connection and try again.',
    timeout: 'The request took too long. Please try again.',
    aborted: 'The request was cancelled.',
    streamUnavailable: 'Streaming is not supported by this browser.',
    incompleteStream: 'The answer stopped before it finished. You can retry the question.',
    notFound: 'That resource could not be found.',
    badRequest: 'The request was rejected. Please review the input and try again.',
    unauthorized: 'This action is not permitted.',
    rateLimited: 'Too many requests right now. Please wait a moment and try again.',
    server: 'The server reported an error. Please try again shortly.',
  },

  a11y: {
    navigation: 'Conversation navigation',
    panelTabs: 'Main sections',
    messageLog: 'Conversation messages',
    themeToggleLight: 'Switch to light theme',
    themeToggleDark: 'Switch to dark theme',
    candidateAvatar: 'Candidate avatar',
    assistantAvatar: 'Assistant avatar',
  },

  validation: {
    messageRequired: 'Enter a question before sending.',
    messageTooLong: 'Questions are limited to 2000 characters.',
    jobDescriptionRequired: 'Paste a job description before running the analysis.',
    jobDescriptionTooShort: 'Add at least 20 characters so the analysis has something to work with.',
    jobDescriptionTooLong: 'Job descriptions are limited to 20000 characters.',
    resumeRequired: 'Choose a PDF resume before extracting.',
    resumeType: 'Only PDF resumes are accepted. Choose a .pdf file.',
    resumeTooLarge: 'Resumes must be 5 MB or smaller.',
    resumeNothingSelected: 'Select at least one field to apply.',
  },
};

export default copy;
