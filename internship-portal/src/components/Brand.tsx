import { Link } from 'react-router-dom';

export function YiLogo({ className = 'h-12 w-auto' }: { className?: string }) {
  return <img src="/logos/yi-logo.png" alt="Young Indians (Yi) — We can, we will" className={className} width={202} height={164} />;
}

export function CiiLogo({ className = 'h-9 w-auto' }: { className?: string }) {
  return <img src="/logos/cii-logo.png" alt="Confederation of Indian Industry (CII)" className={className} width={365} height={104} />;
}

export function MitWpuLogo({ className = 'h-11 w-auto' }: { className?: string }) {
  return <img src="/logos/mit-wpu-logo.jpg" alt="Dr. Vishwanath Karad MIT World Peace University, Pune" className={className} width={431} height={124} />;
}

export function Masthead({ compact = false }: { compact?: boolean }) {
  return (
    <header className="bg-paper frame">
      <div className={`flex items-center justify-between gap-4 ${compact ? 'py-3' : 'py-4'}`}>
        <Link to="/" className="flex items-center gap-3 sm:gap-6 min-w-0" aria-label="Internship Drive 2026 home">
          <YiLogo className={compact ? 'h-9 sm:h-10 w-auto' : 'h-10 sm:h-14 w-auto'} />
          <span className="hidden sm:block h-10 w-[2px] bg-mist-deep" aria-hidden="true" />
          <MitWpuLogo className={`${compact ? 'h-8 sm:h-9' : 'h-8 sm:h-12'} w-auto`} />
          <CiiLogo className="h-8 w-auto hidden lg:block" />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main">
          <Link to="/#roles" className="hidden md:inline-flex px-3 py-2 font-medium hover:underline underline-offset-8 decoration-2 decoration-saffron">
            Roles
          </Link>
          <Link to="/schedule" className="hidden md:inline-flex px-3 py-2 font-medium hover:underline underline-offset-8 decoration-2 decoration-saffron">
            Schedule
          </Link>
          <Link to="/track" className="hidden sm:inline-flex px-3 py-2 font-medium hover:underline underline-offset-8 decoration-2 decoration-saffron">
            Track
          </Link>
          <Link to="/apply" className="btn btn-ink ml-1">
            Apply
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-ink text-paper frame pt-10 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-md">
          <p className="font-medium">Young Indians · MIT-WPU Student Chapter</p>
          <p className="small text-paper/80 mt-1">Internship Drive 2026 · interviews on 2 and 3 November at MIT-WPU, Pune.</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 small" aria-label="Footer">
          <Link to="/#roles" className="link">Roles</Link>
          <Link to="/schedule" className="link">Schedule</Link>
          <Link to="/track" className="link">Track my application</Link>
          <Link to="/organiser" className="link">Organiser login</Link>
        </nav>
      </div>
    </footer>
  );
}
