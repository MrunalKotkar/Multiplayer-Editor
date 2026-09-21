# Architecture

## MVP scope

- Open a link, land in a shared code editor "room".
- Anyone with the link can join and type at the same time; no one's edits overwrite anyone else's.
- Everyone sees everyone else's cursor and selection live, with a name and color.
- The document survives a page refresh or a server restart — it's persisted, not just kept in memory.
- Basic syntax highlighting for JS and Python.

Explicitly out of scope for the MVP: multi-file support, real auth/login, chat. Stretch, if time
allows: a "Run" button (server executes the code and returns stdout/stderr), a live avatar list of
who's in the room, and a fake "Deploy" button as a visual nod to Replit's one-click deploy.

## Stack

- **Frontend:** React (Vite) + CodeMirror 6 + Tailwind
- **Real-time sync:** Yjs (CRDT) + `y-codemirror.next` binding
- **Transport:** WebSockets via `y-websocket` (server-side `bin/utils` helpers + client `WebsocketProvider`)
- **Persistence:** SQLite (`better-sqlite3`), periodic snapshots of each document
- **Presence/cursors:** Yjs Awareness protocol, riding over the same WebSocket connection

### Why this stack

- **CRDTs over manual conflict resolution.** Yjs merges simultaneous edits correctly without a
  hand-rolled operational-transform layer, which is a project of its own and not worth it here.
- **`y-websocket` over a hand-rolled relay.** It already handles reconnection, room management, and
  correctly encoding binary Yjs updates. We only add persistence and room bootstrap logic around it.
- **Exact version pin: `y-websocket@2.0.4` on both client and server.** Newer `y-websocket` releases
  (3.x) dropped the bundled server (`bin/utils`) entirely and became client-only. 2.0.4 is the last
  version that ships both the `WebsocketProvider` (client) and `bin/utils` (`setupWSConnection`,
  `getYDoc`, `setPersistence`) for the server, so both sides speak the same version instead of
  guessing at wire compatibility across releases.

## How data flows

1. User A types a character.
2. Yjs generates a small binary "update" representing just that change.
3. The update is sent over the WebSocket to the server.
4. The server broadcasts it to every other client connected to that same room.
5. Each client applies the update to its local copy of the document.
6. CodeMirror re-renders automatically, since it's bound directly to the Yjs document via
   `y-codemirror.next`.

Cursor/selection updates travel over Yjs's separate Awareness channel on the same socket — broadcast
live, never persisted (no reason to store where someone's cursor was a moment ago).

## Persistence model

- `documents` table: `room_id TEXT PRIMARY KEY`, `content TEXT`, `language TEXT`, `updated_at INTEGER`.
- When the first client joins a room and no in-memory Yjs doc exists yet for it, the server loads the
  latest snapshot from SQLite into a fresh `Y.Doc` before any client attaches.
- The server snapshots each active room's document to SQLite on an interval (every 10s) and again the
  moment the last client in that room disconnects, so a server restart never loses more than ~10s of
  work.

## Rooms

- A room is identified by an id in the URL: `/room/:id`. The landing page creates one (random id) and
  redirects; anyone opening that URL joins the same Yjs document over the same WebSocket room name.

## Run button (stretch)

A server endpoint takes the current content + language and executes it out-of-process with a hard
timeout (`child_process`, Node `vm` for JS / shelling to `python3` for Python), returning captured
stdout/stderr. This is intentionally a simplified sandbox — no container isolation, no resource limits
beyond a timeout, no filesystem/network restriction. Real infra-grade sandboxing (what Replit actually
runs) needs per-execution containers or microVMs, resource quotas, and network isolation; that's a
substantially larger system than this MVP takes on.

## What I'd do differently with more time

- Replace the interval-based SQLite snapshot with debounced writes keyed off actual Yjs update events,
  so persistence lag is bounded by activity rather than a fixed timer.
- Move the Run button into a real sandboxed executor (gVisor/Firecracker-style isolation) instead of a
  bare `child_process` with a timeout.
- Add reconnection-aware presence cleanup (awareness states can go stale if a tab is killed rather than
  closed cleanly).
