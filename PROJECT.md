# Laya Search

User requested a local clone of the supplied YC startup-search demo using local Laya and JEV with an existing key. This is a private side project outside BLI; no matching Linear issue was found, and Tower binding was not run.

Implemented Node HTTP server plus plain JavaScript browser frontend. Node loads environment variables execution-only. Persistent Python Core ML worker uses pinned laya-coreml 0.1.0 and model revision documented in README. Both engines rerank a 48-company lexical shortlist from a 6,245-company public snapshot. Laya runs on this Mac; JEV API authentication was verified live. UI displays measured timing and backend failures.

Scope boundary: text search and company details work; image/color search from the reference video is not implemented. Retrieval recall and model accuracy remain unbenchmarked. The 0.45 relevance threshold is an implementation default. Do not describe single successful queries as quality validation.

UI updated from the supplied 106-second video: black fullscreen canvas, centered compact search, scored logo grid above search, hover company details, and an interactive logo pile. The Laya LOCAL / JEV API switch and engine readiness are visible directly below the search box. Settings contains the animation toggle and search-scope note. The original circle-collision animation was replaced after detailed video review: Matter.js polygon contacts and sleeping keep the pile settled; individual result logos move continuously from the pile into DOM grid slots and fall back on query edits. Vendored Matter.js 0.20.0 and its license are under public/vendor. Explicit rise/rotation/scale timing follows the observed video transitions; this recreates the choreography, not the original random body trajectories.

Run and installation instructions: README.md. Browser and API QA evidence: receipts/. No deployment or GitHub repository configured.

Null-description fix: public records may have null `long_description`. JEV request preparation now uses the tagline or empty string before truncation. The real `service company` query is regression-tested and browser-verified (30 displayed results, 1.19s on the repair run).

Suggested searches: 16 hand-picked text queries are available below the search bar, four at a time. Each button fills the input and submits through the currently selected engine; More ideas cycles the four sets. Suggestions disable during an active search, including when the user cycles sets, to avoid overwriting an in-flight request. These are example queries, not claims about result quality.

Pile interaction: moving a mouse/pen through the pile gives nearby logos brief, varied outward/upward impulses without a button press. Pointer speed controls strength; the impulse fades within a few hundred milliseconds when movement stops. Gravity, rotation and contacts create the tumble and settling. Search flights and docked results are excluded. The animation toggle and reduced-motion preference disable the effect; touch dragging remains available.


Cancellation: Stop replaces the submit button during any search; Escape or selecting a different engine also cancels. The client aborts the request and invalidates stale completions while preserving the query. Server response disconnect aborts JEV fetches and kills/restarts this app's Core ML worker for local searches, releasing the shared busy gate. Laya readiness refreshes after restart; JEV is immediately usable. An aborted remote request does not guarantee the provider stops already accepted computation or billing.

Standing preference: Edward explicitly requested Stop/Cancel controls for long-running UI actions. Added to the active installed engineering rules at `/Users/edwardtran/BLI/edward-agent-stack/skills/edward-rules/SKILL.md` on the local `codex/stop-controls-20260922` branch. No commit, PR or publication was requested.

Deployment decision (September 22, 2026): the project is public at `https://github.com/giaphutran12/laya-search` and Git-connected to the `edwards-projects-7fd27381/laya-search` Vercel project. Production runs the JEV API engine with its key stored as a Vercel Production secret; Laya Core ML stays local-only. The production alias is `https://laya-search.vercel.app`.
