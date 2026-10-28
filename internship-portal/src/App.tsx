import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import RolePage from './pages/RolePage';
import ApplyPage from './pages/ApplyPage';
import TrackPage from './pages/TrackPage';
import SchedulePage from './pages/SchedulePage';
import NotFound from './pages/NotFound';

const Organiser = lazy(() => import('./pages/organiser/Organiser'));
const CompanyPortal = lazy(() => import('./pages/CompanyPortal'));

function ScrollReset() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

function Loading() {
  return <p className="frame py-24 lead">Loading…</p>;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollReset />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/roles/:code" element={<RolePage />} />
          <Route path="/apply" element={<ApplyPage />} />
          <Route path="/track" element={<TrackPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/organiser/*" element={<Organiser />} />
          <Route path="/company/:token" element={<CompanyPortal />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
