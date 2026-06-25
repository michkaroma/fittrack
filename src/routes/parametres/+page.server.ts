import type { PageServerLoad } from './$types';
import { getGoals, getProfile, listEntries } from '$lib/server/db';
import { stat } from '$lib/metrics';

export const load: PageServerLoad = () => {
	const entries = listEntries();
	return {
		goals: getGoals(),
		profile: getProfile(),
		currentWeight: stat(entries, 'weight_kg').last,
		currentBf: stat(entries, 'body_fat_pct').last
	};
};
