# Thermal Receipt Photobooth

Mobile browser photobooth for an XPrinter XP-80T on 80 mm receipt paper. The MacBook will process print jobs and send ESC/POS bytes over **Ethernet/LAN**, replacing the USB connection in the supplied project prompt.

**Phase 3 complete**: the React/Vite editor prints through a local Express service to the LAN printer. The user confirmed the end-to-end Atkinson test printed and cut correctly with the approved layout. The reference app in `thermal-photobooth copy` remains unchanged. HTTPS/mobile guest access is Phase 4 and has not started.

## Run the photobooth

```sh
npm install
npm run dev
```

One command starts both services: Vite at http://127.0.0.1:5173 and the local print backend at http://127.0.0.1:4174. Ctrl+C stops both. Use the project root, not the copy folder. React/React DOM provide the interface; Vite provides development and production builds; Express supplies the local print API. ESLint and its React plugins are development checks. There are no editing libraries, UI frameworks, router, remote fonts, or process-manager packages. Stop any older Vite/print-service processes before starting a fresh combined session.

```sh
npm run build
npm run lint
npm test
```

The flow is **Take or upload → shared editor → Print photo → print status**. Upload opens the device file picker directly. The editor combines crop, zoom, brightness, contrast, Reset, and an upright receipt preview. Drag the image or use the arrow buttons to reposition it. Retake/Choose another replaces the source; cancelling the file picker keeps the current edit. Unsupported or corrupt files show an error, and files larger than 25 MB are rejected.

The camera starts only after Take a photo. It uses a live square preview using the selected photo look at 576 × 576 and up to 8 frames per second, with front-camera mirroring and rear-camera output unmirrored when the device reports its facing direction. Capture starts a visible three-second countdown (3 → 2 → 1), then saves the original camera frame for the same full-quality thermal editor used by uploads. The live preview uses the same processing resolution as the final photo to keep dot texture consistent; capture still saves the original camera frame for editing. Capture and camera switching are disabled during the countdown; leaving the camera cancels it. The live preview and final editor share the same pixel-processing function. Camera tracks stop when leaving the camera or switching it. Browser camera access generally requires localhost or trusted HTTPS. HTTP access from a phone to a MacBook's LAN address is insufficient for camera testing; guest HTTPS is Phase 4. Actual iPhone/Safari, Android/Chrome, front/rear switching, and camera permission behavior still need testing on those devices.

Photo editing and dithering happen in browser memory. Only the final packed monochrome square is sent to the MacBook when Print photo is pressed; the original source never goes to the backend. The decoded original is preserved; changes run through square crop/mirroring, 576-dot resize, monochrome tone conversion, brightness, contrast, and the selected dithering method. A short debounce avoids processing every pointer event. One final monochrome result supplies the editor and demo result. There are no preview-only photo filters or repeated PNG encode/decode cycles. Reset restores the crop and all adjustments.

**Print photo sends a real job.** The button is locked immediately on submission. The status page shows sending, queued, submitted, or an error. Submitted means TCP data was sent; physical paper output is not confirmed automatically. A lost response can be retried with the same job ID without resending a remembered job. A printer error is never automatically retried. Check the printer/paper before an explicit retry; a failed connection may have transmitted part of the image. Back to editing after submission allows deliberate further adjustments and another print. Leaving an accepted job's page does not cancel it.

The backend rotates the already-processed photo once, adds the approved 32 leading and 32 trailing blank raster rows, and feeds/cuts. It never re-dithers, stretches, or decodes a JPEG/PNG. The preview remains upright. Completed/failed image buffers are released; no photos are written to disk. Browser state resets on refresh or starting another photo.

Desktop and 390-pixel phone layouts, file upload, native slider controls, reposition buttons, Reset, corrupt-image handling, and demo navigation were verified in the local browser. Thirty-one automated tests cover raster encoding, dithering, candidate algorithms, rotation, crop boundaries, and mirrored crop drawing. Physical phone/camera checks remain manual; viewport resizing does not prove device compatibility.

## Frontend structure

- `src/App.jsx`: source selection, file loading, and navigation using React state.
- `src/components/Camera.jsx`: camera start/switch/capture/cleanup.
- `src/components/Editor.jsx`: shared crop and adjustment controls, debounced processing, demo result.
- `src/components/Receipt.jsx`: upright paper proportions and the processed photo canvas.
- `src/utils/imageCrop.js`: viewport-independent, bounded crop geometry shared by camera and editor.
- `src/utils/imageProcessing.js`: source decoding and canvas processing.
- `src/components/DitherControls.jsx`: method dropdown and Floyd–Steinberg tuning, shared by camera and editor.
- `shared/photo-look.js`: pure pixel processing and default look (Atkinson).
- `shared/dither-options.js` and `shared/portra-monochrome.js`: shared algorithms and film-inspired tone conversion.
- `shared/dither.js`: pure dithering shared by browser and printer diagnostics.
- `printer/config.json`: verified raw print settings plus approximate upright preview margins. Preview geometry represents physical paper; raw raster dimensions account for transport orientation and the cutter.

## Standalone printer diagnostics

Node.js 20+ is sufficient for standalone printer diagnostics; the frontend was installed and verified with Node 24.12.0. No packages, printer drivers, USB libraries, or system configuration changes are required for the diagnostic scripts. Keep the MacBook and printer on the same reachable LAN.

The user supplied printer address **192.168.2.120**. TCP **9100**, text printing, a 576-dot raster pattern, and feed-and-partial-cut have worked in physical tests. Configuration lives in `printer/config.json`. Approved settings use a photo rotated 180°, 32 leading and 32 trailing blank rows, and `feed-partial` cutting. Turning the receipt upright places the printer's larger leading margin below the photo. This approach comes from the copy project's working encoder.

Run the following from this project directory. Each print command submits once, without retrying.

## Commands and workflow

1. Connection check: opens and closes a TCP socket without sending printer commands. It verifies reachability, not printer identity or ESC/POS support.

   ```sh
   node printer/test-printer.mjs probe
   ```

2. Text receipt: initializes the printer, centers a short ASCII message, then feeds 160 motion units (nominally 20 mm at 8 units/mm, subject to printer configuration). It does not cut.

   ```sh
   node printer/test-printer.mjs text --feed 160 --cut none
   ```

3. Width/polarity test: prints a 576 × 192 checkerboard with edge rules, then feeds to the cutter and requests a partial cut. Both edge rules should appear. Eight-dot checks should measure about 1 mm if density is 8 dots/mm.

   ```sh
   node printer/test-printer.mjs pattern --cut feed-partial
   ```

4. Image/layout test: prints a generated shaded sphere and gradient using Floyd–Steinberg dithering. The photo is 576 × 576, rotated 180°, with 32 leading and 32 trailing blank rows. Turn the finished receipt upright so its thicker white margin is below the photo. Calibrated raster: 576 × 640, packed MSB first, 1 = black, 72 bytes/row. It sends a single `GS v 0` raster, then a feed-and-partial-cut command. To reproduce the prompt's original unrotated 576 × 736 raster, use `--top 32 --bottom 128 --no-rotate`.

   ```sh
   node printer/test-printer.mjs polaroid --cut feed-partial
   ```

5. Separate cutter test, if needed: feeds to the cutter and requests partial cutting without printing an image.

   ```sh
   node printer/test-printer.mjs cut --cut feed-partial
   ```

To inspect encoding without printing, `--dry-run` writes a binary ESC/POS file and a portable bitmap (`.pbm`) preview of raster jobs. The PBM shows only printable pixels; physical side margins and cutter feed are not represented.

```sh
node printer/test-printer.mjs polaroid --dry-run /tmp/photobooth-test.bin
node --test printer/escpos.test.mjs
node printer/test-printer.mjs --help
```

Override a setting per run using `--host`, `--port`, `--width`, `--top`, `--bottom`, `--feed`, `--cut`, or `--band-height`. `--band-height 128` tests smaller raster bands if a future printer truncates full images. Cut modes `partial`/`full` send `GS V 1`/`GS V 0` directly; `feed-partial`/`feed-full` send `GS V 66 0`/`GS V 65 0`, allowing the printer to feed to its cutting position. Full cutting and banded output have not been physically tested.

## Physical calibration

Measure the printed photo width and height, the top/left/right white margins, and the distance from photo bottom to cut. Initial targets are a 72 mm square, roughly 4 mm top/side margins, and 16 mm bottom margin. Do not assume raster whitespace equals physical whitespace: cutter-to-head distance, previous cut position, and firmware feed all matter.

The user measured the photo at approximately 72 × 72 mm. Upright-in-feed printing left about 13 mm of leading whitespace even with no added top rows. Direct cutting did not reliably reduce that margin and shortened the bottom. The approved solution prints the photo upside down with 32 blank rows before and after it, then feeds and cuts. Turn the receipt upright to move the mechanical leading margin to the visual bottom. The user approved this output; its visual margins target roughly 4 mm above and 16–17 mm below. Exact final side and vertical measurements were not supplied. No reverse-feed commands or system setting changes are needed.

The `--top` and `--bottom` flags name leading/trailing raster whitespace in feed order. With rotation enabled, leading rows affect the visual bottom and trailing rows affect the visual top. Keep physical receipt preview geometry separate from transport orientation in later phases: rotate the final photo for the printer only. Do not add a border inside the photo or double-rotate it in the UI. Use `--no-rotate` only for diagnostics.

## Structure

- `printer/config.json`: LAN address and candidate layout/calibration settings.
- `printer/transport.mjs`: bounded TCP connection and single submission, no image encoding.
- `printer/escpos.mjs`: monochrome dithering, bit packing, raster encoding, feed/cut commands.
- `printer/patterns.mjs`: generated test pattern and dithered image.
- `printer/test-printer.mjs`: command-line diagnostics and dry runs.
- `printer/escpos.test.mjs`: encoding, band continuity, margin, and dithering checks.
- `PHOTOBOOTH_PLAN.md`: implementation status and hardware findings.

## Troubleshooting

- Timeout/refused connection: verify power, Ethernet link, address in the router/self-test receipt, the raw print port, and that the MacBook can reach that network. A DHCP-assigned address may change; check it again before changing printer settings. This tool does not alter network configuration or scan other devices.
- `EPERM`: the execution sandbox may block LAN connections; allow the specific diagnostic command when prompted, or run it from your own terminal.
- Nothing visible after text: inspect paper feed; the last printed lines may still be inside the printer. Check cover and paper state.
- Garbled image: stop further image jobs, check protocol/firmware and buffer state before retrying. Successful TCP submission alone does not verify raster compatibility.
- Clipped width: compare both edge rules and measure; `--width 512` can test a narrower mode if needed. Do not change the printer's stored settings based on a guess.
- Failed send: some bytes may already have reached the printer. Inspect it before retrying to avoid duplicate output. No automatic retry or confirmed physical-completion status is implemented.

Protocol references: Epson's [raster command](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lv_0.html) and [cut command](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_cv.html) document command semantics, **not XP-80T firmware compatibility**. The XP-80T behavior recorded above comes from this printer's tests.

## Dithering comparison experiment

While the development server is running, open http://127.0.0.1:5173/experiments/dithering.html. Choose a portrait to compare the actual old processing code, current Floyd–Steinberg, alternating-row Floyd–Steinberg, Atkinson, and Stucki against a grayscale reference. All candidates use the same centre crop and selected resolution. Images remain in browser memory. Start at neutral brightness/contrast; the old and new pipelines apply these controls in different orders, so non-neutral results also compare tonal adjustment behavior.

This separate development page remains a comparison tool; its controls do not change the main app’s selected look. It imports a preserved legacy processing snapshot from experiments/legacy as a reference; it is not part of the single-page production build. The initial gradient demonstrates dot texture rather than portrait quality. Browser upload, resolution selection, brightness and Reset were checked using a generated test image. Print testing of the alternatives remains pending.

The old and current algorithms use identical Floyd–Steinberg weights; a neutral grayscale gradient matched pixel-for-pixel in a local comparison. This does not establish identical results on all photos: float precision, crop/resampling, and non-neutral adjustment order can change patterns. The live processing resolution was increased from 256 to 576 dots to address the visible texture mismatch after capture; processing is capped at 8 fps for responsiveness. Physical phone performance still needs checking.

The comparison also includes **Portra-inspired B&W · Atkinson**: an original portrait-oriented monochrome mix with a smooth curve that lifts shadows/midtones and compresses the endpoints, followed by Atkinson dithering. It does not reproduce a specific Lightroom/XMP preset. No random grain is added; texture comes from dithering. This look is also selectable in the main app. Atkinson is the starting look based on the user’s preference.

## Live look selection and Floyd–Steinberg tuning

The camera and editor offer Atkinson (default), Portra-inspired B&W with Atkinson, Floyd–Steinberg, and Stucki. Selections persist between capture, editor, and retake within the current browser session. Changing looks does not restart the camera. The dropdown and tuning controls are disabled during the countdown to keep the captured look stable. Editor Reset restores Atkinson plus neutral crop and adjustments.

Floyd–Steinberg exposes diffusion strength (0–100%), threshold (64–192), and alternating scan direction. Standard values are 100%, 128, and alternating off; the restore button resets these while keeping Floyd–Steinberg selected. A useful experiment is 75% diffusion, threshold 128, alternating on. Zero diffusion is a plain threshold conversion. The standard 7/16, 3/16, 5/16, 1/16 kernel weights stay fixed; strength scales their total effect. The former alternating-row comparison is available through the scan-direction toggle. Settings are ignored by the other algorithms but retained when switching back.

A synthetic browser camera check verified look changes without restarting the stream, native tuning controls, restoration of standard settings, disabled controls during countdown, custom settings preserved after capture, and selection retained on retake. Production build, lint and all thirty-one tests pass. Actual mobile performance remains device-dependent. Printing is connected through the local backend.

## Print service

`npm run dev` is the normal development command for both frontend and backend. For a built local app, stop the development processes first, then run:

```sh
npm run build
npm start
```

Open http://127.0.0.1:4174. `npm run server` starts only the backend if you need it separately. `PRINT_SERVER_PORT` overrides its default 4174 port; the Vite proxy reads the same variable. `VITE_PORT` overrides development UI port 5173. Restart the backend after changing printer/config.json. The backend binds only to 127.0.0.1. LAN guest browsing and HTTPS have not been enabled.

- `server/encode-job.js`: server-owned layout, packed 180° photo rotation, ESC/POS raster/feed/cut.
- `server/print-queue.js`: sequential sends, bounded queue (five jobs including the active submission), duplicate-ID protection, failure handling and buffer release.
- `server/app.js`: validated Express API, local host/origin checks, request limits and built frontend serving.
- `server/index.js`: local service startup and printer configuration.
- `src/utils/printClient.js`: packs final upright 1-bit pixels and submits/checks a job.
- `scripts/dev.js`: starts/stops both local services without another dependency.

API: `POST /api/print` accepts application/octet-stream with exactly 41,472 packed bytes for a 576 × 576 photo. Each row is 72 bytes, MSB first, 1 = black. Required headers are X-Print-Job-Id (UUID), X-Photo-Width: 576, and X-Photo-Height: 576. No client-supplied ESC/POS command or transport target is accepted. Dimensions and payload size are checked before queuing. `GET /api/print/:id` returns queued/sending/submitted/error metadata; `GET /api/health` confirms the service is running, not that the printer is online.

Retries of the same ID/payload return the remembered job; reusing an ID for another image returns 409. The service retains at most 200 job IDs/fingerprints in memory for up to ten minutes (old terminal entries may be evicted at capacity). This history is lost on restart, so checking the printer remains necessary after an ambiguous error or service restart. No image bytes are retained after a submission ends. If a transmission fails, waiting jobs are marked failed without sending them into a possibly incomplete raster buffer. New attempts require an explicit user action.

The API allows local requests only, does not enable CORS, rejects cross-site origins, limits payloads, and bounds pending jobs. Public event access controls and rate limits belong to Phase 4 before any public exposure. No tunnel, account, database or printer settings were added.

Verification: all 31 automated checks pass, including HTTP validation/idempotency and real TCP to a fake printer. One real Atkinson receipt was submitted through the browser Print photo button, API, queue and LAN transport; the user confirmed successful image output, cutting and the thicker visual bottom margin. A separate-port startup test verified that the combined dev command starts both services and Ctrl+C stops both.

## First working release

Version 0.1.0 checkpoints the working local camera/upload/editor and LAN printing flow. The legacy comparison files are included under experiments/legacy so a fresh checkout does not depend on the local thermal-photobooth copy backup. That nested Git repository, installed dependencies, build output and local screenshots are excluded from the main repository.
