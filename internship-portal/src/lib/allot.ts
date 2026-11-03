// First-come-first-served interview slot allotment.
//
// Every company runs a grid of slots: `slotMin` long, `bufferMin` between one
// slot and the next, restarting right after lunch. A student who is admitted
// gets one slot per company they applied to. Their companies are tried in
// every order and the order that finishes earliest wins, so students arriving
// one after another rotate across companies (A,B,C / B,C,A / C,A,B) and no
// slot is left empty while somebody is still waiting.

import { isoToIstDate, istToIso } from './format';
import type { DriveSettings } from './types';

const MIN = 60000;
const DAY_MS = 24 * 60 * MIN;
// Slots are shown as serial numbers, not clock times, so a drive day's grid
// runs on past midnight. Stored start times only order the slots.
const HORIZON_DAYS = 3;
export const EXTEND_MS = 15 * MIN; // added to a slot for each extra role at the same company

export interface Rules {
  slotMin: number;
  bufferMin: number;
  dayStart: string; // HH:MM
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
  end?: number; // defaults to one standard slot
  panel: string | null;
}

export interface Want {
  company: string;
  appId: string;
  also?: string[]; // the student's other roles at this company, sharing this slot
  ms?: number; // exact length; otherwise a standard slot plus EXTEND_MS per linked role
  from?: number; // earliest start for this want, so extending a slot never moves it earlier
}

export interface Placed extends Want {
  start: number;
  end: number;
  panel: string;
}

export const panelName = (company: string, n: number) => `${company}-P${n}`;

export const DEFAULT_RULES: Rules = { slotMin: 30, bufferMin: 20, dayStart: '11:00', lunchStart: '13:00', lunchEnd: '14:00' };

export function rulesFrom(s?: DriveSettings): Rules {
  if (!s || s.slot_minutes == null) return DEFAULT_RULES;
  return {
    slotMin: s.slot_minutes,
    bufferMin: s.buffer_minutes,
    dayStart: s.day_start.slice(0, 5),
    lunchStart: s.lunch_start?.slice(0, 5) ?? null,
    lunchEnd: s.lunch_end?.slice(0, 5) ?? null,
  };
}

/** A company starts at its own session time, else the interview start time. There is no end time. */
export function windowFor(day: string, rules: Rules, session?: { starts_at: string | null; panels: number }[]): Window {
  const clock = (t: string) => new Date(istToIso(day, t.slice(0, 5))).getTime();
  const own = (session ?? []).filter((s) => s.starts_at).map((s) => clock(s.starts_at!));
  return { start: own.length ? Math.min(...own) : clock(rules.dayStart), end: clock('00:00') + HORIZON_DAYS * DAY_MS, panels: Math.max(1, ...(session ?? []).map((s) => s.panels)) };
}

/** The drive day a slot belongs to: the latest drive day it started on or after, since late slots run past midnight. */
export function driveDayOf(iso: string, days: string[]) {
  const date = isoToIstDate(iso);
  const back = new Date(istToIso(date, '12:00')).getTime() - HORIZON_DAYS * DAY_MS;
  return [...days].sort().reverse().find((d) => d <= date && new Date(istToIso(d, '12:00')).getTime() > back) ?? date;
}

/** Serial number of a slot on its day's grid. A start between grid times shares the number before it. */
export function slotNumber(day: string, rules: Rules, start: number) {
  return Math.max(1, slotStarts(day, rules, windowFor(day, rules)).filter((s) => s <= start).length);
}

export function slotLabel(iso: string, days: string[], rules: Rules) {
  return `Slot ${slotNumber(driveDayOf(iso, days), rules, new Date(iso).getTime())}`;
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

  const clock = (t: string) => new Date(istToIso(day, t.slice(0, 5))).getTime();
  const ls = rules.lunchStart ? clock(rules.lunchStart) : null;
  const le = rules.lunchEnd ? clock(rules.lunchEnd) : null;
  const sizeOf = (w: Want) => w.ms ?? len + (w.also?.length ?? 0) * EXTEND_MS;

  const grids = new Map<string, number[]>();
  const gridOf = (c: string) => {
    if (!grids.has(c)) grids.set(c, windows.has(c) ? slotStarts(day, rules, windows.get(c)!) : []);
    return grids.get(c)!;
  };

  function firstFree(company: string, from: number, size: number, mine: [number, number][]) {
    const w = windows.get(company);
    if (!w) return null;
    for (const s of gridOf(company)) {
      if (s < from) continue;
      if (ls != null && le != null && s < le && s + size > ls) continue;
      // a longer slot holds its panel for as long as it runs, so later grid times can be blocked too
      const held = taken.filter((t) => t.company === company && t.start < s + size && (t.end ?? t.start + len) > s);
      const panel = freePanel(company, w.panels, new Set(held.map((t) => t.panel ?? '')));
      if (!panel) continue;
      if (mine.some(([b0, b1]) => s < b1 + gap && s + size + gap > b0)) continue;
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
      const size = sizeOf(w);
      const slot = firstFree(w.company, Math.max(notBefore, w.from ?? 0), size, mine);
      if (!slot) continue;
      placed.push({ ...w, start: slot.start, end: slot.start + size, panel: slot.panel });
      mine.push([slot.start, slot.start + size]);
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
