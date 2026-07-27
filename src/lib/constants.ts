export const DOC_TYPES = [
  { key: 'passport', label: 'Passport', icon: 'BookUser' },
  { key: 'cv', label: 'CV / Resume', icon: 'FileText' },
  { key: 'medical', label: 'Medical Certificate', icon: 'HeartPulse' },
  { key: 'seaman_book', label: 'Seaman Book', icon: 'BookOpen' },
  { key: 'stcw', label: 'STCW Certificate', icon: 'Award' },
  { key: 'police_clearance', label: 'Police Clearance', icon: 'ShieldCheck' },
  { key: 'education', label: 'Educational Certificate', icon: 'GraduationCap' },
  { key: 'photo', label: 'Passport Photo', icon: 'Image' },
  { key: 'receipt', label: 'Payment Receipt', icon: 'Receipt' },
] as const;

// Documents required before the registration fee step.
// Only passport and CV/resume are mandatory to proceed; other docs are optional.
export const REQUIRED_DOC_KEYS = ['passport', 'cv'];

export const APPLICATION_STEPS = [
  { key: 'account', label: 'Account Created', icon: 'UserCheck' },
  { key: 'submitted', label: 'Application Submitted', icon: 'FileText' },
  { key: 'documents', label: 'Documents Uploaded', icon: 'FolderCheck' },
  { key: 'fee_paid', label: 'Registration Fee Paid', icon: 'CreditCard' },
  { key: 'payment_verified', label: 'Payment Verified', icon: 'BadgeCheck' },
  { key: 'review', label: 'Under Review', icon: 'Search' },
  { key: 'interview', label: 'Interview', icon: 'Video' },
  { key: 'medical', label: 'Medical', icon: 'HeartPulse' },
  { key: 'visa', label: 'Visa Processing', icon: 'Plane' },
  { key: 'deployment', label: 'Deployment', icon: 'Ship' },
] as const;

export const TOTAL_STEPS = APPLICATION_STEPS.length;

export const STATUSES = [
  'Pending', 'Awaiting Payment', 'Pending Verification',
  'Under Review', 'Interview', 'Medical', 'Visa Processing',
  'Deployment', 'Approved', 'Rejected',
] as const;

export const VERIFICATION = ['Pending', 'Verified', 'Rejected'] as const;

// Maps a 1-indexed current_step to the application status label.
export function statusForStep(step: number): string {
  const map: Record<number, string> = {
    3: 'Pending',
    4: 'Awaiting Payment',
    5: 'Pending Verification',
    6: 'Under Review',
    7: 'Interview',
    8: 'Medical',
    9: 'Visa Processing',
    10: 'Deployment',
    11: 'Approved',
  };
  return map[step] ?? 'Pending';
}

export const NOTIF_TYPES = [
  { key: 'message', label: 'New Messages', icon: 'MessageSquare' },
  { key: 'interview', label: 'Interview Schedule', icon: 'CalendarClock' },
  { key: 'missing_document', label: 'Missing Documents', icon: 'FileWarning' },
  { key: 'payment', label: 'Payment Confirmation', icon: 'CreditCard' },
  { key: 'visa', label: 'Visa Updates', icon: 'Plane' },
  { key: 'application', label: 'Application Updates', icon: 'ClipboardList' },
] as const;

export const STATS = [
  { key: 'jobs', label: 'Jobs Available', value: 1240, suffix: '+' },
  { key: 'applicants', label: 'Applicants', value: 18500, suffix: '+' },
  { key: 'partners', label: 'Partner Cruise Lines', value: 48, suffix: '' },
  { key: 'countries', label: 'Countries Served', value: 62, suffix: '' },
] as const;

export const CRUISE_LINES = [
  'Carnival Cruise Line', 'Royal Caribbean', 'Norwegian Cruise Line',
  'MSC Cruises', 'Costa Cruises', 'Princess Cruises', 'Holland America Line',
  'Celebrity Cruises', 'Disney Cruise Line', 'P&O Cruises',
] as const;

export const POSITIONS = [
  'Deck Officer', 'Chief Engineer', 'Steward', 'Chef', 'Bartender',
  'Housekeeping', 'Waiter/Waitress', 'Entertainer', 'Nurse', 'Security Guard',
  'Electrician', 'Plumber', 'Beautician', 'Photographer', 'Receptionist',
] as const;

export const PAYMENT_METHODS = ['CBE', 'Telebirr', 'M-PESA'] as const;

export const PAYMENT_ACCOUNTS = [
  {
    method: 'CBE',
    label: 'Commercial Bank of Ethiopia',
    accountName: 'Mr Tsegu Tesfaye',
    accountNumber: '1000777925206',
    swiftCode: 'CBETETAA',
    branch: 'Bole Branch, Addis Ababa',
    color: 'from-emerald-500 to-emerald-700',
    icon: 'Landmark',
  },
  {
    method: 'Telebirr',
    label: 'Telebirr Mobile Money',
    accountName: 'Ocean Goers Recruitment',
    accountNumber: '0911234567',
    swiftCode: '',
    branch: 'Registered under Ocean Goers',
    color: 'from-sky-500 to-sky-700',
    icon: 'Smartphone',
  },
  {
    method: 'M-PESA',
    label: 'M-PESA Mobile Money',
    accountName: 'Ocean Goers Recruitment',
    accountNumber: '0712345678',
    swiftCode: '',
    branch: 'Registered under Ocean Goers',
    color: 'from-lime-500 to-lime-700',
    icon: 'Smartphone',
  },
] as const;
