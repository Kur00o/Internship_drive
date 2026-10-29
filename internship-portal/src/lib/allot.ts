// First-come-first-served interview slot allotment.
//
// Every company runs a grid of slots: `slotMin` long, `bufferMin` between one
// slot and the next, restarting right after lunch. A student who is admitted
// gets one slot per company they applied to. Their companies are tried in
// every order and the order that finishes earliest wins, so students arriving
// one after another rotate across companies (A,B,C / B,C,A / C,A,B) and no
// slot is left empty while somebody is still waiting.

import { istToIso } from './format';

const MIN = 60000;

export interface Rules {
  slotMin: number;
  bufferMin: number;
  dayStart: string; // HH:MM
  dayEnd: string;
  lunchStart: string | null;
  lunchEnd: string | null;
}

export interface Window {
  start: number; // epoch ms
  end: number;
  panels: number;
}

export interface Taken {
  company: string;
  start: number;
  panel: string | null;
}

export interface Want {
  company: string;
  appId: string;
}

export interface Placed extends Want {
  start: number;
  end: number;
  panel: string;
}

export const panelName = (company: string, n: number) => `${company}-P${n}`;

export function windowFor(day: string, rules: Rules, session?: { starts_at: string | null; ends_at: string | null; panels: number }[]): Window {
  const timed = (session ?? []).filter((s) => s.starts_at && s.ends_at);
  const clock = (t: string) => new Date(istToIso(day, t.slice(0, 5))).getTime();
  if (!timed.length) return { start: clock(rules.dayStart), end: clock(rules.dayEnd), panels: Math.max(1, ...(session ?? []).map((s) => s.panels)) };
  return {
    start: Math.min(...timed.map((s) => clock(s.starts_at!))),
    end: Math.max(...timed.map((s) => clock(s.ends_at!))),
    panels: Math.max(...timed.map((s) => s.panels)),
  };
}

/** Start times (epoch ms) of every slot in a window. */
export function slotStarts(day: string, rules: Rules, w: Window): number[] {
  const len = rules.slotMin * MIN;
  const stride = len + rules.bufferMin * MIN;
  const clock = (t: string) => new Date(istToIso(day, t.slice(0, 5))).getTime();
  const ls = rules.lunchStart ? clock(rules.lunchStart) : null;
  const le = rules.lunchEnd ? clock(rules.lunchEnd) : null;
  const out: number[] = [];
  for (let t = w.start; t + len <= w.end; t += stride) {
    if (ls != null && le != null && t < le && t + len > ls) {
      t = le - stride; // resume straight after lunch
      continue;
    }
    out.push(t);
  }
  return out;
}

function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((r) => [x, ...r]));
}

export function freePanel(company: string, panels: number, usedPanels: Set<string>): string | null {
  for (let n = 1; n <= panels; n++) if (!usedPanels.has(panelName(company, n))) return panelName(company, n);
  return null;
}

/**
 * Place one student. `busy` is their interviews already booked that day,
 * `notBefore` the earliest allowed start (e.g. now, for a student who just
 * walked in). Returns the placement, or the companies that had no slot left.
 */
export function allotStudent(args: {
  day: string;
  rules: Rules;
  windows: Map<string, Window>;
  taken: Taken[];
  busy: [number, number][];
  wants: Want[];
  notBefore: number;
}): { placed: Placed[]; unplaced: Want[] } {
  const { day, rules, windows, taken, busy, wants, notBefore } = args;
  const len = rules.slotMin * MIN;
  const gap = rules.bufferMin * MIN;

  const used = new Map<string, Set<string>>();
  for (const t of taken) {
    const k = `${t.company}|${t.start}`;
    if (!used.has(k)) used.set(k, new Set());
    used.get(k)!.add(t.panel ?? '');
  }
  const grids = new Map<string, number[]>();
  const gridOf = (c: string) => {
    if (!grids.has(c)) grids.set(c, windows.has(c) ? slotStarts(day, rules, windows.get(c)!) : []);
    return grids.get(c)!;
  };

  function firstFree(company: string, from: number, mine: [number, number][]) {
    const w = windows.get(company);
    if (!w) return null;
    for (const s of gridOf(company)) {
      if (s < from) continue;
      const panel = freePanel(company, w.panels, used.get(`${company}|${s}`) ?? new Set());
      if (!panel) continue;
      if (mine.some(([b0, b1]) => s < b1 + gap && s + len + gap > b0)) continue;
      return { start: s, panel };
    }
    return null;
  }

  // try each order of this student's companies; keep the one that finishes first
  let best: { placed: Placed[]; finish: number; sum: number; rank: number } | null = null;
  const orders = permutations(wants.slice(0, 6));
  orders.forEach((order, rank) => {
    const mine = [...busy];
    const placed: Placed[] = [];
    for (const w of order) {
      const slot = firstFree(w.company, notBefore, mine);
      if (!slot) continue;
      placed.push({ ...w, start: slot.start, end: slot.start + len, panel: slot.panel });
      mine.push([slot.start, slot.start + len]);
    }
    const finish = Math.max(0, ...placed.map((p) => p.end));
    const sum = placed.reduce((a, p) => a + p.start, 0);
    const better =
      !best ||
      placed.length > best.placed.length ||
      (placed.length === best.placed.length && (finish < best.finish || (finish === best.finish && sum < best.sum)));
    if (better) best = { placed, finish, sum, rank };
  });

  const placed = (best as { placed: Placed[] } | null)?.placed ?? [];
  const got = new Set(placed.map((p) => p.company));
  return { placed: placed.sort((a, b) => a.start - b.start), unplaced: wants.filter((w) => !got.has(w.company)) };
}
