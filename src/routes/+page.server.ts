import type { PageServerLoad } from './$types';
import { listEntries, getGoals, localDate } from '$lib/server/db';
import { parsePeriod, periodFrom, periodLabel } from '$lib/server/period';

export const load: PageServerLoad = ({ url }) => {
	const period = parsePeriod(url.searchParams.get('period'));
	const entries = listEntries({ from: periodFrom(period) });
	return {
		period,
		periodLabel: periodLabel(period),
		entries,
		goals: getGoals(),
		today: localDate()
	};
};
