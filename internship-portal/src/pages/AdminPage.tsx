import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DOMAINS, WORK_MODES, type Internship, type SubmittedApplication } from '../types';
import { jobsApi, applicationsApi } from '../services/api';

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [internships, setInternships] = useState<Internship[]>([]);
  const [applications, setApplications] = useState<SubmittedApplication[]>([]);
  const [activeTab, setActiveTab] = useState<'jobs' | 'add' | 'applications'>('jobs');

  // Form state for adding new job
  const [title, setTitle] = useState('');
  const [departmentOrCompany, setDepartmentOrCompany] = useState('');
  const [domain, setDomain] = useState<string>(DOMAINS[0]);
  const [workMode, setWorkMode] = useState<Internship['workMode']>('On-Campus');
  const [duration, setDuration] = useState('3 months');
  const [stipend, setStipend] = useState('₹10,000/month');
  const [eligibility, setEligibility] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return;
    }
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    try {
      const [jobsList, appsList] = await Promise.all([
        jobsApi.getAll(),
        applicationsApi.getAll(),
      ]);
      setInternships(jobsList);
      setApplications(appsList);
    } catch (err) {
      console.error('Failed to load SQL data:', err);
    }
  };

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!title.trim()) {
      setFormError('Internship Title is required.');
      return;
    }
    if (!departmentOrCompany.trim()) {
      setFormError('College Department / Lab / Organization is required.');
      return;
    }
    if (!description.trim()) {
      setFormError('Job Description is required.');
      return;
    }
    if (!eligibility.trim()) {
      setFormError('Eligibility criteria is required.');
      return;
    }

    const parsedSkills = skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      await jobsApi.create({
        title: title.trim(),
        departmentOrCompany: departmentOrCompany.trim(),
        domain,
        workMode,
        duration: duration.trim(),
        stipend: stipend.trim(),
        eligibility: eligibility.trim(),
        description: description.trim(),
        skills: parsedSkills.length > 0 ? parsedSkills : ['General Problem Solving'],
      });

      // Reset form
      setTitle('');
      setDepartmentOrCompany('');
      setEligibility('');
      setSkillsInput('');
      setDescription('');
      setFormSuccess('Internship posted and saved to SQL database successfully!');
      await loadData();
      setTimeout(() => {
        setActiveTab('jobs');
        setFormSuccess('');
      }, 1200);
    } catch (err: any) {
      setFormError(err.message || 'Failed to post internship.');
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (window.confirm('Are you sure you want to remove this internship opportunity?')) {
      await jobsApi.delete(id);
      await loadData();
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-200 mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Placement & Internship Cell Admin</h1>
          <p className="text-xs text-gray-600 mt-1">
            Manage campus internship listings and review student applications.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              activeTab === 'jobs'
                ? 'bg-green-800 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Manage Jobs ({internships.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              activeTab === 'add'
                ? 'bg-green-800 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            + Post New Internship
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              activeTab === 'applications'
                ? 'bg-green-800 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Applications ({applications.length})
          </button>
        </div>
      </div>

      {/* Tab: Post New Internship */}
      {activeTab === 'add' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-2xl mx-auto">
          <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
            Post On-Campus Internship Opportunity
          </h2>

          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded">
              {formSuccess}
            </div>
          )}

          <form onSubmit={handleAddJob} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Internship Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Lab Research Assistant - AI"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-800 focus:border-green-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Department / Lab / Organization <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={departmentOrCompany}
                  onChange={(e) => setDepartmentOrCompany(e.target.value)}
                  placeholder="e.g. Dept of Computer Science & Engg"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-800 focus:border-green-800"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Domain</label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-800 focus:border-green-800"
                >
                  {DOMAINS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Work Mode</label>
                <select
                  value={workMode}
                  onChange={(e) => setWorkMode(e.target.value as Internship['workMode'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-800 focus:border-green-800"
                >
                  {WORK_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Duration</label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 2 months / Semester-long"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-800 focus:border-green-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Stipend</label>
                <input
                  type="text"
                  value={stipend}
                  onChange={(e) => setStipend(e.target.value)}
                  placeholder="e.g. ₹8,000/month or Academic Credit"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-800 focus:border-green-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Eligibility Criteria <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={eligibility}
                onChange={(e) => setEligibility(e.target.value)}
                placeholder="e.g. 3rd year B.Tech CSE/IT with CGPA >= 7.5"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-800 focus:border-green-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Required Skills (Comma separated)
              </label>
              <input
                type="text"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                placeholder="e.g. Python, PyTorch, Linux, Git"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-800 focus:border-green-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Job Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Briefly describe the internship tasks, expected deliverables, and learning outcomes..."
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-800 focus:border-green-800"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('jobs')}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-green-800 text-white text-sm font-medium rounded hover:bg-green-900 transition-colors"
              >
                Publish Internship
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: Active Internships List */}
      {activeTab === 'jobs' && (
        <div>
          {internships.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
              <p className="text-base font-medium text-gray-800 mb-1">No internships posted yet.</p>
              <p className="text-xs text-gray-500 mb-4">
                As the administrator, you can add college internship openings using the button below.
              </p>
              <button
                onClick={() => setActiveTab('add')}
                className="px-4 py-2 bg-green-800 text-white text-xs font-medium rounded hover:bg-green-900 transition-colors"
              >
                + Post First Internship
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {internships.map((job) => (
                <div
                  key={job.id}
                  className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-gray-900">{job.title}</h3>
                      <span className="text-xs px-2 py-0.5 bg-green-50 text-green-800 rounded font-medium">
                        {job.workMode}
                      </span>
                    </div>
                    <p className="text-xs text-green-800 font-medium">
                      {job.departmentOrCompany} • {job.domain}
                    </p>
                    <p className="text-xs text-gray-600 line-clamp-2">{job.description}</p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {job.skills.map((skill) => (
                        <span key={skill} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">
                          {skill}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-gray-500 pt-1">
                      <span>Stipend: {job.stipend}</span> • <span>Duration: {job.duration}</span> •{' '}
                      <span>Posted: {job.postedDate}</span>
                    </div>
                  </div>

                  <div className="flex md:flex-col gap-2 shrink-0">
                    <button
                      onClick={() => handleDeleteJob(job.id)}
                      className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded hover:bg-red-100 transition-colors"
                    >
                      Delete Job
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Submitted Applications */}
      {activeTab === 'applications' && (
        <div>
          {applications.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-500">
              <p className="text-sm font-medium">No student applications received yet.</p>
              <p className="text-xs mt-1">Applications submitted by college students will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <div key={app.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">
                        {app.candidate.name} ({app.candidate.rollNumber})
                      </h3>
                      <p className="text-xs text-green-800 font-medium">
                        Applied for: {app.internshipTitle || 'General Profile Application'}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 mt-1 sm:mt-0">
                      Applied: {app.appliedDate}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-600 mb-2 bg-gray-50 p-2.5 rounded">
                    <div><span className="font-medium text-gray-700">Email:</span> {app.candidate.email}</div>
                    <div><span className="font-medium text-gray-700">Phone:</span> {app.candidate.phone}</div>
                    <div><span className="font-medium text-gray-700">Dept:</span> {app.candidate.department}</div>
                    <div><span className="font-medium text-gray-700">CGPA:</span> {app.candidate.cgpa || 'N/A'}</div>
                  </div>

                  <div className="text-xs text-gray-600 mb-2">
                    <span className="font-semibold text-gray-700">Skills: </span>
                    {app.candidate.skills.join(', ')}
                  </div>

                  {app.candidate.projects && (
                    <div className="text-xs text-gray-600 mb-1">
                      <span className="font-semibold text-gray-700">Projects: </span>
                      {app.candidate.projects}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-xs text-green-800 pt-1">
                    {app.candidate.resumeFileUrl && (
                      <a
                        href={app.candidate.resumeFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-green-900 bg-green-50 px-2 py-0.5 rounded border border-green-200 hover:bg-green-100 flex items-center gap-1"
                      >
                        📄 View Uploaded Resume ({app.candidate.resumeFileName || 'PDF/DOCX'})
                      </a>
                    )}
                    {app.candidate.github && (
                      <a href={app.candidate.github} target="_blank" rel="noreferrer" className="underline">
                        GitHub
                      </a>
                    )}
                    {app.candidate.linkedin && (
                      <a href={app.candidate.linkedin} target="_blank" rel="noreferrer" className="underline">
                        LinkedIn
                      </a>
                    )}
                    {app.candidate.portfolio && (
                      <a href={app.candidate.portfolio} target="_blank" rel="noreferrer" className="underline">
                        Portfolio
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
