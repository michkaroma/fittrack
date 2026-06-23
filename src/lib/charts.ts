// src/lib/charts.ts — helpers PURS pour les graphiques SVG faits main.
import { dayNumber, type Point } from './metrics';

export interface XY {
	x: number;
	y: number;
}

export type Tone = 'accent' | 'bright' | 'dim';
export type Dash = 'solid' | 'dotted' | 'dashed';

/** Couleur CSS d'un ton (accent unique + deux neutres). */
export function toneColor(tone: Tone): string {
	switch (tone) {
		case 'accent':
			return 'rgb(var(--c-accent))';
		case 'bright':
			return 'rgb(var(--c-text-2))';
		case 'dim':
			return 'rgb(var(--c-muted))';
	}
}

/** Signature de tirets : pleine / pointillés / tirets. */
export function dashArray(dash: Dash | undefined): string | undefined {
	if (dash === 'dotted') return '1 5';
	if (dash === 'dashed') return '4 4';
	return undefined;
}

/** Tracé polyligne « M..L.. ». */
export function linePath(pts: XY[]): string {
	if (pts.length === 0) return '';
	return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}

/** Tracé lissé (Catmull-Rom → Bézier) pour les courbes de tendance. */
export function smoothPath(pts: XY[]): string {
	if (pts.length < 3) return linePath(pts);
	let d = `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
	for (let i = 0; i < pts.length - 1; i++) {
		const p0 = pts[i - 1] ?? pts[i];
		const p1 = pts[i];
		const p2 = pts[i + 1];
		const p3 = pts[i + 2] ?? p2;
		const c1x = p1.x + (p2.x - p0.x) / 6;
		const c1y = p1.y + (p2.y - p0.y) / 6;
		const c2x = p2.x - (p3.x - p1.x) / 6;
		const c2y = p2.y - (p3.y - p1.y) / 6;
		d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
	}
	return d;
}

/** Aire sous une polyligne, fermée à la ligne de base `y0`. */
export function areaPath(pts: XY[], y0: number): string {
	if (pts.length === 0) return '';
	const top = linePath(pts);
	const last = pts[pts.length - 1];
	const first = pts[0];
	return `${top} L${last.x.toFixed(2)},${y0.toFixed(2)} L${first.x.toFixed(2)},${y0.toFixed(2)} Z`;
}

function niceNum(range: number, round: boolean): number {
	const exp = Math.floor(Math.log10(range));
	const frac = range / Math.pow(10, exp);
	let nf: number;
	if (round) {
		if (frac < 1.5) nf = 1;
		else if (frac < 3) nf = 2;
		else if (frac < 7) nf = 5;
		else nf = 10;
	} else {
		if (frac <= 1) nf = 1;
		else if (frac <= 2) nf = 2;
		else if (frac <= 5) nf = 5;
		else nf = 10;
	}
	return nf * Math.pow(10, exp);
}

/** Graduations « rondes » couvrant [min,max]. */
export function niceTicks(min: number, max: number, count = 4): number[] {
	if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
	if (min === max) {
		const pad = Math.abs(min) > 0 ? Math.abs(min) * 0.1 : 1;
		min -= pad;
		max += pad;
	}
	const range = niceNum(max - min, false);
	const step = niceNum(range / Math.max(1, count - 1), true);
	const niceMin = Math.floor(min / step) * step;
	const niceMax = Math.ceil(max / step) * step;
	const ticks: number[] = [];
	for (let v = niceMin; v <= niceMax + step * 0.5; v += step) ticks.push(Number(v.toFixed(6)));
	return ticks;
}

/** Domaine X (en numéros de jour) couvrant toutes les séries fournies. */
export function xDomain(allDates: string[]): { min: number; max: number } {
	if (allDates.length === 0) return { min: 0, max: 1 };
	let min = Infinity;
	let max = -Infinity;
	for (const d of allDates) {
		const n = dayNumber(d);
		if (n < min) min = n;
		if (n > max) max = n;
	}
	if (min === max) {
		min -= 1;
		max += 1;
	}
	return { min, max };
}

/** 'YYYY-MM-DD' → 'JJ/MM'. */
export function shortDate(date: string): string {
	const [, m, d] = date.split('-');
	return `${d}/${m}`;
}

export type { Point };
