<script lang="ts">
	import {
		toneColor,
		dashArray,
		linePath,
		smoothPath,
		areaPath,
		niceTicks,
		xDomain,
		shortDate,
		type XY,
		type Tone,
		type Dash
	} from '$lib/charts';
	import { dayNumber, type Point } from '$lib/metrics';

	interface LineSeries {
		label?: string;
		points: Point[];
		tone: Tone;
		dash?: Dash;
		width?: number;
		area?: boolean;
		smooth?: boolean;
		markers?: boolean;
	}

	let {
		series = [],
		target = null,
		height = 200,
		unit = '',
		format = (n: number) => n.toFixed(1),
		showLegend = false,
		latestMarker = true,
		ariaLabel = 'Graphique'
	}: {
		series: LineSeries[];
		target?: { value: number; label: string } | null;
		height?: number;
		unit?: string;
		format?: (n: number) => string;
		showLegend?: boolean;
		latestMarker?: boolean;
		ariaLabel?: string;
	} = $props();

	let w = $state(0);
	let hoverIdx = $state<number | null>(null);

	const padL = 40;
	const padR = 12;
	const padT = 10;
	const padB = 22;

	const model = $derived.by(() => {
		const plotW = Math.max(0, w - padL - padR);
		const plotH = Math.max(0, height - padT - padB);

		const dateSet = new Set<string>();
		const allValues: number[] = [];
		for (const s of series)
			for (const p of s.points) {
				dateSet.add(p.date);
				allValues.push(p.value);
			}
		if (target) allValues.push(target.value);
		const dates = [...dateSet].sort();
		const hasData = allValues.length > 0 && dates.length > 0 && plotW > 0 && plotH > 0;

		const xd = xDomain(dates);
		const vmin = allValues.length ? Math.min(...allValues) : 0;
		const vmax = allValues.length ? Math.max(...allValues) : 1;
		const ticks = niceTicks(vmin, vmax, 4);
		const ymin = ticks.length ? ticks[0] : vmin;
		const ymax = ticks.length ? ticks[ticks.length - 1] : vmax;

		const xs = (day: number) =>
			padL + (xd.max === xd.min ? plotW / 2 : ((day - xd.min) / (xd.max - xd.min)) * plotW);
		const ys = (v: number) =>
			padT + (ymax === ymin ? plotH / 2 : (1 - (v - ymin) / (ymax - ymin)) * plotH);
		const baselineY = padT + plotH;

		const sxy = series.map((s) => {
			const xy: XY[] = s.points.map((p) => ({ x: xs(dayNumber(p.date)), y: ys(p.value) }));
			const valueByDate = new Map(s.points.map((p) => [p.date, p.value] as const));
			return { s, xy, valueByDate };
		});

		const xticks = dates.map((d) => ({ date: d, x: xs(dayNumber(d)) }));

		// libellés d'axe X : premier, dernier, et milieu si la place le permet
		const xlabels: { date: string; x: number }[] = [];
		if (xticks.length) {
			xlabels.push(xticks[0]);
			if (plotW > 200 && xticks.length > 2) xlabels.push(xticks[Math.floor(xticks.length / 2)]);
			if (xticks.length > 1) xlabels.push(xticks[xticks.length - 1]);
		}

		return {
			plotW,
			plotH,
			hasData,
			ymin,
			ymax,
			ticks,
			xs,
			ys,
			baselineY,
			sxy,
			dates,
			xticks,
			xlabels,
			gridLeft: padL,
			gridRight: padL + plotW
		};
	});

	// dernier point de la série « accent » (ou première série) pour le marqueur final
	const latest = $derived.by(() => {
		const idx = series.findIndex((s) => s.tone === 'accent');
		const i = idx >= 0 ? idx : 0;
		const xy = model.sxy[i]?.xy ?? [];
		return xy.length ? xy[xy.length - 1] : null;
	});

	const hoverDate = $derived(hoverIdx != null ? (model.dates[hoverIdx] ?? null) : null);
	const hoverX = $derived(hoverIdx != null ? (model.xticks[hoverIdx]?.x ?? null) : null);

	function onMove(e: PointerEvent) {
		if (!model.hasData) return;
		const el = e.currentTarget as SVGRectElement;
		const rect = el.getBoundingClientRect();
		if (rect.width === 0) return;
		const px = ((e.clientX - rect.left) / rect.width) * w;
		let best = 0;
		let bestd = Infinity;
		for (let i = 0; i < model.xticks.length; i++) {
			const d = Math.abs(model.xticks[i].x - px);
			if (d < bestd) {
				bestd = d;
				best = i;
			}
		}
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
	{#if showLegend && series.some((s) => s.label)}
		<div class="mb-2 flex flex-wrap gap-x-4 gap-y-1">
			{#each series as s}
				{#if s.label}
					<span class="inline-flex items-center gap-1.5 text-[11px] text-ink2">
						<svg width="16" height="8" viewBox="0 0 16 8" aria-hidden="true">
							<line
								x1="0"
								y1="4"
								x2="16"
								y2="4"
								stroke={toneColor(s.tone)}
								stroke-width={s.width ?? 2}
								stroke-dasharray={dashArray(s.dash)}
								stroke-linecap="round"
							/>
						</svg>
						{s.label}
					</span>
				{/if}
			{/each}
		</div>
	{/if}

	{#if w > 0}
		<svg
			width={w}
			{height}
			viewBox={`0 0 ${w} ${height}`}
			role="img"
			aria-label={ariaLabel}
			class="block touch-pan-y select-none"
		>
			{#if model.hasData}
				<defs>
					<linearGradient id="areaAccent" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stop-color="rgb(var(--c-accent))" stop-opacity="0.16" />
						<stop offset="100%" stop-color="rgb(var(--c-accent))" stop-opacity="0" />
					</linearGradient>
				</defs>

				<!-- grille horizontale -->
				{#each model.ticks as t}
					{@const y = model.ys(t)}
					<line
						x1={model.gridLeft}
						y1={y}
						x2={model.gridRight}
						y2={y}
						stroke="rgb(var(--c-border))"
						stroke-opacity={t === model.ymin ? 1 : 0.55}
						stroke-width="1"
					/>
					<text
						x={model.gridLeft - 6}
						y={y + 3}
						text-anchor="end"
						class="fill-muted"
						style="font-size:10px;font-variant-numeric:tabular-nums"
					>
						{format(t)}
					</text>
				{/each}

				<!-- aires -->
				{#each model.sxy as item}
					{#if item.s.area}
						<path
							d={areaPath(item.xy, model.baselineY)}
							fill="url(#areaAccent)"
							stroke="none"
						/>
					{/if}
				{/each}

				<!-- lignes -->
				{#each model.sxy as item}
					<path
						d={item.s.smooth ? smoothPath(item.xy) : linePath(item.xy)}
						fill="none"
						stroke={toneColor(item.s.tone)}
						stroke-width={item.s.width ?? 2}
						stroke-dasharray={dashArray(item.s.dash)}
						stroke-linecap="round"
						stroke-linejoin="round"
						vector-effect="non-scaling-stroke"
					/>
					{#if item.s.markers}
						{#each item.xy as p}
							<circle cx={p.x} cy={p.y} r="2.5" fill={toneColor(item.s.tone)} />
						{/each}
					{/if}
				{/each}

				<!-- ligne cible -->
				{#if target}
					{@const ty = model.ys(target.value)}
					<line
						x1={model.gridLeft}
						y1={ty}
						x2={model.gridRight}
						y2={ty}
						stroke="rgb(var(--c-text-2))"
						stroke-width="1"
						stroke-dasharray="4 4"
						stroke-opacity="0.75"
					/>
					<text
						x={model.gridRight}
						y={ty - 4}
						text-anchor="end"
						class="fill-muted"
						style="font-size:10px;letter-spacing:0.06em;font-variant-numeric:tabular-nums"
					>
						{target.label}
					</text>
				{/if}

				<!-- marqueur du dernier point -->
				{#if latestMarker && latest}
					<circle cx={latest.x} cy={latest.y} r="6" fill="rgb(var(--c-bg))" />
					<circle cx={latest.x} cy={latest.y} r="3.5" fill="rgb(var(--c-accent))" />
				{/if}

				<!-- crosshair + points au survol -->
				{#if hoverX != null && hoverDate}
					<line
						x1={hoverX}
						y1={padT}
						x2={hoverX}
						y2={model.baselineY}
						stroke="rgb(var(--c-border))"
						stroke-width="1"
					/>
					{#each model.sxy as item}
						{#if item.valueByDate.has(hoverDate)}
							{@const v = item.valueByDate.get(hoverDate)}
							{#if v != null}
								<circle
									cx={hoverX}
									cy={model.ys(v)}
									r="3"
									fill="rgb(var(--c-bg))"
									stroke={toneColor(item.s.tone)}
									stroke-width="1.5"
								/>
							{/if}
						{/if}
					{/each}
				{/if}

				<!-- libellés axe X -->
				{#each model.xlabels as l}
					<text
						x={l.x}
						y={model.baselineY + 14}
						text-anchor="middle"
						class="fill-muted"
						style="font-size:10px;font-variant-numeric:tabular-nums"
					>
						{shortDate(l.date)}
					</text>
				{/each}

				<!-- zone de capture des évènements pointeur -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<rect
					x={model.gridLeft}
					y={padT}
					width={model.plotW}
					height={model.plotH}
					fill="transparent"
					onpointermove={onMove}
					onpointerdown={onMove}
					onpointerleave={onLeave}
					onpointercancel={onLeave}
				/>
			{:else}
				<text
					x={w / 2}
					y={height / 2}
					text-anchor="middle"
					class="fill-muted"
					style="font-size:12px"
				>
					Aucune donnée sur la période
				</text>
			{/if}
		</svg>

		<!-- tooltip de lecture -->
		{#if hoverDate && hoverX != null}
			<div
				class="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-[8px] border border-border bg-elevated px-2.5 py-1.5 text-[11px] shadow-raised"
				style={`left:${Math.min(Math.max(hoverX, 52), w - 52)}px`}
			>
				<div class="mb-0.5 font-semibold tabular-nums text-ink">{hoverDate}</div>
				{#each model.sxy as item}
					{#if item.valueByDate.has(hoverDate)}
						{@const v = item.valueByDate.get(hoverDate)}
						{#if v != null}
							<div class="flex items-center justify-between gap-3 tabular-nums text-ink2">
								<span class="inline-flex items-center gap-1.5">
									<span
										class="inline-block h-1.5 w-1.5 rounded-full"
										style={`background:${toneColor(item.s.tone)}`}
									></span>
									{item.s.label ?? 'valeur'}
								</span>
								<span class="font-num font-semibold text-ink">{fmtUnit(v)}</span>
							</div>
						{/if}
					{/if}
				{/each}
			</div>
		{/if}
	{:else}
		<div style={`height:${height}px`}></div>
	{/if}
</div>
