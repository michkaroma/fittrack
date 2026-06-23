/* FitTrack — service worker écrit à la main (Cache API native, aucune dépendance).
   PRIVACY-FIRST : on ne met JAMAIS en cache de données personnelles (pages rendues,
   réponses /api). Seuls les assets statiques content-hashés (build, icônes, polices,
   images) sont mis en cache. Les navigations vont au réseau ; hors-ligne → page
   générique. Bumper VERSION à chaque release pour purger les anciens caches. */
const VERSION = 'v1';
const ASSET_CACHE = `ft-assets-${VERSION}`;
const SHELL_CACHE = `ft-shell-${VERSION}`;
const OFFLINE_URL = '/offline.html';
const KEEP = [ASSET_CACHE, SHELL_CACHE];

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(SHELL_CACHE);
			await cache.add(OFFLINE_URL);
			await self.skipWaiting();
		})()
	);
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

async function cacheFirst(request) {
	const cache = await caches.open(ASSET_CACHE);
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
		event.respondWith(cacheFirst(request));
		return;
	}

	// au-delà : même origine uniquement
	if (url.origin !== self.location.origin) return;

	// assets de build / icônes (content-hashés, non sensibles) → cache d'abord
	if (url.pathname.startsWith('/_app/') || url.pathname.startsWith('/icons/')) {
		event.respondWith(cacheFirst(request));
		return;
	}

	// navigations : réseau uniquement (aucune page perso mise en cache) ; hors-ligne →
	// page générique. On reconstruit la réponse si elle a été redirigée (ex. 303 → /login)
	// pour éviter l'erreur « a redirected response was used ».
	if (request.mode === 'navigate') {
		event.respondWith(
			(async () => {
				try {
					const res = await fetch(request);
					if (res.redirected) {
						const body = await res.blob();
						return new Response(body, {
							status: res.status,
							statusText: res.statusText,
							headers: res.headers
						});
					}
					return res;
				} catch {
					const cache = await caches.open(SHELL_CACHE);
					return (
						(await cache.match(OFFLINE_URL)) ||
						new Response('Hors ligne.', {
							status: 503,
							headers: { 'content-type': 'text/plain; charset=utf-8' }
						})
					);
				}
			})()
		);
	}
	// tout le reste (pages avec query-string, /api/*) → réseau natif, jamais mis en cache
});
