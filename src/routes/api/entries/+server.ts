import type { RequestHandler } from './$types';
import { listEntries, upsertEntry } from '$lib/server/db';
import { parsePeriod, periodFrom } from '$lib/server/period';
import { ok, fail } from '$lib/server/respond';
import { validateEntryInput } from '$lib/server/schemas';

export const GET: RequestHandler = ({ url }) => {
	const from = url.searchParams.get('from') ?? undefined;
	const to = url.searchParams.get('to') ?? undefined;
	const periodParam = url.searchParams.get('period');
	if (periodParam) {
		return ok({ entries: listEntries({ from: periodFrom(parsePeriod(periodParam)) }) });
	}
	return ok({ entries: listEntries({ from, to }) });
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const v = validateEntryInput(body);
	if (!v.ok) return fail('VALIDATION', v.message, 400);
	const entry = upsertEntry(v.value);
	return ok({ entry });
};
