import type { RequestHandler } from './$types';
import { listEntries, getGoals, localDate } from '$lib/server/db';
import { parsePeriod, periodFrom, periodLabel } from '$lib/server/period';
import { buildMarkdown } from '$lib/server/export';

function stamp(d: Date): string {
	const p = (n: number) => String(n).padStart(2, '0');
	return `${localDate(d)} à ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export const GET: RequestHandler = ({ url }) => {
	const period = parsePeriod(url.searchParams.get('period'));
	const entries = listEntries({ from: periodFrom(period) });
	const goals = getGoals();
	const now = new Date();
	const md = buildMarkdown(entries, goals, {
		periodLabel: periodLabel(period),
		generatedAt: stamp(now)
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
