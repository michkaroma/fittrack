import type { RequestHandler } from './$types';
import { getEntry, deleteEntry } from '$lib/server/db';
import { ok, fail } from '$lib/server/respond';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const GET: RequestHandler = ({ params }) => {
	if (!DATE_RE.test(params.date)) return fail('BAD_DATE', 'Date invalide.', 400);
	return ok({ entry: getEntry(params.date) });
};

export const DELETE: RequestHandler = ({ params }) => {
	if (!DATE_RE.test(params.date)) return fail('BAD_DATE', 'Date invalide.', 400);
	const removed = deleteEntry(params.date);
	return ok({ ok: true, removed });
};
