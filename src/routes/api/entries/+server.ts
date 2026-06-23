import type { RequestHandler } from './$types';
import { listEntries, upsertEntry } from '$lib/server/db';
import { parsePeriod, periodFrom } from '$lib/server/period';
import { ok, fail } from '$lib/server/respond';
import { validateEntryInput, isValidDate } from '$lib/server/schemas';

export const GET: RequestHandler = ({ url }) => {
	const periodParam = url.searchParams.get('period');
	if (periodParam) {
		return ok({ entries: listEntries({ from: periodFrom(parsePeriod(periodParam)) }) });
	}
	const from = url.searchParams.get('from') ?? undefined;
	const to = url.searchParams.get('to') ?? undefined;
	if (from && !isValidDate(from)) return fail('BAD_DATE', 'Paramètre « from » invalide.', 400);
	if (to && !isValidDate(to)) return fail('BAD_DATE', 'Paramètre « to » invalide.', 400);
	return ok({ entries: listEntries({ from, to }) });
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const v = validateEntryInput(body);
	if (!v.ok) return fail('VALIDATION', v.message, 400);
	const entry = upsertEntry(v.value);
	return ok({ entry });
};
