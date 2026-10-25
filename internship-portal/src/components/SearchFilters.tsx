import { DOMAINS, WORK_MODES } from '../types';

interface Props {
  searchQuery: string;
  selectedDomain: string;
  selectedWorkMode: string;
  onSearchChange: (query: string) => void;
  onDomainChange: (domain: string) => void;
  onWorkModeChange: (mode: string) => void;
}

export default function SearchFilters({
  searchQuery,
  selectedDomain,
  selectedWorkMode,
  onSearchChange,
  onDomainChange,
  onWorkModeChange,
}: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            id="search"
            type="text"
            placeholder="Search by role, department, skill..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-800 focus:border-green-800"
          />
        </div>

        {/* Domain filter */}
        <div>
          <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-1">
            Domain
          </label>
          <select
            id="domain"
            value={selectedDomain}
            onChange={(e) => onDomainChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-800 focus:border-green-800 bg-white"
          >
            <option value="">All Domains</option>
            {DOMAINS.map((domain) => (
              <option key={domain} value={domain}>
                {domain}
              </option>
            ))}
          </select>
        </div>

        {/* Work mode filter */}
        <div>
          <label htmlFor="workMode" className="block text-sm font-medium text-gray-700 mb-1">
            Work Mode
          </label>
          <select
            id="workMode"
            value={selectedWorkMode}
            onChange={(e) => onWorkModeChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-800 focus:border-green-800 bg-white"
          >
            <option value="">All Modes</option>
            {WORK_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active filters */}
      {(searchQuery || selectedDomain || selectedWorkMode) && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Active filters:</span>
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="text-xs px-2 py-1 bg-green-50 text-green-800 rounded flex items-center gap-1 hover:bg-green-100"
            >
              \"{searchQuery}\" ×
            </button>
          )}
          {selectedDomain && (
            <button
              onClick={() => onDomainChange('')}
              className="text-xs px-2 py-1 bg-green-50 text-green-800 rounded flex items-center gap-1 hover:bg-green-100"
            >
              {selectedDomain} ×
            </button>
          )}
          {selectedWorkMode && (
            <button
              onClick={() => onWorkModeChange('')}
              className="text-xs px-2 py-1 bg-green-50 text-green-800 rounded flex items-center gap-1 hover:bg-green-100"
            >
              {selectedWorkMode} ×
            </button>
          )}
        </div>
      )}
    </div>
  );
}
