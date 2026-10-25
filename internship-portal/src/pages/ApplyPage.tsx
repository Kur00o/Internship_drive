import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import type { CandidateProfile, JobMatch, Internship } from '../types';
import { DOMAINS } from '../types';
import { parseResume } from '../utils/resumeParser';
import { getRecommendations, matchCandidateToInternship } from '../utils/jobMatcher';
import { jobsApi, applicationsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

type FormStep = 'form' | 'recommendations' | 'submitted';

const initialProfile: CandidateProfile = {
  name: '',
  email: '',
  phone: '',
  rollNumber: '',
  collegeName: '',
  degree: '',
  department: '',
  academicYear: '',
  graduationYear: '',
  cgpa: '',
  skills: [],
  projects: '',
  experience: '',
  preferredDomain: '',
  availability: '',
  github: '',
  linkedin: '',
  portfolio: '',
  resumeFileName: '',
  resumeFile: null,
};

export default function ApplyPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const internshipId = searchParams.get('internship');

  const [internships, setInternships] = useState<Internship[]>([]);
  const [selectedInternship, setSelectedInternship] = useState<Internship | null>(null);

  const [profile, setProfile] = useState<CandidateProfile>(() => {
    return {
      ...initialProfile,
      name: user?.name || '',
      email: user?.email || '',
      rollNumber: user?.rollNumber || '',
    };
  });

  const [skillInput, setSkillInput] = useState('');
  const [step, setStep] = useState<FormStep>('form');
  const [recommendations, setRecommendations] = useState<JobMatch[]>([]);
  const [targetedMatch, setTargetedMatch] = useState<JobMatch | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resumeStatus, setResumeStatus] = useState<'idle' | 'parsing' | 'done' | 'error'>('idle');
  const [resumeError, setResumeError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load internships from SQL backend and match selected internship
  useEffect(() => {
    jobsApi.getAll().then((list) => {
      setInternships(list);
      if (internshipId) {
        const match = list.find((i) => i.id === internshipId);
        if (match) {
          setSelectedInternship(match);
          setProfile((p) => ({
            ...p,
            preferredDomain: match.domain,
          }));
        }
      }
    });
  }, [internshipId]);

  // Keep user profile in sync with session
  useEffect(() => {
    if (user && user.role === 'student') {
      setProfile((p) => ({
        ...p,
        name: p.name || user.name,
        email: p.email || user.email,
        rollNumber: p.rollNumber || user.rollNumber || '',
      }));
    }
  }, [user]);

  const updateField = useCallback(
    (field: keyof CandidateProfile, value: string) => {
      setProfile((p) => ({ ...p, [field]: value }));
      if (errors[field]) {
        setErrors((e) => {
          const next = { ...e };
          delete next[field];
          return next;
        });
      }
    },
    [errors]
  );

  const addSkill = () => {
    const skill = skillInput.trim();
    if (skill && !profile.skills.includes(skill)) {
      setProfile((p) => ({ ...p, skills: [...p.skills, skill] }));
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setProfile((p) => ({
      ...p,
      skills: p.skills.filter((s) => s !== skill),
    }));
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  // Resume upload and parsing
  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|docx?)$/i)) {
      setResumeError('Please upload a PDF or DOCX file.');
      return;
    }

    setProfile((p) => ({ ...p, resumeFile: file, resumeFileName: file.name }));
    setResumeStatus('parsing');
    setResumeError('');

    try {
      const extracted = await parseResume(file);

      setProfile((p) => ({
        ...p,
        name: extracted.name || p.name,
        email: extracted.email || p.email,
        phone: extracted.phone || p.phone,
        rollNumber: extracted.rollNumber || p.rollNumber,
        collegeName: extracted.collegeName || p.collegeName,
        degree: extracted.degree || p.degree,
        department: extracted.department || p.department,
        cgpa: extracted.cgpa || p.cgpa,
        graduationYear: extracted.graduationYear || p.graduationYear,
        skills: extracted.skills.length > 0 ? [...new Set([...p.skills, ...extracted.skills])] : p.skills,
        projects: extracted.projects || p.projects,
        experience: extracted.experience || p.experience,
        github: extracted.github || p.github,
        linkedin: extracted.linkedin || p.linkedin,
        portfolio: extracted.portfolio || p.portfolio,
      }));

      setResumeStatus('done');
    } catch (err: any) {
      setResumeError(err.message || 'Failed to parse resume. You can fill the form manually.');
      setResumeStatus('error');
    }
  };

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!profile.rollNumber.trim()) newErrors.rollNumber = 'College roll number / student ID is required';
    if (!profile.name.trim()) newErrors.name = 'Full name is required';
    if (!profile.email.trim()) newErrors.email = 'Email address is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email))
      newErrors.email = 'Enter a valid email address';
    if (!profile.phone.trim()) newErrors.phone = 'Phone number is required';
    else if (!/^\+?\d{10,13}$/.test(profile.phone.replace(/[\s-]/g, '')))
      newErrors.phone = 'Enter a valid 10-digit phone number';
    if (!profile.collegeName.trim()) newErrors.collegeName = 'College name is required';
    if (!profile.degree.trim()) newErrors.degree = 'Degree is required';
    if (!profile.department.trim()) newErrors.department = 'Department / branch is required';
    if (!profile.academicYear) newErrors.academicYear = 'Academic year is required';
    if (!profile.graduationYear) newErrors.graduationYear = 'Graduation year is required';
    if (profile.skills.length === 0) newErrors.skills = 'Add at least one technical or professional skill';

    if (profile.github && !/github\.com/i.test(profile.github))
      newErrors.github = 'Enter a valid GitHub URL';
    if (profile.linkedin && !/linkedin\.com/i.test(profile.linkedin))
      newErrors.linkedin = 'Enter a valid LinkedIn URL';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (selectedInternship) {
      setTargetedMatch(matchCandidateToInternship(profile, selectedInternship));
    } else {
      setTargetedMatch(null);
    }

    const matches = getRecommendations(profile, internships);
    setRecommendations(matches);
    setStep('recommendations');
    window.scrollTo(0, 0);
  };

  const handleFinalSubmit = async () => {
    try {
      await applicationsApi.submit(
        profile,
        profile.resumeFile || null,
        selectedInternship?.id,
        selectedInternship?.title
      );
      setStep('submitted');
      window.scrollTo(0, 0);
    } catch (err: any) {
      alert(err.message || 'Failed to submit application to SQL database.');
    }
  };

  // 1. Success confirmation step
  if (step === 'submitted') {
    return (
      <div className="max-w-xl mx-auto py-12">
        <div className="bg-white border border-gray-200 rounded-lg p-6 sm:p-8 text-center shadow-xs">
          <div className="w-12 h-12 bg-green-100 text-green-800 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
            ✓
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h1>
          <p className="text-gray-600 text-xs mb-6">
            {selectedInternship
              ? `Your application for ${selectedInternship.title} in ${selectedInternship.departmentOrCompany} has been submitted to the placement coordinator.`
              : `Your candidate profile has been registered in the college internship database.`}
          </p>

          <div className="bg-[#fdf6ec] border border-gray-200 rounded p-4 text-left mb-6 text-xs text-gray-700 space-y-2">
            <div><span className="font-semibold text-gray-900">Student Roll No:</span> {profile.rollNumber}</div>
            <div><span className="font-semibold text-gray-900">Applicant:</span> {profile.name} ({profile.email})</div>
            <div><span className="font-semibold text-gray-900">Branch:</span> {profile.department} • {profile.degree}</div>
            <div><span className="font-semibold text-gray-900">Skills ({profile.skills.length}):</span> {profile.skills.join(', ')}</div>
            {targetedMatch && (
              <div>
                <span className="font-semibold text-gray-900">Target Role Match:</span>{' '}
                <span className="text-green-800 font-bold">{targetedMatch.matchPercentage}%</span> ({targetedMatch.internship.title})
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link
              to="/internships"
              className="px-5 py-2.5 bg-green-800 text-white text-xs font-medium rounded hover:bg-green-900 transition-colors"
            >
              Browse Internships
            </Link>
            <button
              onClick={() => {
                setProfile({
                  ...initialProfile,
                  name: user?.name || '',
                  email: user?.email || '',
                  rollNumber: user?.rollNumber || '',
                });
                setStep('form');
                setRecommendations([]);
                setTargetedMatch(null);
                setResumeStatus('idle');
              }}
              className="px-5 py-2.5 border border-green-800 text-green-800 text-xs font-medium rounded hover:bg-green-50 transition-colors"
            >
              Apply Again / New Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Recommendations & Matching Step
  if (step === 'recommendations') {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Matching Opportunities for You</h1>
        <p className="text-xs text-gray-600 mb-6">
          Based on your verified skills, branch, and coursework, here are the opportunities evaluated against your profile.
        </p>

        {targetedMatch && (
          <div className="mb-6 bg-white border-2 border-green-800 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 bg-green-800 text-white font-semibold rounded">
                Target Role
              </span>
              <span className="text-xs text-gray-500">The specific role you applied for</span>
            </div>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{targetedMatch.internship.title}</h3>
                <p className="text-xs text-green-800 font-medium">{targetedMatch.internship.departmentOrCompany}</p>
              </div>
              <div className="text-right">
                <span
                  className={`text-lg font-bold ${
                    targetedMatch.matchPercentage >= 70
                      ? 'text-green-700'
                      : targetedMatch.matchPercentage >= 40
                        ? 'text-yellow-600'
                        : 'text-gray-500'
                  }`}
                >
                  {targetedMatch.matchPercentage}% Match
                </span>
              </div>
            </div>

            <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
              <div
                className={`h-2 rounded-full ${
                  targetedMatch.matchPercentage >= 70
                    ? 'bg-green-600'
                    : targetedMatch.matchPercentage >= 40
                      ? 'bg-yellow-500'
                      : 'bg-gray-400'
                }`}
                style={{ width: `${targetedMatch.matchPercentage}%` }}
              />
            </div>

            <p className="text-xs text-gray-600 mb-3">{targetedMatch.internship.description}</p>

            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-700 mb-1">Why this matches your profile:</p>
              <ul className="space-y-1">
                {targetedMatch.reasons.map((reason, idx) => (
                  <li key={idx} className="text-xs text-gray-600 flex items-start gap-1">
                    <span className="text-green-700 mt-0.5">•</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
              <span>Stipend: {targetedMatch.internship.stipend}</span>
              <span>•</span>
              <span>Duration: {targetedMatch.internship.duration}</span>
              <span>•</span>
              <span>Mode: {targetedMatch.internship.workMode}</span>
            </div>
          </div>
        )}

        {targetedMatch && (
          <h2 className="text-base font-semibold text-gray-900 mb-3">Other On-Campus Matches</h2>
        )}

        {recommendations.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500 mb-6">
            <p className="text-sm font-medium mb-1">No other active internships posted yet.</p>
            <p className="text-xs">Your profile has been validated and you can proceed to submit.</p>
          </div>
        ) : (
          <div className="space-y-4 mb-8">
            {recommendations
              .filter((m) => m.internship.id !== selectedInternship?.id)
              .map((match) => (
                <div
                  key={match.internship.id}
                  className="bg-white border border-gray-200 rounded-lg p-5"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">
                        {match.internship.title}
                      </h3>
                      <p className="text-xs text-green-800 font-medium">
                        {match.internship.departmentOrCompany} • {match.internship.domain}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-base font-bold ${
                          match.matchPercentage >= 70
                            ? 'text-green-700'
                            : match.matchPercentage >= 40
                              ? 'text-yellow-600'
                              : 'text-gray-500'
                        }`}
                      >
                        {match.matchPercentage}% Match
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                    <div
                      className={`h-2 rounded-full ${
                        match.matchPercentage >= 70
                          ? 'bg-green-600'
                          : match.matchPercentage >= 40
                            ? 'bg-yellow-500'
                            : 'bg-gray-400'
                      }`}
                      style={{ width: `${match.matchPercentage}%` }}
                    />
                  </div>

                  <p className="text-xs text-gray-600 mb-3">{match.internship.description}</p>

                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Match Analysis:</p>
                    <ul className="space-y-1">
                      {match.reasons.map((reason, idx) => (
                        <li key={idx} className="text-xs text-gray-600 flex items-start gap-1">
                          <span className="text-green-700 mt-0.5">•</span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    <span>{match.internship.stipend}</span>
                    <span>•</span>
                    <span>{match.internship.duration}</span>
                    <span>•</span>
                    <span>{match.internship.workMode}</span>
                  </div>
                </div>
              ))}
          </div>
        )}

        <div className="flex justify-center gap-3 pb-8">
          <button
            onClick={() => setStep('form')}
            className="px-5 py-2 border border-gray-300 text-gray-700 text-xs rounded hover:bg-gray-50 transition-colors"
          >
            ← Edit Profile Details
          </button>
          <button
            onClick={handleFinalSubmit}
            className="px-5 py-2 bg-green-800 text-white text-xs font-medium rounded hover:bg-green-900 transition-colors"
          >
            Confirm & Submit Application
          </button>
        </div>
      </div>
    );
  }

  // 3. Application Profile Form
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Internship Application Form</h1>
      {selectedInternship ? (
        <p className="text-xs text-gray-600 mb-6">
          Applying for <span className="font-semibold text-green-800">{selectedInternship.title}</span> (
          {selectedInternship.departmentOrCompany})
        </p>
      ) : (
        <p className="text-xs text-gray-600 mb-6">
          Complete your student profile to match with campus research, technical, and departmental openings.
        </p>
      )}

      {/* Resume upload */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Upload Resume (Optional)</h2>
        <p className="text-xs text-gray-600 mb-3">
          Upload your resume in PDF or DOCX format to automatically extract your details, or fill out the form manually.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleResumeUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 border border-green-800 text-green-800 text-xs font-medium rounded hover:bg-green-50 transition-colors"
          >
            {profile.resumeFile ? 'Change Resume File' : 'Upload Resume (PDF/DOCX)'}
          </button>
          {profile.resumeFile && (
            <span className="text-xs text-gray-700 font-medium">📄 {profile.resumeFile.name}</span>
          )}
        </div>

        {resumeStatus === 'parsing' && (
          <p className="text-xs text-blue-600 mt-2">Extracting information from your resume...</p>
        )}
        {resumeStatus === 'done' && (
          <p className="text-xs text-green-700 mt-2">
            ✓ Resume parsed successfully. Please review and edit the extracted details below.
          </p>
        )}
        {resumeStatus === 'error' && (
          <p className="text-xs text-red-600 mt-2">{resumeError}</p>
        )}
      </div>

      {/* Application form */}
      <form onSubmit={handleSubmit} noValidate>
        {/* Academic & Personal Identity */}
        <fieldset className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
          <legend className="text-base font-semibold text-gray-900 px-1">Student Information</legend>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <FormField
              label="College Roll Number / Student ID"
              required
              error={errors.rollNumber}
              value={profile.rollNumber}
              onChange={(v) => updateField('rollNumber', v)}
              placeholder="e.g. 23CS0104"
            />
            <FormField
              label="Full Name"
              required
              error={errors.name}
              value={profile.name}
              onChange={(v) => updateField('name', v)}
              placeholder="Official full name"
            />
            <FormField
              label="Email"
              required
              type="email"
              error={errors.email}
              value={profile.email}
              onChange={(v) => updateField('email', v)}
              placeholder="student@college.edu"
            />
            <FormField
              label="Phone Number"
              required
              type="tel"
              error={errors.phone}
              value={profile.phone}
              onChange={(v) => updateField('phone', v)}
              placeholder="+91 9876543210"
            />
          </div>
        </fieldset>

        {/* Education Details */}
        <fieldset className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
          <legend className="text-base font-semibold text-gray-900 px-1">College & Academic Details</legend>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <FormField
              label="College / Institute"
              required
              error={errors.collegeName}
              value={profile.collegeName}
              onChange={(v) => updateField('collegeName', v)}
              placeholder="e.g. University College of Engineering"
            />
            <FormField
              label="Degree Program"
              required
              error={errors.degree}
              value={profile.degree}
              onChange={(v) => updateField('degree', v)}
              placeholder="e.g. B.Tech / BE / BCA / MCA"
            />
            <FormField
              label="Department / Branch"
              required
              error={errors.department}
              value={profile.department}
              onChange={(v) => updateField('department', v)}
              placeholder="e.g. Computer Science & Engineering"
            />
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Academic Year <span className="text-red-500">*</span>
              </label>
              <select
                value={profile.academicYear}
                onChange={(e) => updateField('academicYear', e.target.value)}
                className={`w-full px-3 py-2 border rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-green-800 focus:border-green-800 ${
                  errors.academicYear ? 'border-red-400' : 'border-gray-300'
                }`}
              >
                <option value="">Select current year</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
                <option value="Postgraduate">Postgraduate</option>
              </select>
              {errors.academicYear && (
                <p className="text-xs text-red-500 mt-1">{errors.academicYear}</p>
              )}
            </div>
            <FormField
              label="Graduation Year"
              required
              error={errors.graduationYear}
              value={profile.graduationYear}
              onChange={(v) => updateField('graduationYear', v)}
              placeholder="e.g. 2027"
            />
            <FormField
              label="Current CGPA / Percentage"
              error={errors.cgpa}
              value={profile.cgpa}
              onChange={(v) => updateField('cgpa', v)}
              placeholder="e.g. 8.5"
            />
          </div>
        </fieldset>

        {/* Skills & Coursework */}
        <fieldset className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
          <legend className="text-base font-semibold text-gray-900 px-1">Skills & Coursework</legend>

          <div className="mt-3">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Technical & Professional Skills <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleSkillKeyDown}
                placeholder="Type a skill and press Enter"
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-800 focus:border-green-800"
              />
              <button
                type="button"
                onClick={addSkill}
                className="px-3 py-2 bg-green-800 text-white text-xs rounded hover:bg-green-900 transition-colors"
              >
                Add
              </button>
            </div>
            {profile.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="text-xs px-2 py-0.5 bg-green-50 text-green-800 rounded flex items-center gap-1 font-medium"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="text-green-600 hover:text-red-500 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            {errors.skills && <p className="text-xs text-red-500">{errors.skills}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 mt-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Academic & Personal Projects</label>
              <textarea
                value={profile.projects}
                onChange={(e) => updateField('projects', e.target.value)}
                rows={3}
                placeholder="Mention semester projects, lab assignments, or hackathon prototypes..."
                className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-800 focus:border-green-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Prior Experience / Campus Roles</label>
              <textarea
                value={profile.experience}
                onChange={(e) => updateField('experience', e.target.value)}
                rows={2}
                placeholder="Technical club coordinator, volunteer, past internship..."
                className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-800 focus:border-green-800"
              />
            </div>
          </div>
        </fieldset>

        {/* Preferences */}
        <fieldset className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
          <legend className="text-base font-semibold text-gray-900 px-1">Internship Preferences</legend>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Preferred Technical Domain
              </label>
              <select
                value={profile.preferredDomain}
                onChange={(e) => updateField('preferredDomain', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-green-800 focus:border-green-800"
              >
                <option value="">Select domain</option>
                {DOMAINS.map((domain) => (
                  <option key={domain} value={domain}>
                    {domain}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Availability</label>
              <select
                value={profile.availability}
                onChange={(e) => updateField('availability', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-green-800 focus:border-green-800"
              >
                <option value="">Select availability</option>
                <option value="Immediate">Immediate</option>
                <option value="Part-time during semester">Part-time during semester</option>
                <option value="Upcoming semester break">Upcoming semester break</option>
                <option value="Summer vacation">Summer vacation</option>
              </select>
            </div>
          </div>
        </fieldset>

        {/* Links */}
        <fieldset className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <legend className="text-base font-semibold text-gray-900 px-1">Online Profiles (Optional)</legend>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
            <FormField
              label="GitHub"
              error={errors.github}
              value={profile.github}
              onChange={(v) => updateField('github', v)}
              placeholder="https://github.com/username"
            />
            <FormField
              label="LinkedIn"
              error={errors.linkedin}
              value={profile.linkedin}
              onChange={(v) => updateField('linkedin', v)}
              placeholder="https://linkedin.com/in/username"
            />
            <FormField
              label="Portfolio / Projects Link"
              value={profile.portfolio}
              onChange={(v) => updateField('portfolio', v)}
              placeholder="https://yourportfolio.site"
            />
          </div>
        </fieldset>

        <div className="flex justify-end pb-8">
          <button
            type="submit"
            className="px-6 py-2.5 bg-green-800 text-white text-xs font-medium rounded hover:bg-green-900 transition-colors"
          >
            Review & Find Matching Roles →
          </button>
        </div>
      </form>
    </div>
  );
}

// Reusable form field component
function FormField({
  label,
  required,
  type = 'text',
  error,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  required?: boolean;
  type?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-800 focus:border-green-800 ${
          error ? 'border-red-400' : 'border-gray-300'
        }`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
