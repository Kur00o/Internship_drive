import type { CandidateProfile, Internship, JobMatch } from '../types';

/**
 * Calculate match percentage between a candidate profile and an internship.
 * Designed specifically for college students matching with on-campus internships:
 * - Skills overlap (45%)
 * - Domain preference & alignment (25%)
 * - Department, degree & eligibility match (15%)
 * - Relevant projects and practical coursework (15%)
 */
export function matchCandidateToInternship(
  candidate: CandidateProfile,
  internship: Internship
): JobMatch {
  const reasons: string[] = [];
  let score = 0;
  let maxScore = 0;

  // --- 1. Skills matching (weight: 45) ---
  maxScore += 45;
  const candidateSkills = (candidate.skills || []).map((s) => s.toLowerCase().trim());
  const requiredSkills = (internship.skills || []).map((s) => s.toLowerCase().trim());

  const matchedSkills: string[] = [];
  for (const rs of requiredSkills) {
    if (
      candidateSkills.some(
        (cs) => cs === rs || cs.includes(rs) || rs.includes(cs)
      )
    ) {
      matchedSkills.push(rs);
    }
  }

  if (requiredSkills.length > 0) {
    const skillScore = (matchedSkills.length / requiredSkills.length) * 45;
    score += skillScore;
    if (matchedSkills.length > 0) {
      reasons.push(
        `Possesses ${matchedSkills.length} of ${requiredSkills.length} required skills: ${matchedSkills.join(', ')}`
      );
    }
  } else {
    // If no specific skills required, give partial baseline
    score += 35;
    reasons.push('Open to students eager to learn on the job');
  }

  // --- 2. Domain preference (weight: 25) ---
  maxScore += 25;
  if (candidate.preferredDomain) {
    const prefDom = candidate.preferredDomain.toLowerCase();
    const jobDom = internship.domain.toLowerCase();

    if (prefDom === jobDom) {
      score += 25;
      reasons.push(`Directly matches your interest in ${internship.domain}`);
    } else if (
      prefDom.split(' ').some((word) => word.length > 2 && jobDom.includes(word))
    ) {
      score += 15;
      reasons.push(`Related to your preferred focus area: ${candidate.preferredDomain}`);
    }
  } else {
    score += 15;
  }

  // --- 3. Department, degree & eligibility match (weight: 15) ---
  maxScore += 15;
  const eligLower = (internship.eligibility || '').toLowerCase();
  const degreeLower = (candidate.degree || '').toLowerCase();
  const deptLower = (candidate.department || '').toLowerCase();

  const isTechCandidate =
    ['b.tech', 'be', 'bca', 'mca', 'm.tech', 'b.sc', 'm.sc'].some((d) =>
      degreeLower.includes(d)
    ) ||
    deptLower.includes('computer') ||
    deptLower.includes('information') ||
    deptLower.includes('electronics') ||
    deptLower.includes('data');

  if (deptLower && eligLower.includes(deptLower.split(' ')[0])) {
    score += 15;
    reasons.push(`Targeted specifically for ${candidate.department} students`);
  } else if (isTechCandidate) {
    score += 12;
    reasons.push('Relevant engineering / computer applications background');
  } else if (eligLower.includes('any') || eligLower.includes('all')) {
    score += 12;
    reasons.push('Open to all academic departments and branches');
  } else {
    score += 8;
  }

  // --- 4. Projects / coursework relevance (weight: 15) ---
  maxScore += 15;
  const projectsLower = (candidate.projects || '').toLowerCase();
  const experienceLower = (candidate.experience || '').toLowerCase();
  const combinedText = `${projectsLower} ${experienceLower}`;

  const domainKeywords: Record<string, string[]> = {
    'Web Development': ['web', 'react', 'node', 'frontend', 'backend', 'full stack', 'html', 'css', 'api', 'javascript', 'typescript'],
    'Mobile Development': ['mobile', 'android', 'ios', 'flutter', 'react native', 'app', 'kotlin'],
    'Data Science': ['data', 'analysis', 'pandas', 'numpy', 'sql', 'statistics', 'python', 'analytics'],
    'Machine Learning & AI': ['ml', 'machine learning', 'ai', 'deep learning', 'neural', 'pytorch', 'tensorflow', 'nlp', 'model'],
    'UI/UX Design': ['figma', 'design', 'ui', 'ux', 'wireframe', 'prototype', 'interface', 'user'],
    'Cloud & DevOps': ['cloud', 'aws', 'docker', 'kubernetes', 'linux', 'ci/cd', 'devops', 'server'],
    'Cybersecurity': ['security', 'network', 'vulnerability', 'linux', 'penetration', 'crypto', 'firewall'],
    'Internet of Things (IoT)': ['iot', 'arduino', 'raspberry', 'sensors', 'embedded', 'hardware'],
    'Embedded Systems': ['embedded', 'c', 'c++', 'microcontroller', 'firmware', 'vlsi'],
    'Robotics': ['robot', 'ros', 'automation', 'control', 'arduino', 'sensors', 'motor'],
    'Research & Lab Assistant': ['research', 'paper', 'experiment', 'analysis', 'publication', 'lab', 'project'],
    'Database Management': ['database', 'sql', 'mysql', 'postgresql', 'mongodb', 'queries', 'schema'],
    'Campus Technical Lead': ['lead', 'club', 'hackathon', 'event', 'organizer', 'team', 'project', 'mentor'],
  };

  const keywords = domainKeywords[internship.domain] || ['project', 'development', 'system'];
  const matchedKeywords = keywords.filter((kw) => combinedText.includes(kw));

  if (matchedKeywords.length >= 3) {
    score += 15;
    reasons.push('Strong project portfolio directly applicable to this internship');
  } else if (matchedKeywords.length >= 1) {
    score += 10;
    reasons.push('Relevant coursework and project background');
  } else {
    score += 5;
  }

  const matchPercentage = Math.min(100, Math.round((score / maxScore) * 100));

  if (reasons.length === 0) {
    reasons.push('Great opportunity to gain practical on-campus experience');
  }

  return {
    internship,
    matchPercentage,
    reasons,
  };
}

/**
 * Get ranked on-campus job recommendations for a candidate.
 */
export function getRecommendations(
  candidate: CandidateProfile,
  internships: Internship[],
  minMatchPercent: number = 10
): JobMatch[] {
  return internships
    .map((internship) => matchCandidateToInternship(candidate, internship))
    .filter((match) => match.matchPercentage >= minMatchPercent)
    .sort((a, b) => b.matchPercentage - a.matchPercentage);
}
