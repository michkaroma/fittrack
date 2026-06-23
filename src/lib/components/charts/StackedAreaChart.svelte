<script lang="ts">
	import {
		toneColor,
		linePath,
		smoothPath,
		niceTicks,
		xDomain,
		shortDate,
		type XY,
		type Tone
	} from '$lib/charts';
	import { dayNumber, type Point } from '$lib/metrics';

	interface StackSeries {
		label: string;
		tone: Tone;
		hatch?: boolean;
		points: Point[];
	}
	interface OverlaySeries {
		label: string;
		tone: Tone;
		points: Point[];
	}

	let {
		stack = [],
		overlay = null,
		normalize = false,
		height = 200,
		unit = '',
		format = (n: number) => n.toFixed(1),
		ariaLabel = 'Graphique de composition'
	}: {
		stack: StackSeries[];
		overlay?: OverlaySeries | null;
		normalize?: boolean;
		height?: number;
		unit?: string;
		format?: (n: number) => string;
		ariaLabel?: string;
	} = $props();

	let w = $state(0);
	let hoverIdx = $state<number | null>(null);

	const padL = 40;
	const padR = 12;
	const padT = 10;
	const padB = 22;

	function bandFill(tone: Tone, hatch: boolean = false): string {
		if (hatch) return 'url(#hatch)';
		if (tone === 'accent') return 'rgb(var(--c-accent) / 0.85)';
		if (tone === 'bright') return 'rgb(var(--c-text-2) / 0.30)';
		return 'rgb(var(--c-muted) / 0.22)';
	}

	const model = $derived.by(() => {
		const plotW = Math.max(0, w - padL - padR);
		const plotH = Math.max(0, height - padT - padB);

		const maps = stack.map((s) => new Map(s.points.map((p) => [p.date, p.value] as const)));
		// dates où TOUTES les séries empilées sont présentes (co-présentes par construction)
		const dates =
			maps.length === 0
				? []
				: [...maps[0].keys()].filter((d) => maps.every((m) => m.has(d))).sort();

		const hasData = dates.length > 0 && plotW > 0 && plotH > 0;

		// valeurs (éventuellement normalisées à 100) + cumuls par date
		const scaled: number[][] = dates.map((d) => {
			const vals = maps.map((m) => m.get(d) ?? 0);
			if (!normalize) return vals;
			const sum = vals.reduce((a, b) => a + b, 0);
			return sum > 0 ? vals.map((v) => (v / sum) * 100) : vals.map(() => 0);
		});
		const totals = scaled.map((vals) => vals.reduce((a, b) => a + b, 0));

		const overlayPts = overlay?.points ?? [];
		const vmax = normalize
			? 100
			: Math.max(1, ...totals, ...overlayPts.map((p) => p.value));
		const ticks = normalize ? [0, 25, 50, 75, 100] : niceTicks(0, vmax, 4);
		const ymax = normalize ? 100 : (ticks.length ? ticks[ticks.length - 1] : vmax);

		const xd = xDomain([...dates, ...overlayPts.map((p) => p.date)]);
		const xs = (day: number) =>
			padL + (xd.max === xd.min ? plotW / 2 : ((day - xd.min) / (xd.max - xd.min)) * plotW);
		const ys = (v: number) => padT + (1 - v / ymax) * plotH;
		const baselineY = padT + plotH;

		// bandes : pour chaque série, frontières haute/basse cumulées
		const bands = stack.map((s, k) => {
			const top: XY[] = [];
			const bottom: XY[] = [];
			dates.forEach((d, i) => {
				const x = xs(dayNumber(d));
				let lower = 0;
				for (let j = 0; j < k; j++) lower += scaled[i][j];
				const upper = lower + scaled[i][k];
				top.push({ x, y: ys(upper) });
				bottom.push({ x, y: ys(lower) });
			});
			const latestVal = dates.length ? scaled[dates.length - 1][k] : null;
			return { s, top, bottom, latestVal };
		});

		const overlayXY: XY[] = overlayPts.map((p) => ({ x: xs(dayNumber(p.date)), y: ys(p.value) }));
		const overlayMap = new Map(overlayPts.map((p) => [p.date, p.value] as const));

		const xlabels: { date: string; x: number }[] = [];
		if (dates.length) {
			xlabels.push({ date: dates[0], x: xs(dayNumber(dates[0])) });
			if (plotW > 200 && dates.length > 2) {
				const mid = dates[Math.floor(dates.length / 2)];
				xlabels.push({ date: mid, x: xs(dayNumber(mid)) });
			}
			if (dates.length > 1) {
				const last = dates[dates.length - 1];
				xlabels.push({ date: last, x: xs(dayNumber(last)) });
			}
		}

		return {
			plotW,
			plotH,
			hasData,
			ticks,
			ymax,
			xs,
			ys,
			baselineY,
			bands,
			dates,
			scaled,
			overlayXY,
			overlayMap,
			xlabels,
			gridLeft: padL,
			gridRight: padL + plotW,
			maps
		};
	});

	function bandPath(top: XY[], bottom: XY[]): string {
		if (top.length === 0) return '';
		const fwd = top.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
		const back = [...bottom].reverse().map((p) => `L${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
		return `${fwd} ${back} Z`;
	}

	const hoverDate = $derived(hoverIdx != null ? (model.dates[hoverIdx] ?? null) : null);
	const hoverX = $derived(hoverDate ? model.xs(dayNumber(hoverDate)) : null);

	function onMove(e: PointerEvent) {
		if (!model.hasData) return;
		const rect = (e.currentTarget as SVGRectElement).getBoundingClientRect();
		if (rect.width === 0) return;
		const px = ((e.clientX - rect.left) / rect.width) * w;
		let best = 0;
		let bestd = Infinity;
		model.dates.forEach((d, i) => {
			const dd = Math.abs(model.xs(dayNumber(d)) - px);
			if (dd < bestd) {
				bestd = dd;
				best = i;
			}
		});
		hoverIdx = best;
	}
	function onLeave() {
		hoverIdx = null;
	}

	function fmtUnit(v: number): string {
		return unit ? `${format(v)} ${unit}` : format(v);
	}
</script>

<div class="relative w-full" bind:clientWidth={w}>
	<!-- légende -->
	<div class="mb-2 flex flex-wrap gap-x-4 gap-y-1">
		{#each model.bands as b}
			<span class="inline-flex items-center gap-1.5 text-[11px] text-ink2">
				<span
					class="inline-block h-2.5 w-2.5 rounded-[2px]"
					style={`background:${b.s.hatch ? 'rgb(var(--c-muted) / 0.5)' : bandFill(b.s.tone, false)};outline:1px solid ${toneColor(b.s.tone)}`}
				></span>
				{b.s.label}
				{#if b.latestVal != null}<span class="font-num font-semibold tabular-nums text-ink"
						>{fmtUnit(b.latestVal)}</span
					>{/if}
			</span>
		{/each}
		{#if overlay}
			<span class="inline-flex items-center gap-1.5 text-[11px] text-ink2">
				<svg width="16" height="8" viewBox="0 0 16 8" aria-hidden="true">
					<line x1="0" y1="4" x2="16" y2="4" stroke={toneColor(overlay.tone)} stroke-width="2" stroke-linecap="round" />
				</svg>
				{overlay.label}
			</span>
		{/if}
	</div>

	{#if w > 0}
		<svg width={w} {height} viewBox={`0 0 ${w} ${height}`} role="img" aria-label={ariaLabel} class="block touch-pan-y select-none">
			{#if model.hasData}
				<defs>
					<pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
						<rect width="6" height="6" fill="rgb(var(--c-muted) / 0.22)" />
						<line x1="0" y1="0" x2="0" y2="6" stroke="rgb(var(--c-muted) / 0.5)" stroke-width="1.5" />
					</pattern>
				</defs>

				<!-- grille horizontale -->
				{#each model.ticks as t}
					{@const y = model.ys(t)}
					<line x1={model.gridLeft} y1={y} x2={model.gridRight} y2={y} stroke="rgb(var(--c-border))" stroke-opacity={t === 0 ? 1 : 0.55} stroke-width="1" />
					<text x={model.gridLeft - 6} y={y + 3} text-anchor="end" class="fill-muted" style="font-size:10px;font-variant-numeric:tabular-nums">{format(t)}</text>
				{/each}

				<!-- bandes empilées -->
				{#each model.bands as b}
					<path d={bandPath(b.top, b.bottom)} fill={bandFill(b.s.tone, b.s.hatch)} stroke={toneColor(b.s.tone)} stroke-width="1" stroke-linejoin="round" />
				{/each}

				<!-- ligne superposée (muscle) -->
				{#if overlay && model.overlayXY.length}
					<path d={smoothPath(model.overlayXY)} fill="none" stroke={toneColor(overlay.tone)} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
				{/if}

				<!-- crosshair -->
				{#if hoverX != null}
					<line x1={hoverX} y1={padT} x2={hoverX} y2={model.baselineY} stroke="rgb(var(--c-text))" stroke-opacity="0.5" stroke-width="1" />
				{/if}

				<!-- libellés axe X -->
				{#each model.xlabels as l}
					<text x={l.x} y={model.baselineY + 14} text-anchor="middle" class="fill-muted" style="font-size:10px;font-variant-numeric:tabular-nums">{shortDate(l.date)}</text>
				{/each}

				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<rect x={model.gridLeft} y={padT} width={model.plotW} height={model.plotH} fill="transparent" onpointermove={onMove} onpointerdown={onMove} onpointerleave={onLeave} onpointercancel={onLeave} />
			{:else}
				<text x={w / 2} y={height / 2} text-anchor="middle" class="fill-muted" style="font-size:12px">Données insuffisantes</text>
			{/if}
		</svg>

		{#if hoverDate && hoverX != null && hoverIdx != null}
			<div class="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-[8px] border border-border bg-elevated px-2.5 py-1.5 text-[11px] shadow-raised" style={`left:${Math.min(Math.max(hoverX, 56), w - 56)}px`}>
				<div class="mb-0.5 font-semibold tabular-nums text-ink">{hoverDate}</div>
				{#each model.bands as b, k}
					<div class="flex items-center justify-between gap-3 tabular-nums text-ink2">
						<span class="inline-flex items-center gap-1.5">
							<span class="inline-block h-1.5 w-1.5 rounded-full" style={`background:${toneColor(b.s.tone)}`}></span>
							{b.s.label}
						</span>
						<span class="font-num font-semibold text-ink">{fmtUnit(model.scaled[hoverIdx][k])}</span>
					</div>
				{/each}
				{#if overlay && model.overlayMap.has(hoverDate)}
					<div class="flex items-center justify-between gap-3 tabular-nums text-ink2">
						<span class="inline-flex items-center gap-1.5">
							<span class="inline-block h-1.5 w-1.5 rounded-full" style={`background:${toneColor(overlay.tone)}`}></span>
							{overlay.label}
						</span>
						<span class="font-num font-semibold text-ink">{fmtUnit(model.overlayMap.get(hoverDate) ?? 0)}</span>
					</div>
				{/if}
			</div>
		{/if}
	{:else}
		<div style={`height:${height}px`}></div>
	{/if}
</div>
