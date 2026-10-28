import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

type Chapter = { ground: string; ink: string; action: string; actionInk: string };

const CHAPTERS: Record<string, Chapter> = {
  saffron: { ground: 'var(--color-saffron)', ink: 'var(--color-ink)', action: 'var(--color-ink)', actionInk: 'var(--color-paper)' },
  paper: { ground: 'var(--color-paper)', ink: 'var(--color-ink)', action: 'var(--color-ink)', actionInk: 'var(--color-paper)' },
  ink: { ground: 'var(--color-ink)', ink: 'var(--color-paper)', action: 'var(--color-saffron)', actionInk: 'var(--color-ink)' },
  green: { ground: 'var(--color-green)', ink: 'var(--color-ink)', action: 'var(--color-ink)', actionInk: 'var(--color-paper)' },
};

/**
 * The page's signature move: a slim fixed bar that appears once the hero has
 * scrolled away and takes the ground and ink of whichever chapter is under it.
 */
export default function ChapterBar() {
  const [visible, setVisible] = useState(false);
  const [chapter, setChapter] = useState<Chapter>(CHAPTERS.paper);
  const frame = useRef(0);

  useEffect(() => {
    const check = () => {
      frame.current = 0;
      const hero = document.querySelector<HTMLElement>('[data-hero]');
      const heroBottom = hero ? hero.getBoundingClientRect().bottom : 0;
      setVisible(heroBottom < 56);
      const probe = 28;
      const sections = document.querySelectorAll<HTMLElement>('[data-chapter]');
      for (const s of sections) {
        const r = s.getBoundingClientRect();
        if (r.top <= probe && r.bottom > probe) {
          setChapter(CHAPTERS[s.dataset.chapter || 'paper'] || CHAPTERS.paper);
          break;
        }
      }
    };
    const onScroll = () => {
      if (!frame.current) frame.current = requestAnimationFrame(check);
    };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame.current);
    };
  }, []);

  return (
    <div
      className="fixed inset-x-0 top-0 z-40 frame"
      style={{
        background: chapter.ground,
        color: chapter.ink,
        transform: visible ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 320ms var(--ease-out), background-color 300ms ease, color 300ms ease',
      }}
      aria-hidden={!visible}
    >
      <div className="flex h-14 items-center justify-between gap-4">
        <Link to="/" className="font-bold tracking-tight truncate" tabIndex={visible ? 0 : -1}>
          Yi MIT-WPU · Internship Drive 2026
        </Link>
        <div className="flex items-center gap-4">
          <a href="#roles" className="hidden sm:inline font-medium" tabIndex={visible ? 0 : -1}>
            Roles
          </a>
          <Link
            to="/apply"
            className="btn"
            tabIndex={visible ? 0 : -1}
            style={{
              minHeight: 40,
              background: chapter.action,
              color: chapter.actionInk,
              transition: 'background-color 300ms ease, color 300ms ease',
            }}
          >
            Apply
          </Link>
        </div>
      </div>
    </div>
  );
}
