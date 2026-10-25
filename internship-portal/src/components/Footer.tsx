import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-green-900 text-green-100 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-base font-bold text-white mb-1">CampusIntern</h3>
            <p className="text-xs text-green-200">
              On-Campus Internship & Training Cell. Facilitating academic research, laboratory projects, and departmental internships.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-2">Portal Links</h4>
            <ul className="space-y-1 text-xs">
              <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/internships" className="hover:text-white transition-colors">Internships Catalog</Link></li>
              <li><Link to="/apply" className="hover:text-white transition-colors">Apply / Profile</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Login</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-2">Campus Placement Cell</h4>
            <ul className="space-y-1 text-xs text-green-200">
              <li>Training & Placement Office, Administrative Block</li>
              <li>Email: placement-cell@college.edu</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-green-800 mt-4 pt-3 text-center text-xs text-green-300">
          © {new Date().getFullYear()} College Placement & Internship Cell. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
