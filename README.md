# Gemini Enterprise Ember

A React + TypeScript prototype for authoring and managing agent playbooks and their referenced assets.

The application has editors for agents, tools, guards, triggers, connectors, schemas, documents, data, and skills. It also includes registry, version-history, portfolio, admin, cost, notebook, and live-authoring views.

This repository is currently a frontend application. The README describes the checked UI and local development path; it does not claim that every screen is backed by a production Gemini Enterprise service.

## Run locally

```bash
npm install
npm run dev
```

Build and lint:

```bash
npm run build
npm run lint
```

The project uses Vite, React 19, TypeScript, React Router, TanStack Query, Zustand, Zod, Tailwind CSS, Framer Motion, `cmdk`, `dnd-kit`, and Dagre.

## Application structure

The root application composes:

```text
BrowserRouter
    │
    ▼
QueryClientProvider
    │
    ▼
ThemeProvider
    │
    ▼
AppProvider
    │
    ▼
Routes
    │
    └── Shell + route-level error boundary
```

Non-critical screens are loaded with `React.lazy` and `Suspense`.

The shared React Query configuration currently uses a 30-second stale time, a five-minute garbage-collection window for unused query data, one retry, and no automatic refetch on window focus.

## Main routes

| Route | Screen |
| --- | --- |
| `/` | Home / asset entry point |
| `/editor` | Playbook editor |
| `/editor/new` | New agent flow |
| `/split-view` | Live split editor |
| `/notebook` | Notebook view |
| `/registry` | Registry catalog |
| `/connectors` | Connector hub |
| `/skills` | Skill editor |
| `/history` | Version history |
| `/portfolio` | Agent portfolio |
| `/admin` | Admin console |
| `/cost` | Cost calculator |
| `/live` | Live authoring |
| `/permissions` | Sharing / permissions UI |
| `/docs-embed` | Embedded document workspace |
| `/sheets-schema` | Sheet/schema workspace |

Dedicated asset editors also exist for agents, tools, guards, triggers, connectors, schemas, documents, and data.

## Playbook model

The UI treats a playbook as a document that references typed assets. The editor and registry use those asset types rather than storing every concept as free-form prose.

The current asset/editor surface includes:

- agents;
- tools;
- guards;
- triggers;
- connectors;
- skills;
- schemas;
- documents;
- data.

Read the parser, schema, store, and context code before treating any UI label as a stable external contract. The frontend is still the source of the current prototype behavior.

## Source layout

```text
src/
  components/
    admin/
    agents/
    connectors/
    dashboard/
    data/
    docs/
    editor/
    guards/
    live/
    notebook/
    permissions/
    registry/
    schemas/
    shared/
    shell/
    skills/
    tools/
    triggers/
    versioning/
    workspace/
  config/
  constants/
  contexts/
  data/
  hooks/
  parser/
  schemas/
  services/
  stores/
  App.tsx
  main.tsx
```

`App.tsx` defines the route surface. Shared registry/application state lives behind `AppProvider`; theme state is separate. Route failures are isolated with the application's route error boundary.

## Development boundary

This repository was previously carrying the default Vite README, which described React tooling rather than this application. The project-specific source code is now the useful reference.

Before documenting a backend capability, verify that the relevant service implementation exists under `src/services/` or another checked integration path. A screen, mock asset, or route is not by itself evidence that a production control-plane operation exists.

## License

See the repository license files for the applicable terms.
