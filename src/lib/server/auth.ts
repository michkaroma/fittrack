// src/lib/server/auth.ts
// Mono-utilisateur : un seul APP_PASSWORD. Session = cookie signé HMAC,
// auto-validant et auto-expirant (pas de table de session, pas de lib JWT).
import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import { env } from '$env/dynamic/private';

// Clé aléatoire par démarrage : utilisée UNIQUEMENT si ni SESSION_SECRET ni
// APP_PASSWORD ne sont configurés. Évite toute clé « par défaut » connue
// (les sessions ne survivent alors pas à un redémarrage — comportement voulu).
const FALLBACK_SECRET = randomBytes(32).toString('hex');

const COOKIE_NAME = 'ft_session';
const MAX_AGE = 60 * 60 * 24 * 90; // 90 jours

export const SESSION_COOKIE = COOKIE_NAME;
export const SESSION_MAX_AGE = MAX_AGE;

/** Clé HMAC : SESSION_SECRET si défini, sinon dérivée de APP_PASSWORD
 *  (changer le mot de passe invalide alors toutes les sessions). */
function secret(): string {
	const explicit = env.SESSION_SECRET;
	if (explicit && explicit.length >= 8) return explicit;
	const pw = env.APP_PASSWORD;
	if (pw && pw.length > 0) return pw + '::ft-session-v1';
	return FALLBACK_SECRET;
}

/** token = base64url(issuedAt) . base64url(hmac) */
export function signSession(now: number): string {
	const p = Buffer.from(String(now)).toString('base64url');
	const sig = createHmac('sha256', secret()).update(p).digest('base64url');
	return `${p}.${sig}`;
}

export function verifySession(token: string | undefined, now: number): boolean {
	if (!token) return false;
	const [p, sig] = token.split('.');
	if (!p || !sig) return false;
	const expected = createHmac('sha256', secret()).update(p).digest('base64url');
	const a = Buffer.from(sig);
	const b = Buffer.from(expected);
	if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
	const issuedAt = Number(Buffer.from(p, 'base64url').toString('utf8'));
	if (!Number.isFinite(issuedAt)) return false;
	if (now - issuedAt > MAX_AGE * 1000) return false;
	return true;
}

// Valeur placeholder de .env.example : publique, donc ne doit JAMAIS authentifier.
const PLACEHOLDER_PASSWORD = 'change-moi-en-un-mot-de-passe-fort';

/** Le mot de passe est-il réellement configuré (non vide ET non placeholder) ? */
export function passwordConfigured(): boolean {
	const pw = env.APP_PASSWORD ?? '';
	return pw.length > 0 && pw !== PLACEHOLDER_PASSWORD;
}

/** Comparaison à temps constant du mot de passe. Fail-closed : tant qu'aucun vrai
 *  mot de passe n'est défini (vide ou placeholder), AUCUNE connexion n'est acceptée. */
export function passwordMatches(input: string): boolean {
	if (!passwordConfigured() || input.length === 0) return false;
	const expected = env.APP_PASSWORD;
	const a = Buffer.from(input);
	const b = Buffer.from(expected);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}
