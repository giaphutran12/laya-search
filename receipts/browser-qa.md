# Browser QA, September 22, 2026

Computer-use pass with Codex in-app browser at http://127.0.0.1:4317/.

- Initial page visibly rendered dark logo discovery UI, 6,245 companies, and local model ready.
- Typed `payment infrastructure for developers`, submitted Laya: loading state then 22 result cards, 15.23 seconds shown.
- Opened Cumbuca result: company description, Summer 2021 batch, São Paulo location, Active status and real website link rendered. Escape dismissed dialog and returned focus to the result.
- Switched JEV and submitted same query: loading state then 12 cards, 1.20 seconds shown. Cumbuca, Formance, Unifold, Poko, HUBUC and Xendit visible.
- Captured and visually inspected initial and JEV-result screenshots in task tool output. No overlap at the desktop viewport inspected.
- Submitted `zxqvnotacompany983`: explicit zero-match state and suggestion to broaden query.
- Three tests on actual directory data passed: exact-company retrieval, empty/unknown query behavior, and shortlist bounds/identity.

Observed limitation: Laya placed Fly.io, Heroku and Firebase highly for the payment query, indicating relevance quality needs tuning. This pass verifies functioning UI/provider integration, not search accuracy. Mobile behavior and provider failure UI were not exercised in the browser.

## Null-description regression repair

Reproduced the reported `service company` JEV request against the running server: returned `Cannot read properties of null (reading 'slice')`. Traced to JEV profile construction calling `.slice()` on a null `long_description`. Added tagline/empty-string fallback and a regression test using actual null-description records in that query's shortlist, plus checked description serialization for all 6,245 records. All four tests pass.

Restarted the local server and resubmitted the user's existing `service company ` query in their browser with JEV selected. Browser visibly returned 30 matches in 1.19s; HiOperator, MochaCare, and Exec appeared. Screenshot inspected in task output at the user's narrower viewport. Left successful results open.

## Video UI clone

Reference: `/Users/edwardtran/Downloads/sssx.io_1790057814295.mp4` (106.2 seconds). Inspected 12 frames covering the whole recording. Bundled watch extraction failed on unsupported ffmpeg `-vsync`; direct ffmpeg uniform extraction succeeded.

Replaced the prior hero/card UI with a black canvas, centered compact search, top logo results with actual relevance percentages, hover/focus company tooltips, settings popover, and interactive physics logo pile. Browser run in current 748x962 window: JEV `show me food delivery software in USA` yielded 20 matches in 1.17s. DoorDash logo opened the correct company detail dialog; Escape closed it and focus displayed its tooltip. Engine picker and animation checkbox exercised. Four existing tests passed and app/physics JS syntax checks passed. Wide viewport override capture was cropped by the in-app browser; reset it, so no claim of wide screenshot verification.

Laya search also completed through the redesigned UI (`Stripe`, 9 displayed matches, 15.87s). Relevance remains weak: Stripe itself was absent from returned model-filtered results, despite the existing retrieval regression ensuring it enters the shortlist. No accuracy claim. Re-enabled animation and restored JEV for the final UI. Physics and text search remain separate; no image model claims.


## Motion correction, frame analysis and actual browser recordings

Rechecked the full reference at 2 fps (212 sampled frames), then inspected every consecutive frame at source 60 fps for the main lift (1.700–3.300 seconds, 96 frames) and release (24.250–25.050 seconds, 48 frames). Contact sheets and original extracted frames remain under `/tmp/laya-motion-study/`.

Observed choreography: matching logos rise from different pile locations, rotate upright, grow, and settle into the scored grid in a staggered sequence. On query edit, the grid vanishes, the same logos shrink in about 180 ms and accelerate downward into the pile in about half a second. No submit-triggered whole-pile burst.

Implemented continuous logo identity across pile, flight, grid and return. Replaced unstable custom circle collisions with Matter.js polygon contacts, low restitution, sleeping and bounded local wake-up. Corrected fallback-image coordinates on release and retained initials until remote logos finish loading. The pile is a bounded visual sample of the directory; unsampled results occupy available resting slots. Random poses are not an exact reproduction of the recorded simulator.

Computer-use QA at the user's 748×962 browser viewport:

- Live JEV food-delivery searches: 17–19 scored results; rise, rotation and grid settling visually inspected across recorded frames.
- Query edit: same result logos shrink, fall and settle. Fallback initials now leave from their actual grid slots, not the page origin.
- Repeated healthcare and robotics searches: 30 displayed results each. Edited healthcare while all 30 cards were still in flight, then successfully searched robotics (0.65s provider time). No stuck hidden cards.
- Final build: 17 displayed results, 0 in-flight cards after completion, 0 incomplete/broken images in displayed result image elements. Logo placeholders remain until load completes.
- Release-results control exercised. No browser errors/warnings in the inspected log. Four actual-directory regression tests and app/physics syntax checks passed.

Receipts: `corrected-motion.mp4` combines the final lift with the verified release recording (same motion code; last subsequent change only keeps initials visible during image loading). `ready-lift-contact.jpg`, `final-release-contact.jpg`, and `final-repeat-contact.jpg` show intermediate positions. Raw capture frames/timestamps and superseded recordings are retained in `/tmp/laya-motion-study/qa/`. Local app only, no deployment. Search relevance limitations above still apply.

## Clickable search ideas

Added 16 example text searches, displayed four at a time below the search bar. More ideas cycles all four sets and returns to the first. Clicking a suggestion fills and submits the full query through the current engine. Buttons disable while searching, including after cycling to a new set.

Actual browser checks at 748×962:
- Clicked Warehouse robots with Laya selected: query populated automatically, loading controls disabled, then 30 results appeared in 18.68s.
- Cycled More ideas while Laya was running: newly rendered choices remained disabled. Verified all 16 labels and wraparound.
- Selected JEV, clicked AI coding tools: query populated automatically, then 16 results appeared in 1.36s. Suggestions re-enabled and remained below the search bar without overlapping the results or logo pile.
- No errors/warnings in inspected browser log. JavaScript syntax check passed. This verifies interaction and provider routing, not relevance accuracy.

Screenshot: `suggested-searches.png`. Left JEV results and the first four ideas visible.

## Visible Laya option

Moved the existing Laya LOCAL / JEV API switch and readiness indicator from the settings popover to directly below the search box. Retained the existing engine routing and example searches.

Browser QA at 748×962: clicked Learning tools with Laya selected. The query `Tools for online learning and education` completed with 30 results in 18.24s; the UI displayed Laya local and Running on your machine. Clicked both visible engine controls, confirmed the selected state and readiness label changed, then restored Laya. Left the successful local results open. Screenshot: `visible-laya-option.png`.

## Hover-only logo interaction

Replaced the need to hold a pointer button for pile motion with a local hover field. Fixed-step updates gently steer nearby pile bodies upward and around the pointer, preserving polygon collisions and gravity outside its radius. Flight/docked tiles are excluded; leaving the canvas or window clears hover, and disabling motion clears both hover and dragging.

Computer-use receipt: sent only CDP `mouseMoved` events with `button: none` and `buttons: 0`. Hovered at (370,805) in the actual 748×962 canvas for 2.4 seconds, then moved to empty space at (680,300). Recorded 123 browser frames across 5.2 seconds. Visually inspected the local upward curl while hovering and the pile settling after moving away. No mouse-down event or drag was used. JS syntax check passed.

Receipts: `hover-motion.mp4`, `hover-contact.jpg`. Raw frames and timestamps: `/tmp/laya-hover-qa/`.


## Real cancellation and natural scatter

Browser started the real local `Robots that automate warehouse work` search. Stop was visible in the search box (`stop-running.png`). Clicking it preserved the query, restored all search controls and showed the cancellation state. OS process check confirmed the active local worker PID 20284 no longer existed; a new ready worker PID 21622 replaced it. Immediately selected JEV and submitted the same query: 13 results in 1.02s (`stop-then-jev.png`). No busy/429 error and no stale local results overwrote them. Repeated using a direct model switch while Laya was running: cancellation occurred automatically and subsequent JEV search returned 13 results in 1.20s. Readiness recovered after worker restart.

The hover loop now uses pointer-speed-dependent, varied short impulses. Unlike the previous continuous field, stationary pointers stop injecting energy. Actual browser mouse-move-only pass (buttons=0) swept through the pile for 2.2 seconds and moved away. Inspected 153 captured frames over 5.6 seconds: visible outward scattering, individual tumbling and gravity settling, with result cards unaffected. `natural-hover.mp4` and `natural-hover-contact.jpg`; raw frames/timestamps `/tmp/laya-natural-final/`.

Four existing actual-directory regression tests passed; server/app/physics syntax checks passed. No browser errors/warnings in the inspected log. Provider-side completion/billing after a JEV abort was not verified and is not claimed.
