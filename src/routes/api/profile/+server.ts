import type { RequestHandler } from './$types';
import { getProfile, setProfile } from '$lib/server/db';
import { ok, fail } from '$lib/server/respond';
import { validateProfileInput } from '$lib/server/schemas';

export const GET: RequestHandler = () => {
	return ok({ profile: getProfile() });
};

export const PUT: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const v = validateProfileInput(body);
	if (!v.ok) return fail('VALIDATION', v.message, 400);
	return ok({ profile: setProfile(v.value) });
};
