// src/lib/server/db.ts
// Connexion SQLite synchrone unique (better-sqlite3). Détient les pragmas, les
// migrations et l'accès aux données. Imports RELATIFS + process.env pour rester
// importable hors SvelteKit (scripts tsx).
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { runMigrations } from './migrations';
import type { Entry, EntryInput, Goals, GoalsInput, MetricField } from '../types';

const METRIC_FIELDS: MetricField[] = [
	'weight_kg',
	'body_fat_pct',
	'muscle_pct',
	'calories',
	'protein_g',
	'fat_g',
	'carbs_g'
];

let _db: Database.Database | null = null;

export function dbPath(): string {
	const p = process.env.DB_PATH ?? './data/fittrack.db';
	mkdirSync(dirname(p), { recursive: true });
	return p;
}

export function getDb(): Database.Database {
	if (_db) return _db;
	_db = new Database(dbPath());
	_db.pragma('journal_mode = WAL');
	_db.pragma('foreign_keys = ON');
	_db.pragma('busy_timeout = 5000');
	_db.pragma('synchronous = NORMAL');
	runMigrations(_db);
	return _db;
}

export function initDb(): void {
	getDb();
}

export function closeDb(): void {
	if (_db) {
		_db.close();
		_db = null;
	}
}

// ── Date helper ──────────────────────────────────────────────────────────────
export function localDate(d: Date = new Date()): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

// ── Entries ──────────────────────────────────────────────────────────────────

/** Vrai si toutes les mesures de l'entrée sont nulles (entrée « vide »). */
function isEmpty(input: EntryInput): boolean {
	return METRIC_FIELDS.every((f) => input[f] == null);
}

/**
 * Upsert d'une journée. Remplace l'enregistrement complet (un champ laissé vide
 * efface la valeur précédente — le formulaire pré-remplit donc les valeurs).
 * Si toutes les mesures sont vides, l'entrée est supprimée (pas de ligne fantôme).
 * Renvoie l'entrée enregistrée, ou null si supprimée/vide.
 */
export function upsertEntry(input: EntryInput): Entry | null {
	const db = getDb();
	if (isEmpty(input)) {
		deleteEntry(input.date);
		return null;
	}
	db.prepare(
		`INSERT INTO entries (date, weight_kg, body_fat_pct, muscle_pct, calories, protein_g, fat_g, carbs_g, updated_at)
     VALUES (@date, @weight_kg, @body_fat_pct, @muscle_pct, @calories, @protein_g, @fat_g, @carbs_g, datetime('now'))
     ON CONFLICT(date) DO UPDATE SET
       weight_kg = excluded.weight_kg,
       body_fat_pct = excluded.body_fat_pct,
       muscle_pct = excluded.muscle_pct,
       calories = excluded.calories,
       protein_g = excluded.protein_g,
       fat_g = excluded.fat_g,
       carbs_g = excluded.carbs_g,
       updated_at = datetime('now')`
	).run({
		date: input.date,
		weight_kg: input.weight_kg,
		body_fat_pct: input.body_fat_pct,
		muscle_pct: input.muscle_pct,
		calories: input.calories,
		protein_g: input.protein_g,
		fat_g: input.fat_g,
		carbs_g: input.carbs_g
	});
	return getEntry(input.date);
}

export function getEntry(date: string): Entry | null {
	return (getDb().prepare('SELECT * FROM entries WHERE date = ?').get(date) as Entry) ?? null;
}

export function deleteEntry(date: string): boolean {
	return getDb().prepare('DELETE FROM entries WHERE date = ?').run(date).changes > 0;
}

/** Liste les entrées triées par date croissante, bornée optionnellement [from, to] inclus. */
export function listEntries(opts?: { from?: string; to?: string }): Entry[] {
	const db = getDb();
	if (opts?.from && opts?.to) {
		return db
			.prepare('SELECT * FROM entries WHERE date BETWEEN ? AND ? ORDER BY date ASC')
			.all(opts.from, opts.to) as Entry[];
	}
	if (opts?.from) {
		return db
			.prepare('SELECT * FROM entries WHERE date >= ? ORDER BY date ASC')
			.all(opts.from) as Entry[];
	}
	if (opts?.to) {
		return db
			.prepare('SELECT * FROM entries WHERE date <= ? ORDER BY date ASC')
			.all(opts.to) as Entry[];
	}
	return db.prepare('SELECT * FROM entries ORDER BY date ASC').all() as Entry[];
}

// ── Goals ──────────────────────────────────────────────────────────────────

export function getGoals(): Goals {
	const row = getDb()
		.prepare('SELECT target_weight_kg, target_body_fat_pct, updated_at FROM goals WHERE id = 1')
		.get() as Goals | undefined;
	return row ?? { target_weight_kg: null, target_body_fat_pct: null, updated_at: '' };
}

export function setGoals(input: GoalsInput): Goals {
	// Upsert auto-réparant : recrée la ligne id=1 si elle manquait (la contrainte
	// CHECK(id=1) + PK garantit l'unicité), au lieu d'un UPDATE silencieusement no-op.
	getDb()
		.prepare(
			`INSERT INTO goals (id, target_weight_kg, target_body_fat_pct, updated_at)
       VALUES (1, @target_weight_kg, @target_body_fat_pct, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         target_weight_kg = excluded.target_weight_kg,
         target_body_fat_pct = excluded.target_body_fat_pct,
         updated_at = datetime('now')`
		)
		.run({
			target_weight_kg: input.target_weight_kg,
			target_body_fat_pct: input.target_body_fat_pct
		});
	return getGoals();
}
