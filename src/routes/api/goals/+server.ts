import type { RequestHandler } from './$types';
import { getGoals, setGoals } from '$lib/server/db';
import { ok, fail } from '$lib/server/respond';
import { validateGoalsInput } from '$lib/server/schemas';

export const GET: RequestHandler = () => {
	return ok({ goals: getGoals() });
};

export const PUT: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const v = validateGoalsInput(body);
	if (!v.ok) return fail('VALIDATION', v.message, 400);
	return ok({ goals: setGoals(v.value) });
};
