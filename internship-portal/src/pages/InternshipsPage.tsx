import { useState, useMemo, useEffect } from 'react';
import JobCard from '../components/JobCard';
import SearchFilters from '../components/SearchFilters';
import { jobsApi } from '../services/api';
import type { Internship } from '../types';

export default function InternshipsPage() {
  const [internships, setInternships] = useState<Internship[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [selectedWorkMode, setSelectedWorkMode] = useState('');

  useEffect(() => {
    jobsApi.getAll().then(setInternships);
  }, []);

  const filteredInternships = useMemo(() => {
    return internships.filter((internship) => {
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

      if (selectedDomain && internship.domain !== selectedDomain) return false;
      if (selectedWorkMode && internship.workMode !== selectedWorkMode) return false;

      return true;
    });
  }, [internships, searchQuery, selectedDomain, selectedWorkMode]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Campus Internships Catalog</h1>
        <p className="text-xs text-gray-600">
          {filteredInternships.length} opening{filteredInternships.length !== 1 ? 's' : ''} currently listed
        </p>
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
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-500">
          <p className="text-base font-semibold text-gray-800 mb-1">No internships available</p>
          <p className="text-xs">
            The placement cell has not listed any internships yet. Please check back later.
          </p>
        </div>
      ) : filteredInternships.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-gray-500">
          <p className="text-sm font-semibold mb-1">No matching internships found</p>
          <p className="text-xs">Try selecting a different domain or clearing your search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInternships.map((internship) => (
            <JobCard key={internship.id} internship={internship} />
          ))}
        </div>
      )}
    </div>
  );
}
