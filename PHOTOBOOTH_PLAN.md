# Implementation plan

## Status: Phase 3 complete — awaiting confirmation for Phase 4

The user approved Phase 3 printing on 2026-10-27. The backend is integrated, and the user confirmed that a browser-submitted test receipt printed and cut correctly with the approved margin orientation. Do not start Phase 4 guest access/HTTPS until confirmed.

## Verified hardware and approved configuration

- XPrinter XP-80T on 80 mm paper, reached from the MacBook over LAN at 192.168.2.120:9100.
- Node v24.12.0 and npm 11.6.2 available. Phase 1 uses Node built-ins only.
- Readable text confirmed by user.
- `GS v 0` raster supported; 576-dot checkerboard printed with both edge rules visible.
- Photo measured approximately 72 × 72 mm, consistent with 8 dots/mm.
- `GS V 66 0` feed-and-partial-cut command works; exact mechanical cut shape was not separately measured.
- Approved layout: rotate photo 180°, 32 leading blank rows, 576 × 576 photo, 32 trailing blank rows. Raster 576 × 640, 72 bytes/row, MSB first, 1 = black.
- No extra explicit feed. Turn the finished receipt upright so the larger mechanical leading margin becomes the visual bottom.
- Intended visual margins roughly 4 mm above and 16–17 mm below; user approved appearance without supplying exact final measurements. Side margins follow the printer's natural unprintable area.
- Saved in printer/config.json, including rotate180=true and cut=feed-partial.

## Calibration findings

Initial upright-in-feed print with 32 leading and 128 trailing blank rows produced approximately 16 mm top and bottom. Removing leading blank rows left approximately 13 mm at the top. Direct cutting initially appeared to reduce it to 10 mm but repeat testing returned 13 mm; it also reduced the bottom to 3 mm with 128 trailing rows. Increasing trailing rows to 232 restored 16 mm below, without solving the top.

The working solution came from thermal-photobooth copy/src/utils/escPosRaster.js: rotate the photo 180° and use 32 blank rows on each end, then feed and cut. This moves the unavoidable leading margin below the upright photo rather than attempting unverified reverse feeding. The user approved this test. Earlier minimum-top conclusions apply only to the unrotated feed orientation.

## Completed implementation

- Standalone text, probe, pattern, Polaroid, and cutter diagnostics.
- Separate TCP transport, ESC/POS encoding, dithering, and test image generation.
- Bounded TCP submission with no automatic retries; submission never claims confirmed physical completion.
- Dry-run ESC/POS bytes and PBM preview of printable pixels.
- Six tests cover known bit packing, raster header, white margins, band continuity, feed/cut commands, dithering, and pixel-accurate 180° rotation.
- Four existing copy-project encoder tests also passed.
- README documents setup, approved layout, commands, calibration and troubleshooting.

## Scope and remaining limits

USB is replaced with Ethernet throughout the project. No packages installed or printer/system settings changed. No full-cut or banded-image physical verification, printer status polling, or reverse-feed commands. Final margin precision and first-print versus continuous-print behavior can be checked during integration if needed; no more test prints are required for the approved Phase 1 result.

Existing tracked frontend files were already deleted when work began; they were not restored. The initially supplied thermal-photobooth-old directory was empty. The later thermal-photobooth copy folder contains a React app and LAN print helper and was inspected without modification. Treat it as reference for later phases, not as authorization to skip phase boundaries.

## Phase 2 implementation

- [x] React + Vite using the existing reference project's dependency versions, installed from local npm cache. No new runtime libraries beyond React/React DOM.
- [x] Welcome with camera and upload; upload goes straight to the common editor.
- [x] Camera lifecycle, live square preview, capture of the original frame, facing switch and mirror metadata, permission/error messages and upload fallback.
- [x] One original source retained in memory, browser orientation handling, 25 MB file limit, corrupt/unsupported-image errors, temporary file URLs revoked.
- [x] Shared editor with drag/nudge crop, zoom, brightness, contrast, reset, retake/replace.
- [x] One 576 × 576 monochrome pipeline shared by editor and result preview. Shared pure dithering used by Node diagnostics and browser, with no Node/Buffer dependencies in the browser.
- [x] Upright physical receipt preview uses configured paper margins, separate from printer rotation.
- [x] Demo print result explicitly states that no print job was sent; no backend or print requests.
- [x] Responsive layouts, labelled sliders, keyboard crop buttons, focus handling, busy/error states.
- [x] Browser checks at 390-pixel phone width and 1280-pixel desktop width: upload, zoom, brightness, contrast, reposition buttons, Reset, corrupt replacement preserving current edit, demo result and return navigation.
- [x] Production build, ESLint, all ten crop/raster/dither tests pass.
- [ ] Real iPhone Safari / Android Chrome and physical front/rear camera checks. Camera composition and mirroring transforms have automated geometry coverage, but physical device behavior remains unverified.

At the user’s request, the live camera preview now uses the shared grayscale/dithering function at 576 × 576, throttled to 8 fps (updated from the initial 256-dot/10-fps live effect to match print detail). Capture starts an accessible 3 → 2 → 1 countdown and saves the original frame after three seconds. Pending capture is cancelled on unmount or upload selection; duplicate presses and camera switching are disabled during countdown. A synthetic browser camera test verified live dithering, one capture after 3003 ms, and zero captures after leaving during countdown. Physical phone checks remain pending. No download/share controls or additional crop screen were carried over. The copy project remains unchanged. Approved Phase 1 printing settings remain intact; approximate upright preview margins were added to the same config.

## Later phases — not started

4. Guest access: local network / HTTPS, investigate Cloudflare Tunnel, QR code, event access controls and rate limits, real iPhone/Android testing.

## Dithering quality investigation

User reported rough texture in both live and captured images, worse after capture. Reviewed the actual copy-project pipeline: same Floyd–Steinberg kernel, float64 error buffer versus current float32, contrast then brightness versus current brightness then contrast. A neutral 576 × 576 grayscale gradient produced identical old/current bits. This is limited evidence, not proof of equivalence for all photographs.

Changed live preview to print resolution (576 dots) at 8 fps so it no longer displays the different dot scale of a 256-dot source. Full original capture remains preserved. Added a separate dev-only comparison at experiments/dithering.html: grayscale, actual legacy code, current, alternating-row FS, Atkinson, and Stucki, with one shared photo/crop/resolution and neutral-adjustment baseline. This investigation initially left the main app on Floyd–Steinberg; it now offers selectable looks as described below. Atkinson and Stucki kernels follow Tanner Helland's published algorithm reference. Browser checks covered generated-image upload, resolution switching, brightness, and reset. All seventeen automated tests, build and lint passed. Portrait-based choice and physical alternative print tests remain pending; do not claim a chosen quality improvement before those comparisons.

## Portra-inspired monochrome experiment

User preferred Atkinson and requested a black-and-white Portra/Lightroom-inspired option. Added a separate candidate beside standard Atkinson: custom RGB monochrome mix (0.38 R / 0.50 G / 0.12 B), smooth lifted-shadow/midtone curve (12 + 238 × normalized luminance^0.9), existing user adjustments, then Atkinson. No imported preset or exact film-emulation claim; no added random grain. This began as a comparison-only candidate and is now selectable in the main app. Three additional tests verify curve monotonicity/endpoints, channel mix/original preservation, and binary output. All twenty tests, lint and build passed. Portrait comparison and physical print preference remain for the user to evaluate.

## Camera dropdown and Floyd–Steinberg controls

At the user's request, promoted the candidate algorithms and Portra tone function to shared modules, with comparison re-exports retaining compatibility. Added one shared DitherControls component to camera and editor: Atkinson (default, based on user preference), Portra-inspired B&W/Atkinson, Floyd–Steinberg, and Stucki. Alternating-row Floyd–Steinberg is a scan-direction toggle rather than a separate duplicate dropdown option.

Floyd–Steinberg supports diffusion strength 0–100%, threshold 64–192, and alternating-row direction. Standard reset preserves Floyd–Steinberg and restores 100%/128/left-to-right. Existing printer diagnostic default output is unchanged, protected by a pre-change raster hash regression test. Look state is owned by App and shared across camera, capture/editor, upload and retake; a camera processing ref avoids reopening streams when settings change. Controls are locked during countdown. Editor's global reset returns to Atkinson with standard tuning defaults.

Live and final processing now share pure shared/photo-look.js; each emits 1-bit black/white photo data. New tests cover unmodified default raster output, zero-diffusion threshold semantics, parameter validation and texture changes, and per-frame live/capture output equivalence for all selectable looks. All twenty-four tests, lint and production build passed. Browser synthetic-camera checks verified no stream restart on setting changes, controls/reset, disabled tuning through countdown, capture at 3003 ms retaining custom FS settings, and retention on retake. Narrow viewport controls were inspected. No real print job or Phase 3 work was performed.

## Phase 3 — completed

- [x] Express backend with local-only binding, host/origin restrictions, exact dimensions/payload validation and size limit.
- [x] Browser packs final processed upright pixels (576 × 576 / 41,472 bytes); no original photo or client-generated printer commands sent.
- [x] Backend uses approved rotation/32-row leading and trailing whitespace/feed-and-partial-cut. No re-dithering; selectable photo look is preserved in exact submitted bits.
- [x] Serial queue capped at five pending/active jobs; UUID idempotency, payload-conflict rejection and bounded recent metadata.
- [x] Image buffers cleared after send/failure. No disk photo storage or automatic retries. Failed transmissions also fail waiting jobs to avoid continuing an uncertain raster stream.
- [x] UI locks duplicate submits, polls status, distinguishes submission from physical completion, reuses the same ID after unknown outcomes, and allows explicit new attempts after known failures.
- [x] Same-origin /api calls via Vite proxy; built frontend can be served by the backend.
- [x] One-command development startup with Node child processes; verified alternate-port startup/proxy health and cleanup.
- [x] 31 automated checks, ESLint and production build passed. Network tests needed permission to bind ephemeral localhost ports; no physical printer used in automated tests.
- [x] Browser end-to-end synthetic Atkinson capture → real Print photo → API → queue → LAN TCP → submitted. User confirmed physical receipt printed and cut correctly, with the thicker visual bottom margin.
- [x] Updated run instructions, API contract, retry limits and troubleshooting notes.

Live local frontend remains at 127.0.0.1:5173 and print service at 127.0.0.1:4174, targeting 192.168.2.120:9100. The currently running frontend and backend were started separately during integration; future npm run dev starts both. On fresh startup ensure no earlier instances occupy these ports. Phase 4 (phone guest HTTPS/public safeguards) is still not started.

## Working release checkpoint — 2026-10-30

Prepared v0.1.0 as the first working LAN-printing release. Preserved the exact two legacy comparison dependencies under experiments/legacy and updated the comparison import so a clean checkout is self-contained. The separate nested thermal-photobooth copy Git repository remains local and ignored. Production behavior is unchanged; version and lockfile identify the checkpoint.
