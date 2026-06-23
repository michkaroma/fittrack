<script lang="ts">
	let {
		label,
		value = null,
		unit = '',
		delta = null,
		format = (n: number) => n.toFixed(1),
		big = false
	}: {
		label: string;
		value?: number | null;
		unit?: string;
		delta?: number | null;
		format?: (n: number) => string;
		big?: boolean;
	} = $props();

	const dir = $derived(delta == null ? 0 : delta > 0 ? 1 : delta < 0 ? -1 : 0);
</script>

<div class="card">
	<span class="eyebrow">{label}</span>
	{#if value == null}
		<p class="mt-1.5 {big ? 'stat-hero' : 'stat-num'} text-muted">—</p>
	{:else}
		<p class="mt-1.5 {big ? 'stat-hero' : 'stat-num'}">
			{format(value)}{#if unit}<span class="ml-1 align-baseline text-[13px] font-medium text-muted"
					>{unit}</span
				>{/if}
		</p>
	{/if}

	{#if delta != null && dir !== 0}
		<span
			class="mt-1.5 inline-flex items-center gap-1 font-num text-[14px] font-semibold tabular-nums {dir > 0
				? 'text-up'
				: 'text-down'}"
			aria-label={`Variation ${dir > 0 ? 'en hausse de' : 'en baisse de'} ${format(Math.abs(delta))} ${unit} par rapport à la mesure précédente`}
		>
			<span aria-hidden="true">{dir > 0 ? '▲' : '▼'}</span>
			{dir > 0 ? '+' : '−'}{format(Math.abs(delta))}
			{#if unit}<span class="text-muted">{unit}</span>{/if}
		</span>
	{:else if delta != null}
		<span class="mt-1.5 inline-block text-[13px] text-muted">stable</span>
	{:else}
		<span class="mt-1.5 inline-block text-[13px] text-transparent" aria-hidden="true">.</span>
	{/if}
</div>
