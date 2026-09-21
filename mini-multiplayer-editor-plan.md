# Mini Multiplayer Editor — Implementation Plan

A small real-time collaborative code editor: multiple people typing in the same document at once, seeing each other's cursors move live, with no lost edits. Built to show the same core problem Replit itself had to solve — real-time collaboration at scale — in a project small enough to finish and deploy in about two weeks.

---

## 1. What you're building (MVP scope)

- A user opens a link and lands in a shared code editor "room"
- Anyone else with the link can join the same room and type at the same time — no one's changes overwrite anyone else's
- Everyone sees everyone else's cursor and selection, live, with a name and color
- The document survives a page refresh or a server restart (it's saved, not just kept in memory)
- Basic syntax highlighting for a couple of languages (JS, Python)

**Stretch goals** (only if the MVP is solid with time left):
- A "Run" button that actually executes the code and shows output — this one is worth prioritizing over the others if you have to pick, because it directly echoes "instant development environments," which is Replit's core pitch
- A small avatar list of who's currently in the room
- A fake "Deploy" button/flow, just as a visual nod to their one-click deploy feature

Skip: multi-file support, real auth/login, chat. They add complexity without adding to the story you're telling.

---

## 2. Architecture

**Frontend:** React (Vite) + CodeMirror 6 as the editor + Tailwind for styling
**Real-time sync:** Yjs (a CRDT library) + `y-codemirror.next` (binds Yjs directly to the editor)
**Transport:** WebSockets, using the `y-websocket` server package as your starting point rather than hand-rolling the sync protocol
**Persistence:** SQLite (simplest) or Postgres, storing periodic snapshots of each document
**Presence/cursors:** Yjs's built-in Awareness protocol, which rides over the same WebSocket connection

### Why this stack
- **CRDTs over manual conflict resolution:** Yjs handles the hard part (merging simultaneous edits correctly) for you. Writing your own operational-transform logic is a multi-week project by itself — not worth it here.
- **`y-websocket` over a hand-rolled relay:** it already handles reconnection, room management, and encoding the binary Yjs updates correctly. You customize persistence and room logic around it instead of reimplementing the sync layer.

### How data flows
1. User A types a character.
2. Yjs generates a small binary "update" representing just that change.
3. The update is sent over the WebSocket to the server.
4. The server broadcasts it to every other client connected to that same room.
5. Each client applies the update to its local copy of the document.
6. CodeMirror re-renders automatically, because it's bound directly to the Yjs document.

Cursor/selection updates travel the same way, but through Yjs's separate Awareness channel — they're broadcast live but never persisted to the database (no reason to save where someone's cursor was).

---

## 3. Build plan (roughly 2 weeks, adjust to your schedule)

### Phase 0 — Setup (Day 1)
- Scaffold `/client` (Vite + React) and `/server` (Node + Express)
- Install Yjs, `y-websocket`, `y-codemirror.next`, CodeMirror 6
- Write a one-page `ARCHITECTURE.md` in the repo stating the MVP scope — small thing, but it's a good artifact to point to later when explaining your decision-making

### Phase 1 — Get sync working, ugly first (Days 2–4)
- Stand up the `y-websocket` server, with rooms keyed by a document ID in the URL (e.g. `/room/:id`)
- On the client, bind a **plain `<textarea>`** (not the real editor yet) to a Yjs document
- Goal: open two browser tabs on the same room, type in both, confirm nothing gets lost or overwritten
- Don't touch the UI until this works — it's the part most likely to have subtle bugs, and it's much easier to debug without CodeMirror in the way

### Phase 2 — Real editor (Days 5–6)
- Swap the textarea for CodeMirror 6, wired up via `y-codemirror.next`
- Add a language dropdown (JS/Python) using CodeMirror's language extensions
- Basic layout: header with room name and a "copy link" button

### Phase 3 — Live cursors and presence (Days 7–8)
- Wire up Yjs Awareness: each client shares `{ name, color, cursor position, selection }`
- On joining, prompt for a display name; assign a random color
- Render other users' cursors as colored carets with a name tag (CodeMirror's decoration API handles this)

### Phase 4 — Persistence (Days 9–10)
- Add a `documents` table: `room_id`, `content_snapshot`, `updated_at`
- When a room's first client connects and no one else is already in memory, load the latest snapshot from the DB
- Save a snapshot every ~10 seconds and on last-client-disconnect
- Test explicitly: type something, kill and restart the server, reconnect — content should still be there

### Phase 5 (stretch) — Run button (Days 11–12)
- Server endpoint takes the current content + language, runs it, returns stdout/stderr
- JS: Node's `vm` module or a `child_process` with a timeout
- Python: shell out to `python3` with a timeout
- Note openly in your README that this is a simplified sandbox, not properly isolated — naming that tradeoff shows you understand what real infra-grade sandboxing (which is what Replit actually builds) would require

### Phase 6 — Polish, deploy, demo (Days 13–14)
- Deploy the whole thing on Replit itself — using their platform to build the application is a small but real signal
- Write a clear README: architecture, key decisions, what you'd do differently with more time
- Record a 60–90 second demo: two windows side by side typing simultaneously, cursors moving live, then a refresh showing the content persisted
- Push to GitHub, link it in the application

---

## 4. Known rough edges to watch for
- Pin exact versions of `y-codemirror.next` and CodeMirror — this binding ecosystem has had breaking changes between versions
- Let `y-websocket`'s client provider handle reconnection — don't build your own reconnect logic on top of it, it already does this
- Test with three tabs, not just two, before calling sync "done" — bugs in merge logic often only show up with 3+ concurrent editors

## 5. Connecting it to your background (for the write-up / interview)
- Your Credit Suisse low-latency market data work is a real, honest parallel: both are about correctly handling fast-moving concurrent state, just in different domains (financial ticks vs. text edits)
- Your UBS work on Elasticsearch-backed indexing for faster queries is a fine reference point when explaining your persistence/snapshot tradeoffs here — same underlying question of what to store and how often
