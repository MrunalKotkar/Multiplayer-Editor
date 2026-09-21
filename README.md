# Mini Multiplayer Editor

A small real-time collaborative code editor. Open a link, land in a shared room, and type
alongside anyone else with that link — live cursors, live selections, no lost edits, and the
document survives a refresh or a server restart.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full design writeup (stack choices, data flow,
persistence model, and what I'd do differently with more time).

## What's actually in here

- Real CRDT sync (Yjs) over a real WebSocket connection — every character typed is a genuine
  network round trip through the server and back to every other client in the room.
- Live presence: join with a name, get a random color, see everyone else's caret (with a name
  tag) move as they type, and see the avatar list update the instant someone joins or leaves.
- A shared language selector (JS/Python) — changing it in one tab updates every tab in the room,
  the same way the text does, because it lives in the same Yjs document.
- Persistence in SQLite: a room's content is snapshotted every ~10s and again the moment the last
  person leaves, so killing and restarting the server doesn't lose the document.
- A "Run" button that actually executes the current code server-side (Node for JS, python3/python
  for Python) and returns real stdout/stderr — not a mock.

No demo data, no seeded rooms — a fresh room is genuinely empty until someone types in it.

## Project layout

```
client/    React (Vite) + CodeMirror 6, the editor UI
server/    Express + ws + y-websocket (server-side) + SQLite persistence
```

## Running it locally

Requires Node 18+.

```bash
npm run install:all   # installs client/ and server/ dependencies
npm run dev           # runs both dev servers together (client :5173, server :3001)
```

Open http://localhost:5173, click **New Room**, then open the room URL in a second (and third)
browser tab to see it sync live. In dev, Vite proxies `/api` and `/ws` to the server (see
`client/vite.config.js`), so everything is same-origin from the browser's point of view — exactly
like production.

### Try the Run button

Requires `python3` (or `python`) on PATH for Python execution; JavaScript execution just uses the
same Node binary the server is running on. Note the sandboxing caveat in ARCHITECTURE.md — this is
not isolated execution, so only run this with people you trust the link with.

## Production build (single process, one origin)

```bash
npm run build   # builds client/dist
npm start       # serves the built client + API + WebSocket, all from server/src/index.js
```

The server serves `client/dist` and falls back to `index.html` for client-side routes (`/room/:id`)
whenever a built client is present, so the whole app is one process on one port — no CORS, no
reverse-proxy config needed on the host. It listens on `process.env.PORT` if set, `3001` otherwise.

## Deploying

This works on Replit (a bare-bones `.replit` is included) or any host that runs a long-lived Node
process and gives it a port: Render, Railway, Fly, a plain VM. The steps are the same everywhere:

1. `npm run install:all`
2. `npm run build`
3. `npm start`

SQLite persists to `server/data/documents.db` on local disk — on a host with ephemeral/non-persistent
disk (most serverless platforms), the DB resets on every deploy/restart. For a real deployment on
such a platform, swap `server/src/db.js` for a hosted Postgres/SQLite (e.g. Turso, Neon) — the rest
of the persistence code (`server/src/persistence.js`) is written against a tiny `getDocument`/
`saveDocument` interface specifically so that swap doesn't touch the sync logic.

## Testing sync (what I actually verified, not just what should work)

- Two real browser tabs typing in the same room simultaneously, at different points in the
  document — no overwrites, both converge to the same text.
- Three tabs typing concurrently (the plan explicitly calls out that merge bugs often only show up
  at 3+ editors) — same result, all three converge.
- Killed the server process mid-session and restarted it — the room's content was still there for
  the next client to connect, loaded from the SQLite snapshot before that client's first sync
  message was even sent (see the ordering note in `server/src/persistence.js`).
- Verified the exact same behavior against the dev setup (Vite + proxy) and the production build
  (single process, single origin) — not just one or the other.

## Key decisions (worth knowing if you're reading the code)

- **`y-websocket@2.0.4` pinned on both client and server.** Newer `y-websocket` (3.x) dropped the
  bundled server entirely and became a client-only package — see ARCHITECTURE.md for why 2.0.4 is
  the last version with both halves, and why pinning matters here specifically.
- **The Y.Doc/WebsocketProvider are created inside a `useEffect`, not `useMemo`**
  (`client/src/lib/useYjsRoom.js`). They're a side-effecting external resource (an open socket), and
  only an effect's mount/cleanup pairing survives React 19 StrictMode's double-invoke in dev
  correctly — a version built with `useMemo` looked fine in a quick manual check but silently never
  connected in an automated multi-tab test, because the first (discarded) provider's `.destroy()`
  call permanently killed the only instance actually in use. This one cost real debugging time and
  is exactly the kind of bug the plan's "Known rough edges" section warned would be lurking in this
  binding ecosystem.
- **No router library.** Two routes (`/` and `/room/:id`) don't justify the dependency; `App.jsx`
  parses `window.location.pathname` directly.
- **Language selection lives in the shared Yjs doc, not local component state.** It's a small
  extra than the plan technically asked for, but it's free (same Y.Map mechanism as everything
  else) and makes the room feel like one shared space rather than text-only.

## Connecting this to my background

My Credit Suisse work on low-latency market data and this project are the same underlying problem
in different clothes: correctly handling fast-moving concurrent state where losing or misordering
an update is the failure mode you design against, whether that update is a price tick or a
keystroke. The CRDT approach here is the text-editing analogue of the ordering/consistency
guarantees that mattered there — just solved by merging state instead of sequencing a log.

My UBS work on Elasticsearch-backed indexing is the closer parallel for the persistence layer
specifically: same underlying question of what to store, how often, and what you're willing to lose
between snapshots, just applied to a much smaller dataset (one document) here than an index.
