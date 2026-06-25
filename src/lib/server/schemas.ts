// src/lib/server/schemas.ts — validateurs manuels (sans dépendance Zod).
// Renvoient { ok:true, value } ou { ok:false, message } (message FR).
import type { EntryInput, GoalsInput, MetricField, ProfileInput, Sex } from '../types';

type Result<T> = { ok: true; value: T } | { ok: false; message: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Vrai si `s` est une date calendaire réelle au format AAAA-MM-JJ. */
export function isValidDate(s: string): boolean {
	if (!DATE_RE.test(s)) return false;
	const [y, m, d] = s.split('-').map(Number);
	if (m < 1 || m > 12 || d < 1 || d > 31) return false;
	const dt = new Date(Date.UTC(y, m - 1, d));
	return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Champ numérique facultatif : null/''/absent → null ; sinon nombre fini dans [min,max].
 *  Tolère la virgule décimale (« 75,4 »). */
function optionalNumber(v: unknown, label: string, min: number, max: number): Result<number | null> {
	if (v === undefined || v === null || v === '') return { ok: true, value: null };
	const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(',', '.')) : NaN;
	if (!Number.isFinite(n)) return { ok: false, message: `${label} : nombre invalide.` };
	if (n < min || n > max)
		return { ok: false, message: `${label} : doit être compris entre ${min} et ${max}.` };
	return { ok: true, value: n };
}

interface FieldSpec {
	key: MetricField;
	label: string;
	min: number;
	max: number;
	int?: boolean;
}
const ENTRY_FIELDS: FieldSpec[] = [
	{ key: 'weight_kg', label: 'Poids', min: 0, max: 500 },
	{ key: 'body_fat_pct', label: 'Masse grasse %', min: 0, max: 100 },
	{ key: 'muscle_pct', label: 'Masse musculaire %', min: 0, max: 100 },
	{ key: 'calories', label: 'Calories', min: 0, max: 20000 },
	{ key: 'protein_g', label: 'Protéines', min: 0, max: 3000 },
	{ key: 'fat_g', label: 'Lipides', min: 0, max: 3000 },
	{ key: 'carbs_g', label: 'Glucides', min: 0, max: 3000 },
	{ key: 'effort', label: 'Effort', min: 1, max: 5, int: true }
];

export function validateEntryInput(body: unknown): Result<EntryInput> {
	const b = (body ?? {}) as Record<string, unknown>;
	const date = typeof b.date === 'string' ? b.date.trim() : '';
	if (!isValidDate(date))
		return { ok: false, message: 'La date est obligatoire (format AAAA-MM-JJ).' };

	const value: EntryInput = {
		date,
		weight_kg: null,
		body_fat_pct: null,
		muscle_pct: null,
		calories: null,
		protein_g: null,
		fat_g: null,
		carbs_g: null,
		effort: null
	};
	for (const f of ENTRY_FIELDS) {
		const r = optionalNumber(b[f.key], f.label, f.min, f.max);
		if (!r.ok) return r;
		value[f.key] = f.int && r.value != null ? Math.round(r.value) : r.value;
	}
	return { ok: true, value };
}

export function validateGoalsInput(body: unknown): Result<GoalsInput> {
	const b = (body ?? {}) as Record<string, unknown>;
	const w = optionalNumber(b.target_weight_kg, 'Objectif de poids', 0, 500);
	if (!w.ok) return w;
	const bf = optionalNumber(b.target_body_fat_pct, 'Objectif de masse grasse %', 0, 100);
	if (!bf.ok) return bf;
	return { ok: true, value: { target_weight_kg: w.value, target_body_fat_pct: bf.value } };
}

const NOTES_MAX = 4000;

/** Aujourd'hui au format AAAA-MM-JJ (heure locale serveur) — borne haute de la date de naissance. */
function todayLocal(): string {
	const d = new Date();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${d.getFullYear()}-${m}-${day}`;
}

export function validateProfileInput(body: unknown): Result<ProfileInput> {
	const b = (body ?? {}) as Record<string, unknown>;

	// Taille (cm, entier) — facultative.
	const h = optionalNumber(b.height_cm, 'Taille', 50, 300);
	if (!h.ok) return h;
	const height_cm = h.value == null ? null : Math.round(h.value);

	// Sexe — 'male' | 'female' | null. Narrowing positif (exclure des littéraux
	// d'un `unknown` ne le réduit pas à Sex).
	let sex: Sex | null = null;
	const rawSex = b.sex;
	if (rawSex === 'male' || rawSex === 'female') {
		sex = rawSex;
	} else if (rawSex != null && rawSex !== '') {
		return { ok: false, message: 'Sexe : valeur invalide.' };
	}

	// Date de naissance — facultative, date réelle, ni future ni absurde.
	let birth_date: string | null = null;
	const rawBirth = typeof b.birth_date === 'string' ? b.birth_date.trim() : '';
	if (rawBirth !== '') {
		if (!isValidDate(rawBirth))
			return { ok: false, message: 'Date de naissance : format attendu AAAA-MM-JJ.' };
		if (rawBirth > todayLocal())
			return { ok: false, message: 'Date de naissance : ne peut pas être dans le futur.' };
		if (Number(rawBirth.slice(0, 4)) < 1900)
			return { ok: false, message: 'Date de naissance : année invalide.' };
		birth_date = rawBirth;
	}

	// Notes — texte libre facultatif, longueur bornée.
	let notes: string | null = null;
	const rawNotes = typeof b.notes === 'string' ? b.notes.trim() : '';
	if (rawNotes !== '') {
		if (rawNotes.length > NOTES_MAX)
			return { ok: false, message: `Notes : ${NOTES_MAX} caractères maximum.` };
		notes = rawNotes;
	}

	return { ok: true, value: { height_cm, sex, birth_date, notes } };
}
