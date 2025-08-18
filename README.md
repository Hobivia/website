# Hobivia (vanilla + Netlify + Contentful)

Site statique **sans bundler**, performant et maintenable :

- **Front** : HTML/CSS/JS (vanilla), Leaflet (CDN), OSM.
- **Données** : `/.netlify/functions/lodgings` (proxy Contentful GraphQL).
- **Fallback local** : `data/seed-lodgings.json` si Contentful non configuré.
- **Partials** : chargés/ exécutés via `assets/js/partials-loader.js`.

## 1) Prérequis

- Node.js LTS
- Compte Netlify + **Netlify CLI** : `npm i -g netlify-cli`
- (Optionnel) Compte Contentful, un **Space** et l’**Environment** `master`.

## 2) Lancer en local

```bash
netlify dev
