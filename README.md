# Brewlog

Brewlog is a mobile-first, local-first specialty coffee journal. This initial
foundation includes the responsive app shell, placeholder routes, theme
preferences, local database schema, and domain persistence services. Coffee
management and brew-tracking screens remain placeholders.

## Development

```sh
npm install
npm run dev
```

## Checks

```sh
npm test
npm run lint
npm run build
```

## Foundation

- React, strict TypeScript, Vite, and React Router
- Tailwind CSS v4 with shadcn/ui configuration
- Zod-validated coffee source, roastery, product, bag, brew, and weight-adjustment models
- Repository APIs for domain writes, reference checks, and transactional weight recalculation
- Additive Dexie v2 domain schema; original v1 tables are retained
- IndexedDB image-blob table, separate from product and roastery records
- Vitest and fake-indexeddb coverage for domain validation and schema upgrades
- TanStack Query provider reserved for future synchronization
- PWA manifest and service worker that precaches the application shell
- English and Persian interface translations with persisted language selection

The service worker can cache the app shell; it does not make unimplemented
features or future application data available offline.
