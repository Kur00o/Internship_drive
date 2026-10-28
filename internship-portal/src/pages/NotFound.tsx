import { Link } from 'react-router-dom';
import { Masthead, SiteFooter } from '../components/Brand';
import { useDocumentTitle } from '../lib/hooks';

export default function NotFound() {
  useDocumentTitle('Page not found · Internship Drive 2026');
  return (
    <>
      <Masthead compact />
      <main className="bg-saffron frame py-24 md:py-36 min-h-[70svh]">
        <h1 className="display" style={{ fontSize: 'clamp(3rem, 10vw, 9rem)' }}>
          Not here
        </h1>
        <p className="lead mt-6 max-w-[36ch]">That page does not exist. The roles, the form and your application status are one click away.</p>
        <div className="flex flex-wrap gap-3 mt-8">
          <Link to="/" className="btn btn-ink">
            See the roles
          </Link>
          <Link to="/track" className="btn btn-paper">
            Track my application
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
