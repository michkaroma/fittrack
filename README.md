# FitTrack 📈

Journal **personnel, mono-utilisateur** de composition corporelle et de nutrition.
Je saisis moi-même mes mesures (balance à impédance + app de tracking) ; FitTrack se
contente de **stocker, calculer, visualiser et exporter**. Il ne fournit **aucune
recommandation**. **PWA installable** sur mobile, interface **en français**, derrière un
reverse proxy HTTPS (tunnel Cloudflare).

## Saisie (un enregistrement par jour, modifiable, tous champs facultatifs)

Poids (kg) · Masse grasse (%) · Masse musculaire (%) · Calories (kcal) · Protéines / Lipides /
Glucides (g). Les **calories saisies et les macros sont indépendantes** : les calories ne sont
jamais recalculées à partir des macros.

## Métriques calculées

- Masse grasse (kg) = poids × %MG/100
- Masse maigre / fat-free (kg) = poids × (1 − %MG/100) — inclut os/eau/organes
- Masse musculaire (kg) = poids × %muscle/100 — **distincte** de la masse maigre
- Moyenne glissante 7 j (poids et MG %), en surimpression
- Répartition macros en % des kcal issues des macros (P·4, G·4, L·9)

## Stack

SvelteKit 2 · Svelte 5 (runes) · TypeScript strict · SQLite (`better-sqlite3`, migrations
auto-appliquées au démarrage) · TailwindCSS v3 · PWA (`@vite-pwa/sveltekit`) ·
`@sveltejs/adapter-node`. Graphiques SVG faits main (aucune librairie de charts).

## Configuration (`.env`)

| Variable | Rôle |
|---|---|
| `APP_PASSWORD` | Mot de passe d'accès (à définir toi-même) |
| `SESSION_SECRET` | Secret de signature du cookie (`openssl rand -hex 32`) |
| `ORIGIN` | URL publique exacte (CSRF adapter-node) — `https://fittrack.romary.org` |
| `HOST` / `PORT` | Interface/port d'écoute Node — `0.0.0.0` / `3000` dans Docker |
| `DB_PATH` | Chemin du fichier SQLite — `/app/data/fittrack.db` |

```bash
cp .env.example .env
openssl rand -hex 32        # → coller dans SESSION_SECRET
# puis définir APP_PASSWORD
```

## Développement

```bash
npm install
npm run icons     # (re)génère static/icons/* depuis assets/logo-source.svg (sharp)
npm run dev       # http://localhost:5173
npm run check     # vérification TypeScript / Svelte
```

> Le service worker est désactivé en dev. La PWA et le hors-ligne se testent en build/HTTPS.

## Production (Docker)

```bash
docker compose up -d --build      # publie sur 127.0.0.1:8084 (interne 3000)
```

La base vit dans `./data/fittrack.db` (volume monté, **hors git**, à sauvegarder).
`ORIGIN` doit correspondre **exactement** à l'URL HTTPS publique (sinon les POST échouent —
protection CSRF d'adapter-node). Le cookie de session est `HttpOnly` + `Secure` +
`SameSite=Lax` et fonctionne derrière le proxy HTTPS de Cloudflare.

### Tunnel Cloudflare

Ajouter dans `/etc/cloudflared/config.yml` une règle d'ingress
`fittrack.romary.org → http://localhost:8084` **avant** le catch-all `http_status:404`, puis :

```bash
cloudflared tunnel route dns <TUNNEL_ID> fittrack.romary.org
sudo systemctl restart cloudflared
```

### Sauvegarde

La base est sauvegardée via `sqlite3 .backup` (jamais `cp` à chaud) + copie du `.env`,
en miroir de l'entrée HabitQuest de `/usr/local/bin/backup.sh`.

## Sécurité

Application publique protégée par mot de passe (un seul utilisateur). Toutes les routes et
endpoints API sont gardés par `hooks.server.ts` ; seules la page de connexion et les assets
PWA sont publics. Le mot de passe vient de `APP_PASSWORD` et n'est jamais affiché en clair.

- **Fail-closed** : tant que `APP_PASSWORD` est vide ou laissé au placeholder, **toute connexion
  est refusée** (un avertissement est logué au démarrage). Définis un mot de passe fort, puis
  `docker compose up -d`.
- **Sessions** : cookie HMAC sans état, valable 90 jours. La déconnexion efface le cookie côté
  navigateur mais ne révoque pas un jeton déjà capturé : pour invalider **toutes** les sessions,
  change `SESSION_SECRET` (ou `APP_PASSWORD`) et redéploie.
- **Conteneur non-root** : le service tourne en utilisateur `node` (uid 1000). Le volume hôte
  `./data` doit lui appartenir : `sudo chown -R 1000:1000 data`.
- **Service worker** : ne met en cache **aucune** donnée personnelle (pages, `/api`) — uniquement
  les assets statiques. Bumper `VERSION` dans `static/sw.js` à chaque release pour purger les
  anciens caches.
