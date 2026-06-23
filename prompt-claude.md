# Prompt pour Claude Code — FitTrack

> À coller dans une **nouvelle** conversation Claude Code, à la racine du dépôt `fittrack`.

---

Tu travailles sur **FitTrack**, un journal personnel mono-utilisateur (SvelteKit 2, Svelte 5 runes, TypeScript strict, SQLite via `better-sqlite3` avec migrations auto-appliquées, TailwindCSS v3). UI **en français**. Aucune recommandation : l'app stocke, calcule, visualise, exporte.

J'ai deux évolutions à implémenter. Respecte scrupuleusement les conventions existantes (libellés FR, classes Tailwind déjà définies comme `.card` / `.label` / `.eyebrow` / `.seg` / `.seg-tab`, runes Svelte 5, migrations **append-only**). À la fin, lance `npm run check` et corrige toute erreur de typage.

---

## Tâche 1 — Suivre l'effort physique quotidien (échelle 1–5)

Nouveau champ `effort` : entier **1–5**, **nullable** (comme toutes les mesures, un jour peut ne pas le renseigner). Échelle :

| Niveau | Libellé court | Description |
|---|---|---|
| 1 | Repos | journée à la maison, aucune activité |
| 2 | Léger | déplacements à pied, activité du quotidien |
| 3 | Modéré | petite séance de sport, sinon journée calme |
| 4 | Actif | journée active + séance de sport |
| 5 | Intense | grosse séance de sport |

### 1.1 `src/lib/types.ts`
- Ajoute `effort: number | null;` dans l'interface `Entry` **et** dans `EntryInput`.
- Ajoute `| 'effort'` au type `MetricField`.

### 1.2 `src/lib/server/migrations.ts`
Ajoute une **nouvelle** migration en fin de tableau `MIGRATIONS` (ne modifie/renumérote **jamais** la v1) :

```ts
{
  version: 2,
  name: 'add_effort',
  up: (db) => {
    db.exec(/* sql */ `ALTER TABLE entries ADD COLUMN effort INTEGER;`);
  }
}
```

### 1.3 `src/lib/server/db.ts`
- Ajoute `'effort'` au tableau `METRIC_FIELDS` (ainsi un jour où seul l'effort est saisi n'est pas considéré « vide »).
- Dans `upsertEntry`, ajoute `effort` partout dans la requête : colonne de l'`INSERT`, `@effort` dans `VALUES`, `effort = excluded.effort` dans le `ON CONFLICT ... DO UPDATE SET`, et `effort: input.effort` dans l'objet passé à `.run({ ... })`.

### 1.4 `src/lib/server/schemas.ts`
- Ajoute un champ optionnel `int?: boolean` à l'interface `FieldSpec`.
- Ajoute l'entrée `{ key: 'effort', label: 'Effort', min: 1, max: 5, int: true }` au tableau `ENTRY_FIELDS`.
- Dans `validateEntryInput`, ajoute `effort: null` à l'objet `value` initial, et dans la boucle, arrondis les champs entiers :
  ```ts
  value[f.key] = f.int && r.value != null ? Math.round(r.value) : r.value;
  ```
  (remplace l'affectation actuelle `value[f.key] = r.value;`).

### 1.5 `src/lib/components/EntryForm.svelte` — sélecteur tactile 1–5
- Dans `fields` (le `$state`), ajoute `effort: init(entry?.effort)`.
- Dans l'objet `body` de `save()`, ajoute `effort: fields.effort`.
- Dans `<script>`, ajoute :
  ```ts
  const EFFORT_LEVELS: { v: string; desc: string }[] = [
    { v: '1', desc: 'Repos · journée à la maison, aucune activité' },
    { v: '2', desc: 'Léger · déplacements à pied, activité du quotidien' },
    { v: '3', desc: 'Modéré · petite séance de sport, sinon journée calme' },
    { v: '4', desc: 'Actif · journée active + séance de sport' },
    { v: '5', desc: 'Intense · grosse séance de sport' }
  ];
  function pickEffort(v: string) {
    fields.effort = fields.effort === v ? '' : v; // re-toucher le niveau actif = désélection
    saved = false;
  }
  ```
- Ajoute un nouveau `<fieldset>` **après** le groupe « Nutrition » et **avant** le bloc « Aperçu calculé ». Réutilise le contrôle segmenté existant (`.seg` est en `inline-grid auto-cols-fr`, donc les 5 boutons se répartissent à parts égales ; l'état actif se style via `aria-selected="true"`) :
  ```svelte
  <fieldset class="flex flex-col gap-3">
    <legend class="eyebrow mb-1">Activité physique</legend>
    <div class="seg w-full" role="group" aria-label="Niveau d'effort de la journée, de 1 à 5">
      {#each EFFORT_LEVELS as lvl}
        <button
          type="button"
          class="seg-tab"
          aria-selected={fields.effort === lvl.v}
          onclick={() => pickEffort(lvl.v)}
        >{lvl.v}</button>
      {/each}
    </div>
    <p class="min-h-[1.25rem] text-[12px] leading-snug text-muted">
      {EFFORT_LEVELS.find((l) => l.v === fields.effort)?.desc ??
        'Optionnel · touche un niveau (re-touche pour effacer).'}
    </p>
  </fieldset>
  ```

### 1.6 Affichages

**`src/routes/+page.svelte` (tableau de bord)**
- Dans `<script>`, ajoute la série dérivée : `const effortPts = $derived(series(E, 'effort'));` et le résumé `const sEffort = $derived(stat(E, 'effort'));`.
- Tuile : remplace la rangée secondaire actuelle (`<div class="grid grid-cols-3 gap-3">` contenant Masse grasse / Muscle / Calories) par une grille **2×2** `grid grid-cols-2 gap-3` ajoutant une 4ᵉ tuile :
  ```svelte
  <StatTile label="Activité" value={sEffort.last} unit="/5" delta={lastDelta(E, 'effort')} format={f0} />
  ```
- Ajoute une section graphique **après** la section « Calories » :
  ```svelte
  <section class="mt-5">
    <h2 class="mb-2 text-[17px] font-semibold text-ink">Activité physique (1–5)</h2>
    <div class="card">
      <LineChart
        height={170}
        unit="/5"
        format={f0}
        ariaLabel="Niveau d'effort physique quotidien"
        series={[{ label: 'Effort', points: effortPts, tone: 'accent', dash: 'solid', area: true }]}
      />
    </div>
  </section>
  ```
  (`LineChart` met l'axe Y à l'échelle des données automatiquement ; pas de domaine fixe nécessaire.)

**`src/routes/historique/+page.svelte`**
- Ajoute une colonne « Effort » dans le tableau, en **dernière colonne de données** (juste avant la colonne d'action `✕`) :
  - en-tête : `<th class="px-2.5 py-2.5 font-semibold">Effort</th>`
  - cellule : `<td class="px-2.5 py-2.5 text-ink2">{f0(e.effort)}</td>`
  (le helper `f0` existe déjà dans ce fichier.)

### 1.7 Export — `src/lib/server/export.ts`
Ne touche **pas** à `SUMMARY_ROWS` (les unités ne s'y prêtent pas) ; traite l'effort à part pour un rendu propre.
- **Légende** : ajoute une ligne au tableau des colonnes :
  ```
  out.push('| Effort | Activité physique de la journée (1 = repos … 5 = grosse séance) | échelle 1–5 |');
  ```
- **Résumé** : ajoute un bloc dédié juste après la sous-section « Dernières valeurs » (utilise `stat(entries, 'effort')`, et `f0`/`f1` déjà définis) :
  ```ts
  const se = stat(entries, 'effort');
  out.push('### Activité physique');
  out.push('');
  if (se.count === 0) {
    out.push('_Aucun niveau d’effort saisi sur la période._');
  } else {
    out.push(`- Dernier niveau : **${f0(se.last)} / 5** _(le ${se.lastDate})_`);
    out.push(`- Moyenne : ${f1(se.avg)} / 5 · min ${f0(se.min)} · max ${f0(se.max)} · ${se.count} jour(s) renseigné(s)`);
    // Répartition par niveau
    const counts = [0, 0, 0, 0, 0];
    for (const e of entries) if (e.effort != null && e.effort >= 1 && e.effort <= 5) counts[e.effort - 1]++;
    out.push(`- Répartition : ${counts.map((c, i) => `niveau ${i + 1} : ${c} j`).join(' · ')}`);
  }
  out.push('');
  ```
- **Historique** : ajoute une colonne « Effort » comme **dernière colonne** du tableau historique. Mets à jour les trois lignes : l'en-tête, la ligne de séparation `| --- | ... |`, **et** chaque ligne de données (ajoute `${f0(e.effort)}` à la fin), ainsi que la ligne d'état vide `| _aucune donnée_ | ... |` (un `|` de plus).

---

## Tâche 2 — Export Markdown = tout l'historique

Je veux que l'export contienne **toujours toutes les données depuis le début**, indépendamment de la période affichée à l'écran (le sélecteur 7/30/90/Tout continue de piloter uniquement les graphiques).

**`src/routes/+page.svelte`** — dans la section `<!-- export -->`, remplace le lien :
```svelte
<a href={`/api/export?period=${data.period}`} class="btn-ghost w-full" download>
  Exporter en Markdown ({data.periodLabel})
</a>
```
par :
```svelte
<a href="/api/export?period=all" class="btn-ghost w-full" download>
  Exporter en Markdown (tout l'historique)
</a>
```

> La période `all` est déjà gérée côté serveur (`periodFrom('all')` renvoie `undefined` → toutes les entrées). Aucun changement backend requis.
> **Optionnel (robustesse)** : dans `src/routes/api/export/+server.ts`, tu peux faire défaut à `all` si aucun paramètre n'est fourni, p. ex. `const period = parsePeriod(url.searchParams.get('period') ?? 'all');`.

---

## Vérification finale
- `npm run check` doit passer sans erreur (TypeScript/Svelte strict).
- Teste rapidement : saisir un jour avec seulement un niveau d'effort → il est bien enregistré (pas supprimé comme « vide ») ; re-toucher le niveau actif → champ vidé ; l'export contient la colonne Effort, le bloc « Activité physique », et l'historique complet.
- N'édite pas la migration v1 ; garde tous les libellés en français.
