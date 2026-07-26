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

export const APPLICATION_STEPS = [
  { key: 'submitted', label: 'Application Submitted', icon: 'FileText' },
  { key: 'documents', label: 'Documents Received', icon: 'FolderCheck' },
  { key: 'review', label: 'Under Review', icon: 'Search' },
  { key: 'interview', label: 'Interview', icon: 'Video' },
  { key: 'medical', label: 'Medical', icon: 'HeartPulse' },
  { key: 'visa', label: 'Visa Processing', icon: 'Plane' },
  { key: 'deployment', label: 'Deployment', icon: 'Ship' },
] as const;

export const STATUSES = ['Pending', 'Under Review', 'Interview', 'Medical', 'Visa Processing', 'Deployment', 'Approved', 'Rejected'] as const;

export const VERIFICATION = ['Pending', 'Verified', 'Rejected'] as const;

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
