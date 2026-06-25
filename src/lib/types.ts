// src/lib/types.ts — types partagés client/serveur.

/** Un enregistrement par jour. Tous les champs de mesure sont facultatifs (null = non saisi). */
export interface Entry {
	date: string; // 'YYYY-MM-DD' (clé)
	weight_kg: number | null;
	body_fat_pct: number | null; // masse grasse %
	muscle_pct: number | null; // masse musculaire %
	calories: number | null; // kcal saisies (indépendantes des macros)
	protein_g: number | null;
	fat_g: number | null;
	carbs_g: number | null;
	effort: number | null; // niveau d'effort physique 1–5
	created_at: string;
	updated_at: string;
}

/** Champs de mesure (sans date ni horodatage) — utile pour itérer/valider. */
export type MetricField =
	| 'weight_kg'
	| 'body_fat_pct'
	| 'muscle_pct'
	| 'calories'
	| 'protein_g'
	| 'fat_g'
	| 'carbs_g'
	| 'effort';

/** Données reçues du formulaire : date + mesures (toutes nullables). */
export interface EntryInput {
	date: string;
	weight_kg: number | null;
	body_fat_pct: number | null;
	muscle_pct: number | null;
	calories: number | null;
	protein_g: number | null;
	fat_g: number | null;
	carbs_g: number | null;
	effort: number | null; // niveau d'effort physique 1–5
}

/** Objectifs personnels (aucune cible imposée : saisis par l'utilisateur). */
export interface Goals {
	target_weight_kg: number | null;
	target_body_fat_pct: number | null;
	updated_at: string;
}

export interface GoalsInput {
	target_weight_kg: number | null;
	target_body_fat_pct: number | null;
}

/** Sexe biologique (utile pour interpréter la composition corporelle). */
export type Sex = 'male' | 'female';

/** Informations personnelles : ligne unique, peu/pas variables dans le temps. */
export interface Profile {
	height_cm: number | null;
	sex: Sex | null;
	birth_date: string | null; // 'YYYY-MM-DD'
	notes: string | null; // contexte libre (santé, sport, restrictions…)
	updated_at: string;
}

export interface ProfileInput {
	height_cm: number | null;
	sex: Sex | null;
	birth_date: string | null;
	notes: string | null;
}

/** Période d'affichage / d'export. */
export type Period = '7' | '30' | '90' | 'all';
