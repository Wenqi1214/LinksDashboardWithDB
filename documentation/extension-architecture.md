# Extension Architecture Notes

## Purpose

This document explains why the project contains similar logic in both the frontend and the backend, and how the browser extension support shaped the architecture.

At first glance, some parts of the codebase look duplicated. For example, the server can return a daily verse, while the frontend can also select one locally. The same pattern appears in panels, links, time tracking, and to-do features.

This is not accidental. The project is designed to run in two different environments:

1. A normal web app that talks to the Node/Express server.
2. A browser extension that can run without that server.

Because of that, the frontend cannot always rely on `fetch("/api/...")`. In extension mode, it sometimes has to behave like a small local backend.

## The Core Switch: `useLocalData`

The main architecture decision is controlled by [`src/lib/runtime.js`](/Users/liuwenqi/Desktop/linkdash/src/lib/runtime.js).

That file defines `useLocalData`, which becomes `true` when the app is running:

- inside a Chrome extension (`chrome-extension:`)
- inside a Firefox extension (`moz-extension:`)
- or when local mode is manually forced through `localStorage`

When `useLocalData` is `false`, the frontend behaves like a standard client and calls the backend API.

When `useLocalData` is `true`, the frontend skips the backend and uses local implementations instead.

In other words, the app has two runtime modes:

- Server mode: frontend -> `/api/...` -> Express -> SQLite or server-side data files
- Local mode: frontend -> local data layer -> `localStorage` and bundled assets

## Why Similar Logic Exists in Frontend and Backend

If this were only a normal web app, many frontend files could be thin wrappers around HTTP requests. The frontend would simply call the server and render the response.

However, extension mode changes the requirement. A browser extension page does not automatically have access to the local Node server. That means the extension must still work even when the backend is unavailable.

Because of that, some business logic exists in both places:

- the backend implements the official API for web mode
- the frontend implements local equivalents for extension mode

This is best understood as mirrored logic for two runtime environments, not purely accidental duplication.

## API Wrappers That Branch Between Server and Local Mode

Several frontend API files are written as runtime adapters. They decide whether to call the backend or use local implementations.

### Dashboard Data

[`src/api/dashboardApi.js`](/Users/liuwenqi/Desktop/linkdash/src/api/dashboardApi.js) handles:

- panels
- categories
- links
- reordering
- restore/snapshot flows

Each function follows the same pattern:

- if `useLocalData` is enabled, call a `local...` function
- otherwise, call `/api/...`

Examples include:

- `getPanels()`
- `createPanel()`
- `getCategories()`
- `getLinks()`
- `createLink()`
- `reorderLinks()`

In a server-only app, these functions could be much simpler and only use Axios.

### Time Tracking

[`src/api/timeApi.js`](/Users/liuwenqi/Desktop/linkdash/src/api/timeApi.js) does the same thing for:

- time tasks
- time series
- task charts
- adding and removing logged hours
- exporting time data

Instead of always calling endpoints like `/api/time/tasks`, the file can switch to local functions such as:

- `localGetTimeTasks()`
- `localGetTimeSeries()`
- `localAddHour()`
- `localRemoveHour()`

### Todo Data

[`src/api/todoApi.js`](/Users/liuwenqi/Desktop/linkdash/src/api/todoApi.js) also follows the same model:

- get items
- create item
- update item
- toggle item
- delete item
- clear a lane

Again, in a server-only design these would just be HTTP calls.

### Verse Data

[`src/api/verseApi.js`](/Users/liuwenqi/Desktop/linkdash/src/api/verseApi.js) now uses the shared JSON file for local mode, while the server uses the same data source for API mode.

That means the verse content itself is no longer duplicated, but a small amount of runtime logic still exists in both places because both environments need to produce a result.

## The Frontend Local Data Layer

The most important extension-related adaptation lives in [`src/lib/localDataApi.js`](/Users/liuwenqi/Desktop/linkdash/src/lib/localDataApi.js).

This file is effectively a frontend-side replacement for many backend endpoints. It provides local versions of server behavior, including:

- panel creation, update, delete, and reorder
- category creation, delete, restore, and reorder
- link CRUD and reorder
- time tracking aggregation and chart data
- todo item CRUD and lane clearing

This is why some frontend logic looks similar to backend logic. The frontend is not only a UI layer in local mode. It also becomes a lightweight application data layer.

## The Local Persistence Layer

[`src/lib/localStore.js`](/Users/liuwenqi/Desktop/linkdash/src/lib/localStore.js) exists because local mode needs storage and utility helpers that would otherwise belong to the backend and database layer.

It provides:

- a default application state
- `loadState()` and `saveState()`
- `withState()` mutation flow
- local ID generation with `nextId()`
- sort order helpers
- date utilities such as `dateOnly()`, `weekStart()`, and `monthStart()`
- grouping utilities used by charts and summaries

In a pure frontend/backend architecture, much of this would either be unnecessary or would live entirely on the server side.

## What the Extension Changes in Practice

Because the extension may run without the local Express server, the frontend has to do more than a standard client would normally do.

The extension support adds these responsibilities to the frontend:

- choose between remote API mode and local mode
- maintain local persistent state
- implement local equivalents of backend operations
- bundle data that must be available without the server

That is why the frontend is thicker than usual.

## Not Everything Goes Through the Project Backend

Another interesting design choice appears in [`src/components/WorldClocks.jsx`](/Users/liuwenqi/Desktop/linkdash/src/components/WorldClocks.jsx).

The weather and geocoding features call third-party APIs directly from the frontend:

- Open-Meteo geocoding
- Open-Meteo weather

This is important for understanding the extension architecture. The project does not require every feature to go through its own backend. In extension mode, direct browser requests to third-party services are sometimes more practical.

That design is supported by the extension manifest in [`extension/manifest.json`](/Users/liuwenqi/Desktop/linkdash/extension/manifest.json), which includes host permissions for those external APIs.

## How the Extension Build Works

The extension packaging flow is handled by [`scripts/build-extension.mjs`](/Users/liuwenqi/Desktop/linkdash/scripts/build-extension.mjs).

The process is:

1. Build the normal frontend app with Vite.
2. Copy the built `dist` output into `extension-dist`.
3. Copy the files from [`extension`](/Users/liuwenqi/Desktop/linkdash/extension) into that same output.

This means the extension is not a completely separate app. It is the same frontend application, packaged differently and given extension-specific files such as:

- [`extension/manifest.json`](/Users/liuwenqi/Desktop/linkdash/extension/manifest.json)
- [`extension/background.js`](/Users/liuwenqi/Desktop/linkdash/extension/background.js)

The background script opens the packaged `index.html` inside the extension.

## Is This Duplication?

Partly yes, but the distinction matters.

There are two kinds of duplication in this project:

### 1. Data duplication

This is usually the less desirable kind.

Example:

- hardcoded verses in multiple places

This has now been reduced by using the shared file [`server/data/verses.json`](/Users/liuwenqi/Desktop/linkdash/server/data/verses.json).

### 2. Runtime logic duplication

This is more understandable in this architecture.

Example:

- selecting a verse in server mode
- selecting a verse in local extension mode

The logic is similar because both environments must remain functional, even though they do not share the same runtime.

So yes, some duplication exists, but not all of it is unnecessary. Much of it comes directly from the decision to support both:

- server-backed web usage
- serverless local extension usage

## Summary

The extension support changes this project from a simple client/server application into a dual-mode application.

Instead of having only:

- frontend UI
- backend API

the project also has:

- a frontend-side local data API
- a frontend-side storage layer
- runtime branching between remote and local execution
- direct external API access for some features
- an extension packaging layer

That is why similar logic appears on both the frontend and backend.

If the project ever decides that all usage must go through the server, much of this mirrored local logic could be removed. Until then, the current structure is the tradeoff that makes the extension able to run independently.
