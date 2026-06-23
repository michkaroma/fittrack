import type { PageServerLoad } from './$types';
import { listEntries } from '$lib/server/db';

export const load: PageServerLoad = () => {
	return { entries: listEntries().reverse() };
};
