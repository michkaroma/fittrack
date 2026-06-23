// src/lib/server/env.ts — config runtime ($env/dynamic/private, lue sans rebuild).
import { env as dyn } from '$env/dynamic/private';

export const env = {
	APP_PASSWORD: dyn.APP_PASSWORD ?? '',
	SESSION_SECRET: dyn.SESSION_SECRET ?? '',
	ORIGIN: dyn.ORIGIN ?? 'http://localhost:5173',
	DB_PATH: dyn.DB_PATH ?? './data/fittrack.db'
} as const;
