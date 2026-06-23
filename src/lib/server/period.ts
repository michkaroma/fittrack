// src/lib/server/period.ts — conversion période → intervalle de dates + libellé.
// Partagé par le dashboard (load) et l'export.
import type { Period } from '../types';
import { localDate } from './db';

export function parsePeriod(v: string | null | undefined): Period {
	return v === '7' || v === '30' || v === '90' || v === 'all' ? v : '30';
}

/** Date de début (incluse) de la période, ou undefined pour « tout ». */
export function periodFrom(period: Period, today: string = localDate()): string | undefined {
	if (period === 'all') return undefined;
	const days = period === '7' ? 7 : period === '30' ? 30 : 90;
	const [y, m, d] = today.split('-').map(Number);
	const dt = new Date(Date.UTC(y, m - 1, d));
	dt.setUTCDate(dt.getUTCDate() - (days - 1));
	const yy = dt.getUTCFullYear();
	const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
	const dd = String(dt.getUTCDate()).padStart(2, '0');
	return `${yy}-${mm}-${dd}`;
}

export function periodLabel(period: Period): string {
	switch (period) {
		case '7':
			return '7 derniers jours';
		case '30':
			return '30 derniers jours';
		case '90':
			return '90 derniers jours';
		default:
			return "Tout l'historique";
	}
}
