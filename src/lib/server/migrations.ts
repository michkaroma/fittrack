// src/lib/server/migrations.ts — migrations SQLite append-only, auto-appliquées au démarrage.
import type { Database } from 'better-sqlite3';

export interface Migration {
	version: number;
	name: string;
	up: (db: Database) => void;
}

// Append-only. Ne jamais éditer ni renuméroter une migration déjà livrée.
export const MIGRATIONS: Migration[] = [
	{
		version: 1,
		name: 'initial_schema',
		up: (db) => {
			db.exec(/* sql */ `
        -- ===== entries : un enregistrement par jour, tous champs facultatifs =====
        CREATE TABLE IF NOT EXISTS entries (
          date         TEXT PRIMARY KEY,         -- 'YYYY-MM-DD'
          weight_kg    REAL,
          body_fat_pct REAL,                     -- masse grasse %
          muscle_pct   REAL,                     -- masse musculaire %
          calories     REAL,                     -- kcal saisies (indépendantes des macros)
          protein_g    REAL,
          fat_g        REAL,
          carbs_g      REAL,
          created_at   TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- ===== goals : ligne unique id=1 (objectifs saisis par l'utilisateur) =====
        CREATE TABLE IF NOT EXISTS goals (
          id                  INTEGER PRIMARY KEY CHECK (id = 1),
          target_weight_kg    REAL,
          target_body_fat_pct REAL,
          updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);

        INSERT OR IGNORE INTO goals (id) VALUES (1);
      `);
		}
	},
	{
		version: 2,
		name: 'add_effort',
		up: (db) => {
			db.exec(/* sql */ `ALTER TABLE entries ADD COLUMN effort INTEGER;`);
		}
	}
];

export function runMigrations(db: Database): void {
	db.exec(/* sql */ `
    CREATE TABLE IF NOT EXISTS applied_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

	const current = (
		db.prepare('SELECT COALESCE(MAX(version), 0) AS v FROM applied_migrations').get() as {
			v: number;
		}
	).v;

	const record = db.prepare('INSERT INTO applied_migrations (version, name) VALUES (?, ?)');

	for (const m of [...MIGRATIONS].sort((a, b) => a.version - b.version)) {
		if (m.version <= current) continue;
		db.transaction(() => {
			m.up(db);
			record.run(m.version, m.name);
		})();
		console.log(`[migrations] applied v${m.version} (${m.name})`);
	}
}
