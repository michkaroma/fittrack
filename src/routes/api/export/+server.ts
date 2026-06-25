import type { RequestHandler } from './$types';
import { listEntries, getGoals, getProfile, localDate } from '$lib/server/db';
import { parsePeriod, periodFrom, periodLabel } from '$lib/server/period';
import { buildMarkdown } from '$lib/server/export';

function stamp(d: Date): string {
	const p = (n: number) => String(n).padStart(2, '0');
	return `${localDate(d)} à ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export const GET: RequestHandler = ({ url }) => {
	const period = parsePeriod(url.searchParams.get('period') ?? 'all');
	const entries = listEntries({ from: periodFrom(period) });
	const goals = getGoals();
	const profile = getProfile();
	const now = new Date();
	const md = buildMarkdown(entries, goals, profile, {
		periodLabel: periodLabel(period),
		generatedAt: stamp(now),
		today: localDate(now)
	});
	const filename = `fittrack-${localDate(now)}-${period}.md`;
	return new Response(md, {
		headers: {
			'content-type': 'text/markdown; charset=utf-8',
			'content-disposition': `attachment; filename="${filename}"`,
			'cache-control': 'no-store'
		}
	});
};
