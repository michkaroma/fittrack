// src/hooks.server.ts — garde d'accès (cookie session) + init de la base au démarrage.
import type { Handle, ServerInit } from '@sveltejs/kit';
import { redirect, error } from '@sveltejs/kit';
import { SESSION_COOKIE, verifySession, passwordConfigured } from '$lib/server/auth';
import { initDb } from '$lib/server/db';
import { env } from '$lib/server/env';

const PUBLIC_EXACT = new Set<string>([
	'/login',
	'/manifest.webmanifest',
	'/sw.js',
	'/offline.html',
	'/favicon.png',
	'/robots.txt'
]);
const PUBLIC_PREFIX = ['/api/auth/', '/_app/', '/icons/'];

function isPublic(pathname: string): boolean {
	return PUBLIC_EXACT.has(pathname) || PUBLIC_PREFIX.some((p) => pathname.startsWith(p));
}

export const init: ServerInit = async () => {
	initDb();
	if (!passwordConfigured()) {
		console.warn(
			'[fittrack] ⚠ APP_PASSWORD non configuré (vide ou placeholder) : toute connexion est REFUSÉE tant qu’un mot de passe fort n’est pas défini dans .env, puis « docker compose up -d ».'
		);
	}
	if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 16) {
		console.warn(
			'[fittrack] ⚠ SESSION_SECRET faible ou absent : les sessions risquent de ne pas survivre à un redémarrage. Générer avec « openssl rand -hex 32 ».'
		);
	}
};

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	const authed = verifySession(event.cookies.get(SESSION_COOKIE), Date.now());
	event.locals.authed = authed;

	if (!authed && !isPublic(pathname)) {
		if (pathname.startsWith('/api/')) throw error(401, 'Non authentifié');
		throw redirect(303, `/login?redirectTo=${encodeURIComponent(pathname + event.url.search)}`);
	}

	return resolve(event);
};
