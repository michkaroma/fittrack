// src/lib/server/export.ts — génère le rapport Markdown destiné à une IA / un pro.
// Contenu : en-tête + légende des colonnes & unités, résumé (dernières valeurs,
// moyennes/min/max, progression vers objectifs), puis l'historique complet.
import type { Entry, Goals, MetricField } from '../types';
import { derive, stat } from '../metrics';

const f1 = (n: number | null | undefined): string =>
	n == null || !Number.isFinite(n) ? '—' : n.toFixed(1);
const f0 = (n: number | null | undefined): string =>
	n == null || !Number.isFinite(n) ? '—' : Math.round(n).toString();
/** Écart signé (cible − actuel) avec signe explicite. */
const signed = (n: number, decimals = 1): string =>
	`${n > 0 ? '+' : ''}${n.toFixed(decimals)}`;

interface SummaryRow {
	label: string;
	field: MetricField;
	fmt: (n: number | null) => string;
	unit: string;
}
const SUMMARY_ROWS: SummaryRow[] = [
	{ label: 'Poids', field: 'weight_kg', fmt: f1, unit: 'kg' },
	{ label: 'Masse grasse', field: 'body_fat_pct', fmt: f1, unit: '%' },
	{ label: 'Masse musculaire', field: 'muscle_pct', fmt: f1, unit: '%' },
	{ label: 'Calories', field: 'calories', fmt: f0, unit: 'kcal' },
	{ label: 'Protéines', field: 'protein_g', fmt: f0, unit: 'g' },
	{ label: 'Lipides', field: 'fat_g', fmt: f0, unit: 'g' },
	{ label: 'Glucides', field: 'carbs_g', fmt: f0, unit: 'g' }
];

export function buildMarkdown(
	entries: Entry[],
	goals: Goals,
	opts: { periodLabel: string; generatedAt: string }
): string {
	const out: string[] = [];
	const n = entries.length;

	out.push('# FitTrack — Export');
	out.push('');
	out.push(
		`Généré le ${opts.generatedAt} · Période : **${opts.periodLabel}** · ${n} jour${n > 1 ? 's' : ''} saisi${n > 1 ? 's' : ''}.`
	);
	out.push('');
	out.push(
		'> Journal personnel de composition corporelle et de nutrition. Les calories saisies et ' +
			'les macronutriments sont des données **indépendantes** (les calories ne sont pas recalculées ' +
			'à partir des macros). Cette application ne fournit aucune recommandation.'
	);
	out.push('');

	// ── Légende ────────────────────────────────────────────────────────────
	out.push('## Légende des colonnes');
	out.push('');
	out.push('| Colonne | Signification | Unité |');
	out.push('| --- | --- | --- |');
	out.push('| Date | Jour de la mesure | AAAA-MM-JJ |');
	out.push('| Poids | Masse corporelle saisie | kg |');
	out.push('| MG % | Masse grasse saisie | % du poids |');
	out.push('| Musc % | Masse musculaire saisie | % du poids |');
	out.push('| MG kg | Masse grasse = poids × MG%/100 *(calculé)* | kg |');
	out.push(
		'| Maigre kg | Masse maigre (fat-free) = poids × (1 − MG%/100), inclut os/eau/organes *(calculé)* | kg |'
	);
	out.push('| Musc kg | Masse musculaire = poids × Musc%/100 *(calculé)* | kg |');
	out.push('| kcal | Calories saisies (indépendantes des macros) | kcal |');
	out.push('| P / L / G (g) | Protéines / Lipides / Glucides saisis | g |');
	out.push(
		'| P / L / G (%) | Part de chaque macro dans les kcal issues des macros (P·4, G·4, L·9) *(calculé)* | % |'
	);
	out.push('');
	out.push(
		'> Masse maigre et masse musculaire sont **distinctes** : la masse maigre inclut os, eau et organes ; ' +
			'la masse musculaire en est un sous-ensemble.'
	);
	out.push('');

	// ── Résumé ─────────────────────────────────────────────────────────────
	out.push('## Résumé');
	out.push('');
	out.push('### Dernières valeurs');
	out.push('');
	if (n === 0) {
		out.push('_Aucune donnée sur la période._');
	} else {
		for (const r of SUMMARY_ROWS) {
			const s = stat(entries, r.field);
			if (s.last != null) out.push(`- **${r.label}** : ${r.fmt(s.last)} ${r.unit} _(le ${s.lastDate})_`);
		}
	}
	out.push('');

	out.push('### Moyennes / min / max sur la période');
	out.push('');
	out.push('| Mesure | Moyenne | Min | Max | n |');
	out.push('| --- | --- | --- | --- | --- |');
	for (const r of SUMMARY_ROWS) {
		const s = stat(entries, r.field);
		out.push(
			`| ${r.label} (${r.unit}) | ${r.fmt(s.avg)} | ${r.fmt(s.min)} | ${r.fmt(s.max)} | ${s.count} |`
		);
	}
	out.push('');

	// ── Progression vers objectifs ───────────────────────────────────────────
	out.push('### Progression vers les objectifs');
	out.push('');
	const hasGoals = goals.target_weight_kg != null || goals.target_body_fat_pct != null;
	if (!hasGoals) {
		out.push('_Aucun objectif défini._');
	} else {
		if (goals.target_weight_kg != null) {
			const cur = stat(entries, 'weight_kg').last;
			const line =
				cur == null
					? `- **Poids** — cible ${f1(goals.target_weight_kg)} kg (aucune mesure sur la période).`
					: `- **Poids** — cible ${f1(goals.target_weight_kg)} kg · actuel ${f1(cur)} kg · écart ${signed(goals.target_weight_kg - cur)} kg.`;
			out.push(line);
		}
		if (goals.target_body_fat_pct != null) {
			const cur = stat(entries, 'body_fat_pct').last;
			const line =
				cur == null
					? `- **Masse grasse** — cible ${f1(goals.target_body_fat_pct)} % (aucune mesure sur la période).`
					: `- **Masse grasse** — cible ${f1(goals.target_body_fat_pct)} % · actuel ${f1(cur)} % · écart ${signed(goals.target_body_fat_pct - cur)} pts.`;
			out.push(line);
		}
	}
	out.push('');

	// ── Historique complet ─────────────────────────────────────────────────
	out.push('## Historique');
	out.push('');
	out.push(
		'| Date | Poids | MG % | Musc % | MG kg | Maigre kg | Musc kg | kcal | P g | L g | G g | P % | L % | G % |'
	);
	out.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
	for (const e of entries) {
		const d = derive(e);
		out.push(
			`| ${e.date} | ${f1(e.weight_kg)} | ${f1(e.body_fat_pct)} | ${f1(e.muscle_pct)} | ` +
				`${f1(d.fatMassKg)} | ${f1(d.fatFreeMassKg)} | ${f1(d.muscleMassKg)} | ` +
				`${f0(e.calories)} | ${f0(e.protein_g)} | ${f0(e.fat_g)} | ${f0(e.carbs_g)} | ` +
				`${f1(d.macros?.proteinPct ?? null)} | ${f1(d.macros?.fatPct ?? null)} | ${f1(d.macros?.carbsPct ?? null)} |`
		);
	}
	if (n === 0) out.push('| _aucune donnée_ | | | | | | | | | | | | | |');
	out.push('');

	return out.join('\n');
}
