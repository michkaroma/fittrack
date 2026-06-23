import type { PageServerLoad } from './$types';
import { getEntry, listEntries, localDate } from '$lib/server/db';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const load: PageServerLoad = ({ url }) => {
	const today = localDate();
	const param = url.searchParams.get('date');
	const date = param && DATE_RE.test(param) ? param : today;
	const all = listEntries();
	return {
		date,
		today,
		entry: getEntry(date),
		recent: all.slice(-10).reverse()
	};
};
