# Brewlog

Brewlog is a mobile-first, local-first specialty coffee journal. This initial
foundation includes the responsive app shell, placeholder routes, theme
preferences, and local database schema. Coffee management and brew tracking are
not implemented yet.

## Development

```sh
npm install
npm run dev
```

## Checks

```sh
npm run lint
npm run build
```

## Foundation

- React, strict TypeScript, Vite, and React Router
- Tailwind CSS v4 with shadcn/ui configuration
- Dexie database schema for future coffee and brew records
- TanStack Query provider reserved for future synchronization
- PWA manifest and service worker that precaches the application shell
- English and Persian interface translations with persisted language selection

The service worker can cache the app shell; it does not make unimplemented
features or future application data available offline.
