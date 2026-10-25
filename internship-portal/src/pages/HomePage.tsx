import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import JobCard from '../components/JobCard';
import SearchFilters from '../components/SearchFilters';
import { jobsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Internship } from '../types';

export default function HomePage() {
  const { user } = useAuth();
  const [internships, setInternships] = useState<Internship[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [selectedWorkMode, setSelectedWorkMode] = useState('');

  useEffect(() => {
    jobsApi.getAll().then(setInternships);
  }, []);

  const filteredInternships = useMemo(() => {
    return internships.filter((internship) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchable = [
          internship.title,
          internship.departmentOrCompany,
          internship.description,
          internship.domain,
          ...(internship.skills || []),
        ]
          .join(' ')
          .toLowerCase();
        if (!searchable.includes(query)) return false;
      }

      // Domain filter
      if (selectedDomain && internship.domain !== selectedDomain) return false;

      // Work mode filter
      if (selectedWorkMode && internship.workMode !== selectedWorkMode) return false;

      return true;
    });
  }, [internships, searchQuery, selectedDomain, selectedWorkMode]);

  return (
    <div>
      {/* Hero section */}
      <section className="py-10 md:py-14 text-center">
        <div className="inline-block px-3 py-1 bg-green-50 text-green-800 text-xs font-semibold rounded-full mb-3">
          Campus Recruitment & Internship Cell
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          On-Campus Internship Opportunities
        </h1>
        <p className="text-base text-gray-600 max-w-2xl mx-auto mb-6">
          Explore research assistantships, lab projects, and departmental internships directly within the college.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            to="/internships"
            className="px-5 py-2.5 bg-green-800 text-white font-medium text-sm rounded hover:bg-green-900 transition-colors"
          >
            Browse Internships ({internships.length})
          </Link>
          <Link
            to="/apply"
            className="px-5 py-2.5 border border-green-800 text-green-800 font-medium text-sm rounded hover:bg-green-50 transition-colors"
          >
            Submit Application / Profile
          </Link>
        </div>
      </section>

      {/* Stats - purely within-college, zero cities */}
      <section className="max-w-3xl mx-auto mb-10">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-2xl font-bold text-green-800">{internships.length}</p>
            <p className="text-xs text-gray-600">Active Openings</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-2xl font-bold text-green-800">
              {new Set(internships.map((j) => j.domain)).size}
            </p>
            <p className="text-xs text-gray-600">Domains</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-2xl font-bold text-green-800">
              {new Set(internships.map((j) => j.departmentOrCompany)).size}
            </p>
            <p className="text-xs text-gray-600">Departments & Labs</p>
          </div>
        </div>
      </section>

      {/* Featured internships */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Available Internships</h2>
          {internships.length > 0 && (
            <Link to="/internships" className="text-xs text-green-800 font-medium hover:underline">
              View all ({internships.length}) →
            </Link>
          )}
        </div>

        {internships.length > 0 && (
          <SearchFilters
            searchQuery={searchQuery}
            selectedDomain={selectedDomain}
            selectedWorkMode={selectedWorkMode}
            onSearchChange={setSearchQuery}
            onDomainChange={setSelectedDomain}
            onWorkModeChange={setSelectedWorkMode}
          />
        )}

        {internships.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-gray-600">
            <div className="w-10 h-10 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-3 text-lg font-bold">
              ∅
            </div>
            <p className="text-base font-semibold text-gray-800 mb-1">No internships currently listed</p>
            <p className="text-xs text-gray-500 max-w-md mx-auto mb-4">
              There are currently no active internship postings. The college administration or department coordinator will publish new roles here.
            </p>
            {user?.role === 'admin' ? (
              <Link
                to="/admin"
                className="inline-block px-4 py-2 bg-green-800 text-white text-xs font-medium rounded hover:bg-green-900"
              >
                Go to Admin Panel to Post Jobs
              </Link>
            ) : (
              <p className="text-xs text-green-800 font-medium">
                Check back periodically or contact your department placement coordinator.
              </p>
            )}
          </div>
        ) : filteredInternships.length === 0 ? (
          <div className="text-center py-10 text-gray-500 bg-white border border-gray-200 rounded-lg">
            <p className="text-sm font-medium mb-1">No internships match your filter</p>
            <p className="text-xs">Try clearing or adjusting your search criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInternships.slice(0, 6).map((internship) => (
              <JobCard key={internship.id} internship={internship} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
