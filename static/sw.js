/* FitTrack — service worker écrit à la main (Cache API native, aucune dépendance).
   Stratégies : navigations & API GET → réseau d'abord (repli cache hors-ligne) ;
   images/polices/assets de build → cache d'abord. */
const VERSION = 'v1';
const PAGE_CACHE = `ft-pages-${VERSION}`;
const API_CACHE = `ft-api-${VERSION}`;
const ASSET_CACHE = `ft-assets-${VERSION}`;
const KEEP = [PAGE_CACHE, API_CACHE, ASSET_CACHE];

self.addEventListener('install', () => {
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys();
			await Promise.all(
				keys.filter((k) => k.startsWith('ft-') && !KEEP.includes(k)).map((k) => caches.delete(k))
			);
			await self.clients.claim();
		})()
	);
});

function fetchWithTimeout(request, ms) {
	if (!ms) return fetch(request);
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error('timeout')), ms);
		fetch(request).then(
			(r) => {
				clearTimeout(timer);
				resolve(r);
			},
			(e) => {
				clearTimeout(timer);
				reject(e);
			}
		);
	});
}

async function networkFirst(request, cacheName, timeoutMs) {
	const cache = await caches.open(cacheName);
	try {
		const fresh = await fetchWithTimeout(request, timeoutMs);
		if (fresh && fresh.ok) cache.put(request, fresh.clone());
		return fresh;
	} catch {
		const cached = await cache.match(request);
		if (cached) return cached;
		throw new Error('offline');
	}
}

async function cacheFirst(request, cacheName) {
	const cache = await caches.open(cacheName);
	const cached = await cache.match(request);
	if (cached) return cached;
	const fresh = await fetch(request);
	if (fresh && (fresh.ok || fresh.type === 'opaque')) cache.put(request, fresh.clone());
	return fresh;
}

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);

	// images / polices (toute origine, ex. Google Fonts) → cache d'abord
	if (request.destination === 'image' || request.destination === 'font') {
		event.respondWith(cacheFirst(request, ASSET_CACHE));
		return;
	}

	// ne gère que la même origine au-delà
	if (url.origin !== self.location.origin) return;

	// navigations : réseau d'abord, repli sur la dernière page connue
	if (request.mode === 'navigate') {
		if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/login')) return;
		event.respondWith(
			(async () => {
				try {
					const fresh = await fetchWithTimeout(request, 3000);
					const cache = await caches.open(PAGE_CACHE);
					if (fresh.ok) cache.put(request, fresh.clone());
					return fresh;
				} catch {
					const cache = await caches.open(PAGE_CACHE);
					return (
						(await cache.match(request)) ||
						(await cache.match('/')) ||
						new Response('Hors ligne.', {
							status: 503,
							headers: { 'content-type': 'text/plain; charset=utf-8' }
						})
					);
				}
			})()
		);
		return;
	}

	// API en lecture : réseau d'abord, repli cache
	if (url.pathname.startsWith('/api/')) {
		event.respondWith(
			networkFirst(request, API_CACHE, 3000).catch(
				() =>
					new Response(JSON.stringify({ error: { code: 'OFFLINE', message: 'Hors ligne.' } }), {
						status: 503,
						headers: { 'content-type': 'application/json' }
					})
			)
		);
		return;
	}

	// assets de build / icônes → cache d'abord
	if (url.pathname.startsWith('/_app/') || url.pathname.startsWith('/icons/')) {
		event.respondWith(cacheFirst(request, ASSET_CACHE));
	}
});
