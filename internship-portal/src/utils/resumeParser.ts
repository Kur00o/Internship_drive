import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure PDF.js worker locally with Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export interface ExtractedData {
  name: string;
  email: string;
  phone: string;
  rollNumber?: string;
  skills: string[];
  collegeName: string;
  degree: string;
  department: string;
  cgpa: string;
  github: string;
  linkedin: string;
  portfolio: string;
  projects: string;
  experience: string;
  graduationYear: string;
}

/**
 * Extract text from a PDF file using pdf.js
 */
async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const textParts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    textParts.push(pageText);
  }

  return textParts.join('\n');
}

/**
 * Extract text from a DOCX file using mammoth
 */
async function extractTextFromDOCX(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

/**
 * Parse extracted text to find candidate information
 */
function parseResumeText(text: string): ExtractedData {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const fullText = text;
  const fullTextLower = fullText.toLowerCase();

  // Extract email
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const emailMatch = fullText.match(emailRegex);
  const email = emailMatch ? emailMatch[0] : '';

  // Extract phone
  const phoneRegex = /(?:\+91[\s-]?)?(?:\d[\s-]?){10}/;
  const phoneMatch = fullText.match(phoneRegex);
  let phone = phoneMatch ? phoneMatch[0].replace(/[\s-]/g, '') : '';
  if (phone && !phone.startsWith('+') && phone.length === 10) {
    phone = '+91' + phone;
  }

  // Extract name — usually the first non-empty, non-email, non-phone line
  let name = '';
  for (const line of lines) {
    const cleaned = line.trim();
    if (
      cleaned.length > 1 &&
      cleaned.length < 60 &&
      !cleaned.includes('@') &&
      !cleaned.match(/^\+?\d{10,}/) &&
      !cleaned.toLowerCase().startsWith('http') &&
      !cleaned.toLowerCase().startsWith('resume') &&
      !cleaned.toLowerCase().startsWith('curriculum')
    ) {
      name = cleaned;
      break;
    }
  }

  // Extract skills
  const knownSkills = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'C',
    'React', 'React Native', 'Angular', 'Vue', 'Next.js', 'Node.js',
    'Express', 'Django', 'Flask', 'Spring Boot', 'Laravel',
    'HTML', 'CSS', 'Tailwind CSS', 'Bootstrap', 'SASS',
    'MongoDB', 'PostgreSQL', 'MySQL', 'SQL', 'Redis', 'Firebase',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes',
    'Git', 'GitHub', 'GitLab', 'CI/CD', 'Jenkins',
    'TensorFlow', 'PyTorch', 'Scikit-learn', 'Pandas', 'NumPy',
    'OpenCV', 'NLP', 'Deep Learning', 'Machine Learning',
    'Figma', 'Adobe XD', 'Adobe Photoshop', 'Adobe Illustrator',
    'REST APIs', 'GraphQL', 'Linux', 'Bash',
    'Terraform', 'Ansible', 'Tableau', 'Power BI',
    'SEO', 'Google Analytics', 'WordPress',
    'Solidity', 'Web3', 'Blockchain',
    'Flutter', 'Dart', 'Swift', 'Kotlin',
    'R', 'MATLAB', 'Go', 'Rust', 'Ruby', 'PHP',
    'Wireshark', 'Penetration Testing', 'Network Security',
    'MS Excel', 'MS Office', 'Tally', 'Canva',
  ];

  const foundSkills: string[] = [];
  for (const skill of knownSkills) {
    const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const skillRegex = new RegExp(`\\b${escapedSkill}\\b`, 'i');
    if (skillRegex.test(fullText)) {
      foundSkills.push(skill);
    }
  }

  // Extract college name
  let collegeName = '';
  const collegePatterns = [
    /(?:university|institute|college|school|iit|nit|iiit|bits|vit|srm|manipal|amity)\s+(?:of\s+)?[a-zA-Z\s,]+/i,
    /[A-Z][a-zA-Z\s]+ (?:University|Institute|College|School)/,
  ];
  for (const pattern of collegePatterns) {
    const match = fullText.match(pattern);
    if (match) {
      collegeName = match[0].trim();
      break;
    }
  }

  // Extract degree
  let degree = '';
  const degreePatterns = [
    /\b(B\.?\s?Tech|BE|B\.?E|BCA|MCA|M\.?\s?Tech|MBA|B\.?Com|M\.?Com|B\.?Sc|M\.?Sc|BBA|Ph\.?D|B\.?A|M\.?A)\b/i,
    /\b(Bachelor|Master)\s+(?:of\s+)?(?:Technology|Engineering|Science|Arts|Commerce|Computer\s+Applications|Business\s+Administration)\b/i,
  ];
  for (const pattern of degreePatterns) {
    const match = fullText.match(pattern);
    if (match) {
      degree = match[0].trim();
      break;
    }
  }

  // Extract department
  let department = '';
  const deptPatterns = [
    /\b(?:Computer\s+Science|Information\s+Technology|Electronics|Electrical|Mechanical|Civil|Chemical|Data\s+Science|Artificial\s+Intelligence)(?:\s+(?:and|&)\s+[A-Za-z]+)?\s*(?:Engineering)?\b/i,
    /\bCSE|ECE|EEE|IT|ME|CE\b/,
  ];
  for (const pattern of deptPatterns) {
    const match = fullText.match(pattern);
    if (match) {
      department = match[0].trim();
      break;
    }
  }

  // Extract CGPA
  let cgpa = '';
  const cgpaRegex = /(?:CGPA|GPA|CPI|SPI)\s*[:\-]?\s*(\d+\.?\d*)/i;
  const cgpaMatch = fullText.match(cgpaRegex);
  if (cgpaMatch) {
    cgpa = cgpaMatch[1];
  } else {
    // Try to find standalone GPA format like 8.5/10
    const gpaAlt = fullText.match(/(\d\.\d{1,2})\s*\/\s*10/);
    if (gpaAlt) cgpa = gpaAlt[1];
  }

  // Extract GitHub
  let github = '';
  const githubRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/i;
  const githubMatch = fullText.match(githubRegex);
  if (githubMatch) {
    github = githubMatch[0];
    if (!github.startsWith('http')) github = 'https://' + github;
  }

  // Extract LinkedIn
  let linkedin = '';
  const linkedinRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i;
  const linkedinMatch = fullText.match(linkedinRegex);
  if (linkedinMatch) {
    linkedin = linkedinMatch[0];
    if (!linkedin.startsWith('http')) linkedin = 'https://' + linkedin;
  }

  // Extract portfolio
  let portfolio = '';
  const urlRegex = /https?:\/\/[a-zA-Z0-9._-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)*/g;
  const allUrls = fullText.match(urlRegex) || [];
  for (const url of allUrls) {
    if (
      !url.includes('github.com') &&
      !url.includes('linkedin.com') &&
      !url.includes('cdnjs.') &&
      !url.includes('googleapis.') &&
      !url.includes('google.com')
    ) {
      portfolio = url;
      break;
    }
  }

  // Extract graduation year
  let graduationYear = '';
  const yearRegex = /(?:graduat|passing|batch|class\s+of|expected)\w*\s*[:\-]?\s*(20\d{2})/i;
  const yearMatch = fullText.match(yearRegex);
  if (yearMatch) {
    graduationYear = yearMatch[1];
  } else {
    // Find years in the range 2024-2030 near education context
    const eduSection = fullText.substring(
      Math.max(0, fullTextLower.indexOf('educat')),
      fullTextLower.indexOf('educat') + 500
    );
    const futureYear = eduSection.match(/\b(202[4-9]|2030)\b/);
    if (futureYear) graduationYear = futureYear[1];
  }

  // Extract projects section
  let projects = '';
  const projIndex = fullTextLower.indexOf('project');
  if (projIndex !== -1) {
    const projSection = fullText.substring(projIndex, projIndex + 500);
    projects = projSection.replace(/^projects?\s*[:\-]?\s*/i, '').trim();
    if (projects.length > 300) projects = projects.substring(0, 300) + '...';
  }

  // Extract experience section
  let experience = '';
  const expKeywords = ['experience', 'work history', 'employment', 'internship'];
  for (const keyword of expKeywords) {
    const idx = fullTextLower.indexOf(keyword);
    if (idx !== -1) {
      const expSection = fullText.substring(idx, idx + 500);
      experience = expSection.replace(/^\w+\s*[:\-]?\s*/i, '').trim();
      if (experience.length > 300) experience = experience.substring(0, 300) + '...';
      break;
    }
  }

  // Extract roll number / student ID
  let rollNumber = '';
  const rollRegex = /(?:Roll\s*(?:No|Number)|Registration\s*No|Student\s*ID|Enrollment\s*No)[\s:\-]*([A-Z0-9\/-]{4,15})/i;
  const rollMatch = fullText.match(rollRegex);
  if (rollMatch) {
    rollNumber = rollMatch[1].trim().toUpperCase();
  }

  return {
    name,
    email,
    phone,
    rollNumber,
    skills: foundSkills,
    collegeName,
    degree,
    department,
    cgpa,
    github,
    linkedin,
    portfolio,
    projects,
    experience,
    graduationYear,
  };
}

/**
 * Main function to parse a resume file and extract candidate data.
 * Supports PDF and DOCX formats.
 */
export async function parseResume(file: File): Promise<ExtractedData> {
  const fileName = file.name.toLowerCase();
  let text: string;

  if (fileName.endsWith('.pdf')) {
    text = await extractTextFromPDF(file);
  } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
    text = await extractTextFromDOCX(file);
  } else {
    throw new Error('Unsupported file format. Please upload a PDF or DOCX file.');
  }

  if (!text || text.trim().length < 10) {
    throw new Error('Could not extract text from the file. The file may be empty or image-based.');
  }

  return parseResumeText(text);
}
