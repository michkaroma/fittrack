import type { RequestHandler } from './$types';
import { getEntry, deleteEntry } from '$lib/server/db';
import { ok, fail } from '$lib/server/respond';
import { isValidDate } from '$lib/server/schemas';

export const GET: RequestHandler = ({ params }) => {
	if (!isValidDate(params.date)) return fail('BAD_DATE', 'Date invalide.', 400);
	return ok({ entry: getEntry(params.date) });
};

export const DELETE: RequestHandler = ({ params }) => {
	if (!isValidDate(params.date)) return fail('BAD_DATE', 'Date invalide.', 400);
	const removed = deleteEntry(params.date);
	return ok({ ok: true, removed });
};
