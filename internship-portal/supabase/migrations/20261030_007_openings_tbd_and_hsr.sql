-- Migration: Set all role openings to NULL (TBD), remove pending companies ISC & INP, and add HyperSphere Robotics JD
-- 1. Set all existing role openings to NULL so all roles display as TBD
update public.roles set openings = null;

-- 2. Remove pending companies with no JDs (Indian Souvenir Company and Innoips)
delete from public.company_users where company_code in ('ISC', 'INP');
delete from public.companies where code in ('ISC', 'INP');

-- 2. Add the Technical Documentation & Operations Intern role under ParsBEM (HyperSphere Robotics)
insert into public.roles (
  code,
  company_code,
  title,
  track,
  tags,
  programmes,
  summary,
  about,
  responsibilities,
  requirements,
  good_to_have,
  perks,
  eligibility,
  openings,
  stipend,
  duration,
  work_mode,
  location,
  joining,
  needs_portfolio,
  portfolio_hint,
  challenge,
  challenge_materials_url,
  jd_url,
  interview_minutes,
  is_open,
  sort_order
) values (
  'PAR-TDO',
  'PAR',
  'Technical Documentation & Operations Intern',
  'Tech',
  array['Technical writing', 'Operations', 'Robotics & Drones', 'SOPs', 'Quality assurance', 'Process improvement'],
  array['B.Tech', 'BCA', 'MCA', 'B.Sc', 'M.Sc', 'BBA', 'MBA', 'Other'],
  'Support HyperSphere Robotics in drone and robotics manufacturing: product manuals, technical specifications, QA checklists and operational coordination.',
  'ParsBEM Group supports startups and emerging businesses through strategic guidance and growth solutions. Through its sister company HyperSphere Robotics, the group is engaged in the drone and robotics manufacturing sector.',
  array[
    'Technical Documentation: Prepare and maintain product manuals, technical specifications, Standard Operating Procedures (SOPs), work instructions and testing procedures.',
    'Quality Assurance: Assist in maintaining quality checklists, inspection records, testing reports and corrective action documentation.',
    'Documentation & Paperwork: Maintain organized physical and digital records, prepare reports, presentations, spreadsheets, meeting notes and internal documentation.',
    'Operational Support: Coordinate with engineering, production and management teams to maintain trackers, inventory records, testing logs and project documentation.',
    'Research & Reporting: Research drone and robotics technologies, industry developments and competitor activities; assist in preparing summaries and presentations.',
    'Process Improvement: Help identify documentation gaps, improve record-keeping practices and streamline routine operational tasks.'
  ],
  array[
    'Pursuing or completed a Bachelor''s or Master''s degree in Engineering (Mechanical, Electronics, Robotics, Mechatronics, CS), Technology, or Business Administration.',
    'Good written and verbal communication skills in English.',
    'Proficiency in Microsoft Office, particularly Word, Excel and PowerPoint.',
    'Strong attention to detail, organizational skills and willingness to learn.',
    'Interest in drones, robotics, manufacturing or emerging technologies.'
  ],
  array['Familiarity with engineering documentation, quality assurance processes, Canva, CAD drawings or basic data analysis.'],
  array[
    'Hands-on exposure to the drone and robotics manufacturing industry.',
    'Practical experience in technical documentation, quality processes and business operations.',
    'Opportunities to collaborate with engineering and manufacturing professionals.'
  ],
  'Engineering (Mechanical, Electronics, Robotics, Mechatronics, CS) or Business Administration students and graduates.',
  null,
  'To be confirmed',
  '3-6 months',
  'Work from office · 5/6 days a week',
  'Gera''s Imperium Rise, Hinjewadi Phase 2, Pune',
  'Immediate',
  false,
  null,
  null,
  null,
  'https://drive.google.com/drive/folders/1efQjdqyqjvK4j9CRYdRj-Y2fXS-IvtuP',
  20,
  true,
  135
) on conflict (code) do update set
  title = excluded.title,
  track = excluded.track,
  tags = excluded.tags,
  programmes = excluded.programmes,
  summary = excluded.summary,
  about = excluded.about,
  responsibilities = excluded.responsibilities,
  requirements = excluded.requirements,
  good_to_have = excluded.good_to_have,
  perks = excluded.perks,
  eligibility = excluded.eligibility,
  openings = null,
  stipend = excluded.stipend,
  duration = excluded.duration,
  work_mode = excluded.work_mode,
  location = excluded.location,
  joining = excluded.joining;

