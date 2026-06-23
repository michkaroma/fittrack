<script lang="ts">
	import '../app.css';
	import type { LayoutData } from './$types';
	import { page } from '$app/stores';
	import AppHeader from '$lib/components/layout/AppHeader.svelte';
	import BottomNav from '$lib/components/layout/BottomNav.svelte';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	const showShell = $derived(data.authed && $page.url.pathname !== '/login');
</script>

{#if showShell}
	<div class="mx-auto flex min-h-dvh max-w-[520px] flex-col">
		<AppHeader />
		<main class="flex-1 px-4 pb-nav pt-3">
			{@render children()}
		</main>
		<BottomNav />
	</div>
{:else}
	{@render children()}
{/if}
