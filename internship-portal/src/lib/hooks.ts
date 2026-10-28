import { useEffect, useRef, useState } from 'react';
import { loadPublicData } from './api';
import type { PublicData } from './types';

export function usePublicData() {
  const [data, setData] = useState<PublicData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    loadPublicData(attempt > 0)
      .then((d) => alive && (setData(d), setError(null)))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [attempt]);

  return { data, error, retry: () => setAttempt((n) => n + 1) };
}

/** Adds `.in` to `.rise` children as they enter the viewport. */
export function useReveal<T extends HTMLElement>(deps: unknown[] = []) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>('.rise'));
    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );
    items.forEach((el) => io.observe(el));
    // Safety net: anything already scrolled past (fast jumps, anchor links,
    // full-page captures) is shown, and after a few seconds everything is.
    const sweep = () =>
      items.forEach((el) => {
        if (!el.classList.contains('in') && el.getBoundingClientRect().top < window.innerHeight) el.classList.add('in');
      });
    window.addEventListener('scroll', sweep, { passive: true });
    const late = setTimeout(() => items.forEach((el) => el.classList.add('in')), 4000);
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', sweep);
      clearTimeout(late);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

export function useLocalDraft<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? { ...initial, ...JSON.parse(raw) } : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* storage may be unavailable */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [key, value]);
  const clear = () => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  };
  return [value, setValue, clear] as const;
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
