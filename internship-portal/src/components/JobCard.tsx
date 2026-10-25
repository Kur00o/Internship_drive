import { Link } from 'react-router-dom';
import type { Internship } from '../types';

interface Props {
  internship: Internship;
  showAdminActions?: boolean;
  onDelete?: (id: string) => void;
}

export default function JobCard({ internship, showAdminActions, onDelete }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{internship.title}</h3>
            <p className="text-sm text-green-800 font-medium">{internship.departmentOrCompany}</p>
          </div>
          <span className="text-xs px-2 py-1 bg-green-50 text-green-800 rounded font-medium whitespace-nowrap">
            {internship.workMode}
          </span>
        </div>

        <p className="text-sm text-gray-600 mb-3">{internship.description}</p>

        {internship.skills && internship.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {internship.skills.map((skill) => (
              <span
                key={skill}
                className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded"
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
          <div>
            <span className="font-medium text-gray-700">Stipend:</span> {internship.stipend}
          </div>
          <div>
            <span className="font-medium text-gray-700">Duration:</span> {internship.duration}
          </div>
          <div>
            <span className="font-medium text-gray-700">Domain:</span> {internship.domain}
          </div>
          <div>
            <span className="font-medium text-gray-700">Posted:</span> {internship.postedDate}
          </div>
        </div>

        <p className="text-xs text-gray-500">
          <span className="font-medium">Eligibility:</span> {internship.eligibility}
        </p>
      </div>

      <div className="mt-4 pt-2 flex gap-2">
        {showAdminActions ? (
          <button
            onClick={() => onDelete?.(internship.id)}
            className="w-full text-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors"
          >
            Remove Job
          </button>
        ) : (
          <Link
            to={`/apply?internship=${internship.id}`}
            className="w-full text-center px-4 py-2 bg-green-800 text-white text-sm font-medium rounded hover:bg-green-900 transition-colors"
          >
            Apply Now
          </Link>
        )}
      </div>
    </div>
  );
}
