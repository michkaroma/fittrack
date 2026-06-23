// src/lib/metrics.ts — calculs purs, réutilisables client ET serveur.
// PRINCIPE : l'app ne fait AUCUNE recommandation. Elle dérive seulement des
// grandeurs à partir des mesures brutes. Les calories saisies ne sont JAMAIS
// recalculées à partir des macros (et inversement) : ce sont des données
// indépendantes, stockées et affichées telles quelles.
import type { Entry, MetricField } from './types';

/** kcal par gramme de macronutriment (références physiologiques usuelles). */
export const PROTEIN_KCAL_PER_G = 4;
export const CARB_KCAL_PER_G = 4;
export const FAT_KCAL_PER_G = 9;

export const round1 = (n: number): number => Math.round(n * 10) / 10;
export const round0 = (n: number): number => Math.round(n);

// ── Composition corporelle (kg) ────────────────────────────────────────────

/** Masse grasse (kg) = poids × %MG / 100. */
export function fatMassKg(weight: number | null, bfPct: number | null): number | null {
	if (weight == null || bfPct == null) return null;
	return (weight * bfPct) / 100;
}

/** Masse maigre / fat-free mass (kg) = poids × (1 − %MG / 100).
 *  Inclut os, eau, organes — DISTINCTE de la masse musculaire. */
export function fatFreeMassKg(weight: number | null, bfPct: number | null): number | null {
	if (weight == null || bfPct == null) return null;
	return weight * (1 - bfPct / 100);
}

/** Masse musculaire (kg) = poids × %muscle / 100.
 *  Sous-ensemble de la masse maigre, distincte de celle-ci. */
export function muscleMassKg(weight: number | null, musclePct: number | null): number | null {
	if (weight == null || musclePct == null) return null;
	return (weight * musclePct) / 100;
}

// ── Répartition des macronutriments ─────────────────────────────────────────

export interface MacroSplit {
	/** kcal issues des macros (P·4 + G·4 + L·9). Peut différer des calories saisies. */
	macroKcal: number;
	proteinPct: number;
	carbsPct: number;
	fatPct: number;
}

/**
 * Répartition des macros en % des CALORIES ISSUES DES MACROS (P·4 + G·4 + L·9).
 * On utilise ce dénominateur (et non les calories saisies) car les deux sont
 * indépendants : la somme des % vaut toujours 100 % et reste cohérente même si
 * les calories saisies diffèrent. Renvoie null si aucune macro n'est saisie.
 */
export function macroSplit(
	protein_g: number | null,
	fat_g: number | null,
	carbs_g: number | null
): MacroSplit | null {
	const p = protein_g ?? 0;
	const f = fat_g ?? 0;
	const c = carbs_g ?? 0;
	if (protein_g == null && fat_g == null && carbs_g == null) return null;
	const pk = p * PROTEIN_KCAL_PER_G;
	const ck = c * CARB_KCAL_PER_G;
	const fk = f * FAT_KCAL_PER_G;
	const total = pk + ck + fk;
	if (total <= 0) return null;
	return {
		macroKcal: total,
		proteinPct: (pk / total) * 100,
		carbsPct: (ck / total) * 100,
		fatPct: (fk / total) * 100
	};
}

/** Toutes les grandeurs dérivées d'une entrée (champs null si non calculables). */
export interface DerivedEntry {
	fatMassKg: number | null;
	fatFreeMassKg: number | null;
	muscleMassKg: number | null;
	macros: MacroSplit | null;
}

export function derive(e: Entry): DerivedEntry {
	return {
		fatMassKg: fatMassKg(e.weight_kg, e.body_fat_pct),
		fatFreeMassKg: fatFreeMassKg(e.weight_kg, e.body_fat_pct),
		muscleMassKg: muscleMassKg(e.weight_kg, e.muscle_pct),
		macros: macroSplit(e.protein_g, e.fat_g, e.carbs_g)
	};
}

// ── Séries temporelles ───────────────────────────────────────────────────────

/** Numéro de jour absolu (UTC) pour calculer des écarts de dates sans fuseau. */
export function dayNumber(date: string): number {
	const [y, m, d] = date.split('-').map(Number);
	return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

export interface Point {
	date: string;
	value: number;
}

/**
 * Extrait une série (date, valeur) pour un champ donné, en ignorant les jours
 * non saisis. Entrées supposées triées par date croissante.
 */
export function series(entries: Entry[], field: MetricField): Point[] {
	const out: Point[] = [];
	for (const e of entries) {
		const v = e[field];
		if (v != null) out.push({ date: e.date, value: v });
	}
	return out;
}

/**
 * Moyenne glissante TRAÎNANTE sur une fenêtre de `windowDays` jours CALENDAIRES.
 * Pour chaque point ayant une valeur, on moyenne toutes les valeurs présentes
 * dans l'intervalle [d − (windowDays−1) ; d]. Gère donc proprement les jours
 * manquants (la fenêtre est calendaire, pas « les N derniers points »).
 */
export function rollingAverage(points: Point[], windowDays = 7): Point[] {
	const out: Point[] = [];
	let start = 0;
	for (let i = 0; i < points.length; i++) {
		const di = dayNumber(points[i].date);
		while (dayNumber(points[start].date) < di - (windowDays - 1)) start++;
		let sum = 0;
		let count = 0;
		for (let j = start; j <= i; j++) {
			sum += points[j].value;
			count++;
		}
		out.push({ date: points[i].date, value: sum / count });
	}
	return out;
}

// ── Résumés statistiques ─────────────────────────────────────────────────────

export interface Stat {
	last: number | null;
	lastDate: string | null;
	avg: number | null;
	min: number | null;
	max: number | null;
	count: number;
}

/** Statistiques (dernière valeur, moyenne, min, max) d'un champ sur les entrées fournies. */
export function stat(entries: Entry[], field: MetricField): Stat {
	const pts = series(entries, field);
	if (pts.length === 0) return { last: null, lastDate: null, avg: null, min: null, max: null, count: 0 };
	let sum = 0;
	let min = pts[0].value;
	let max = pts[0].value;
	for (const p of pts) {
		sum += p.value;
		if (p.value < min) min = p.value;
		if (p.value > max) max = p.value;
	}
	const lastPt = pts[pts.length - 1];
	return { last: lastPt.value, lastDate: lastPt.date, avg: sum / pts.length, min, max, count: pts.length };
}

/** Variation entre la dernière valeur et la précédente (deux derniers points saisis). */
export function lastDelta(entries: Entry[], field: MetricField): number | null {
	const pts = series(entries, field);
	if (pts.length < 2) return null;
	return pts[pts.length - 1].value - pts[pts.length - 2].value;
}
