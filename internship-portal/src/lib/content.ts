import type { Role, Track } from './types';

/** Programmes students can pick in the "I study…" control. */
export const PROGRAMMES = [
  'B.Tech',
  'BCA',
  'MCA',
  'B.Sc',
  'M.Sc',
  'BA',
  'MA',
  'B.Com',
  'M.Com',
  'BBA',
  'MBA',
  'CA / CMA / CFA / CS',
  'B.Des',
  'Law',
  'Pharmacy',
  'Other',
] as const;

export function roleIsOpenTo(role: Role, programme: string) {
  if (!programme) return true;
  return role.programmes.includes('Any') || role.programmes.includes(programme);
}

export const TRACK_COLOURS: Record<Track, { bg: string; ink: string }> = {
  Tech: { bg: 'var(--color-ink)', ink: 'var(--color-paper)' },
  Finance: { bg: 'var(--color-green-deep)', ink: 'var(--color-paper)' },
  'Business & Sales': { bg: 'var(--color-saffron)', ink: 'var(--color-ink)' },
  'Human Resources': { bg: 'var(--color-green)', ink: 'var(--color-ink)' },
  Psychology: { bg: 'var(--color-mist-deep)', ink: 'var(--color-ink)' },
  'Creative & Media': { bg: 'var(--color-saffron-soft)', ink: 'var(--color-ink)' },
};

export const TRACK_BLURB: Record<Track, string> = {
  Tech: 'B.Tech CS/IT/AI-DS, BCA, MCA, B.Sc CS',
  Finance: 'B.Com, BBA, MBA Finance, CA / CMA / CFA / CS',
  'Business & Sales': 'MBA, BBA and anyone who likes selling',
  'Human Resources': 'MBA HR and final-year BBA HR',
  Psychology: 'BA, B.Sc, MA, M.Sc Psychology',
  'Creative & Media': 'Any degree with a portfolio or a voice',
};

export const SCHOOL_SUGGESTIONS = [
  'School of Computer Science & Engineering',
  'School of Computer Engineering & Technology',
  'School of Electrical & Electronics Engineering',
  'School of Mechanical Engineering',
  'School of Civil Engineering',
  'School of Business',
  'Faculty of Management',
  'School of Economics & Commerce',
  'School of Law',
  'School of Design',
  'School of Liberal Arts',
  'School of Media & Communication',
  'School of Fine & Performing Arts',
  'School of Science & Environmental Studies',
  'School of Health Sciences & Technology',
  'School of Pharmacy',
  'School of Education',
];

export const YEARS_OF_STUDY = ['1st year', '2nd year', '3rd year', '4th year', '5th year', 'Graduated 2026'];
export const GRAD_YEARS = ['2026', '2027', '2028', '2029', '2030', '2031'];
export const PROFESSIONAL_COURSES = ['CA', 'CMA', 'CFA', 'CS'];
export const OFFICE_OPTIONS = ['Yes, full-time', 'Yes, part-time', 'Hybrid only', 'Remote only'];

export function interviewSlots(days: string[]) {
  const label = (d: string) =>
    new Date(`${d}T12:00:00+05:30`).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' });
  const slots: string[] = [];
  days.forEach((d) => {
    slots.push(`${label(d)} · morning`);
    slots.push(`${label(d)} · afternoon`);
  });
  slots.push('Online only');
  return slots;
}

/** Answers the companies sent on 28 Oct 2026, written for students. */
export const FAQ: { q: string; a: string }[] = [
  {
    q: 'How long are the internships, and when do I join?',
    a: 'Every company wants at least three months and would like you to join as soon as possible. Some run longer: Bottomline and InnoTech prefer six months, CFO Pulse three to six, D’Quor 100 days. ParsBEM and D’Quor will match your college internship period.',
  },
  {
    q: 'What is the selection process?',
    a: 'Interviews only, no group discussions. D’Quor’s five creative roles also ask for a short task, which you send with this application.',
  },
  {
    q: 'How many roles can I apply for?',
    a: 'Up to three, ranked in order of preference, in one form with one resume. If you accept an offer, your other applications in this drive are withdrawn.',
  },
  {
    q: 'Adviter asks for final-year MBA. Can BBA or MBA first-years apply?',
    a: 'Yes. Final-year BBA students and first-year MBA students can apply along with final-year MBA students and fresh graduates.',
  },
  {
    q: 'Is Bottomline’s HR role only for MBA HR?',
    a: 'No. Final-year BBA (HR) students can apply too. All three Bottomline roles are hybrid, with three days a week in the office.',
  },
  {
    q: 'Should I apply for junior or senior financial analyst at CFO Pulse?',
    a: 'Apply once for the role. CFO Pulse places you at junior or senior level based on your experience. It is a three to six month internship, fully in the Baner office.',
  },
  {
    q: 'InnoTech says three to six months but also six. Which is it? Where is the office?',
    a: 'Three months is the minimum and six is appreciated. Both InnoTech roles are hybrid, three days a week at the Bhosari office.',
  },
  {
    q: 'ParsBEM says “immediate joining”. What if my internship period starts later?',
    a: 'You can join according to your college internship period. The role is in the Hinjewadi Phase 2 office six days a week.',
  },
  {
    q: 'How many interns do D’Quor and Studio Coriander need?',
    a: 'Two for each of D’Quor’s five roles, and two for Studio Coriander’s sales and marketing role.',
  },
];

export const PHOTO_CREDITS = [
  {
    file: '/images/mitwpu-campus.jpg',
    title: 'MIT WPU campus visible while descending Vetal Hill',
    author: 'DesiBoy101',
    licence: 'CC BY 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
    source: 'https://commons.wikimedia.org/wiki/File:MIT_WPU_campus_visible_while_descending_Vetal_Hill.jpg',
  },
  {
    file: '/images/baner.jpg',
    title: 'Baner from Baner Pashan Biodiversity Park',
    author: 'Rishabh Tatiraju',
    licence: 'CC BY-SA 3.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    source: 'https://commons.wikimedia.org/wiki/File:Baner_from_Baner_Pashan_Biodiversity_Park.JPG',
  },
  {
    file: '/images/baner-evening.jpg',
    title: 'Baner hill Pune wonderful evening view',
    author: 'Naincy555',
    licence: 'CC BY-SA 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    source: 'https://commons.wikimedia.org/wiki/File:Baner_hill_Pune_wonderful_evening_view.jpg',
  },
  {
    file: '/images/hinjewadi.jpg',
    title: 'Blue Ridge Office Building at Hinjewadi Pune',
    author: 'Deepak Patil',
    licence: 'CC BY-SA 3.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    source: 'https://commons.wikimedia.org/wiki/File:Blue_Ridge_Office_Building_at_Hinjewadi_Pune_-_panoramio.jpg',
  },
  {
    file: '/images/bhosari.jpg',
    title: 'PMPML Rainbow Bhosari Terminal',
    author: 'Rsrikanth05',
    licence: 'CC BY-SA 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    source: 'https://commons.wikimedia.org/wiki/File:PMPML-Rainbow-Bhosari-Terminal.jpg',
  },
];
