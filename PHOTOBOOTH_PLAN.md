# Thermal Photobooth — Implementation Plan for Codex

## Project goal
Build a responsive photobooth website that runs on phones and computers. Users can take a picture using their device camera **or** choose an existing image from their gallery/files, preview a black-and-white thermal-receipt aesthetic, edit it, and download a print-ready PNG. **Phase 1 must work without a printer, backend, or paid services.** Later, connect an Xprinter XP-80T receipt printer through a MacBook-hosted Node.js print bridge.

## Stack
- **React + Vite** (JavaScript/JSX, no TypeScript unless requested)
- Plain CSS (responsive, mobile-first)
- Browser **MediaDevices / getUserMedia** for cameras
- **Canvas API** for cropping, mirroring, grayscale, brightness/contrast, dithering, layout, and PNG export
- No backend, database, accounts, cloud storage, or printer dependency in Phase 1
- Keep processing utilities separate from React UI components

## Phase 1 — Required functionality

### A. Choose a photo source
- Landing screen with **Take Photo** and **Upload Photo**.
- Works on mobile and desktop.
- Allow switching sources and returning to the landing screen.

### B. Camera capture
- Ask for camera permission only when the user chooses Take Photo.
- Show a **live thermal-effect preview**, framed as a **square (1:1)** photograph.
- Support front/rear camera switching where supported; show helpful fallbacks if unavailable.
- **Front camera: mirror both the live preview and captured/printed result.**
- **Rear camera: do not mirror.**
- Maintain consistent crop/orientation between preview and capture; use the same image-processing pipeline.
- Capture from the original camera frame at suitable resolution, not from a CSS-scaled screenshot.
- Stop camera tracks when leaving camera mode/unmounting, and handle permission denial or unavailable hardware gracefully.

### C. Gallery upload
- Use a file input accepting common image types (`accept="image/*"`).
- Display uploaded images in an interactive **square crop** with **zoom and reposition** (touch and mouse; provide accessible controls where practical).
- Show the thermal effect as the crop is adjusted.
- **Do not automatically mirror uploaded images.**
- Handle unsupported/corrupt files and large images gracefully; respect image orientation.

### D. Shared editing screen
- After camera capture **or** upload, enter the same photo editor.
- Show a near-real-time preview of the **final dithered square image in its Polaroid-style paper layout**.
- Controls:
  - **Brightness slider**, centered at a neutral default.
  - **Contrast slider**, centered at a neutral default.
  - **Reset** to defaults.
  - **Retake** (camera) or **Choose Another** (upload).
  - **Download PNG**.
- Keep the source image in memory and **reprocess from the original on each change**; never repeatedly modify already-dithered pixels.
- Use sensible slider ranges and update previews responsively; debounce or schedule work if needed for performance.
- Use **Floyd–Steinberg dithering** as the initial fixed algorithm. **Do not add a “dithering strength” slider in Phase 1.** Alternate dithering modes can come later.

### E. Image pipeline and export
- Processing order: **source → square crop/orientation/mirror → resize to print width → brightness/contrast → grayscale → Floyd–Steinberg dithering → compose Polaroid-style layout → PNG**.
- Final bitmap should be **pure black/white** (not grayscale) to approximate monochrome thermal output.
- Use a **configurable printer-width constant**; initially default to **576 pixels** as a provisional value, to verify against the actual XP-80T model before hardware printing.
- Square photograph area: 1:1. Surround with white margins, with a **larger bottom margin** for a Polaroid-like appearance. Keep these layout dimensions configurable.
- Export a PNG at its **native output dimensions**, with no resizing after dithering.
- The preview should closely match the exported image (allowing for actual paper/printer differences).
- No photo upload to a server in Phase 1; all photos stay in the browser unless downloaded.

### F. UX and reliability
- Clear flow: **Choose source → Capture / Select & crop → Edit / Review → Download**.
- Responsive touch-friendly interface, including small phone screens and desktop.
- Accessible buttons, slider labels, visible focus styles, meaningful error messages, and loading states where needed.
- Avoid unnecessary dependencies; prefer standard browser APIs.
- Test camera, upload, editing, and PNG download independently.
- Do not add a fake printer-success message. Optionally show a disabled **Print (coming later)** button, but download is the functional Phase 1 output.

## Suggested structure
```text
photobooth/
├── public/
├── src/
│   ├── components/
│   │   ├── SourcePicker.jsx
│   │   ├── Camera.jsx
│   │   ├── PhotoUpload.jsx
│   │   ├── PhotoEditor.jsx
│   │   ├── PhotoPreview.jsx
│   │   └── PhotoControls.jsx
│   ├── utils/
│   │   ├── imageProcessing.js
│   │   ├── imageCrop.js
│   │   └── imageExport.js
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
├── index.html
├── package.json
└── vite.config.js
```
Adjust component boundaries if a simpler organization is clearer.

## Development and testing
Start with:
```bash
npm create vite@latest photobooth -- --template react
cd photobooth
npm install
npm run dev
```
- Desktop camera access works on `localhost` in supported browsers.
- For camera testing on a phone connecting to the MacBook over LAN, use **HTTPS with a trusted local development certificate** (e.g., mkcert) and configure Vite to listen on the LAN. A plain `http://<MacBook-LAN-IP>` origin is generally **not** a secure context for mobile camera access.
- Confirm actual device/browser camera and file-input behavior; front/rear availability differs by device.

## Phase 2 — Printer integration (do not implement yet)
- Add **Node.js + Express** on the MacBook to serve the frontend and accept print requests.
- Convert the finished monochrome bitmap to **ESC/POS** raster commands and send to the **Xprinter XP-80T**.
- Prefer Ethernet/raw TCP if supported by the purchased variant; **USB is also acceptable** once a compatible macOS connection method is verified.
- Add a simple **sequential print queue**, input validation, size limits, and useful printer error feedback.
- Verify printer-specific **printable dot width, raster commands, port/interface, buffering, and paper/feed behavior** with the actual device; do not assume 576 dots or TCP port 9100 is guaranteed.
- The browser should send **only the final processed image** to the print bridge, not camera streams or original full-resolution photos.
- Keep the image-processing code and React screens independent of printer transport.

## Later possibilities (out of scope now)
- Public HTTPS access via a tunnel (e.g., Cloudflare Tunnel) and QR-code entry for events.
- Additional dithering algorithms, optional presets, and photo-download enhancements.
- Replacing the MacBook bridge with a Raspberry Pi or other always-on device.

## Codex instructions
1. **Implement Phase 1 only.** Do not implement the Node/Express backend or printer code yet.
2. Build the app incrementally, keeping it runnable at each stage.
3. Prioritize correct camera behavior, gallery cropping, consistent processing, and downloadable PNGs over visual flourishes.
4. Keep all photo-processing logic in reusable utility functions and keep printer-specific assumptions configurable.
5. Provide clear run instructions in `README.md`, including the HTTPS caveat for testing on phones.
6. At completion, explain what was implemented, how to run it, and any known browser/device limitations.

## Phase 1 acceptance checklist
- [ ] App runs with `npm install` and `npm run dev`.
- [ ] Mobile/desktop responsive source selection works.
- [ ] Camera capture works with mirrored front and unmirrored rear images.
- [ ] Live camera preview displays thermal dithering and a square composition.
- [ ] Gallery upload supports square crop, zoom, and reposition.
- [ ] Both sources reach the same editor.
- [ ] Brightness/contrast sliders and Reset work without cumulative degradation.
- [ ] Preview includes white Polaroid margins and larger bottom margin.
- [ ] Downloaded PNG is monochrome, square-photo-plus-frame, and matches preview.
- [ ] No printer or backend is required.
