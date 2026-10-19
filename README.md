# Thermal Photobooth

A browser-based photobooth that creates black-and-white thermal-style PNGs.

## Run locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL shown by Vite, usually `http://localhost:5173/`.

Useful checks:

```bash
npm run lint
npm run build
```

## Current functionality

- Upload an image and preview it.
- Crop, zoom, and reposition the image in a square frame.
- Capture an image from a camera on supported browsers.
- Switch between front and rear cameras where supported.
- Apply brightness, contrast, grayscale, and Floyd–Steinberg dithering.
- Download a Polaroid-style PNG.

All image processing happens in the browser. No image is uploaded to a server.

## Camera testing

Camera access generally works on a computer using `localhost`. For testing on a phone over a local network, use HTTPS with a trusted local development certificate, such as one created with `mkcert`. A plain `http://<MacBook-LAN-IP>` address is generally not a secure context for camera access.

Camera behavior and front/rear camera availability vary between browsers and devices.

## Printer status

Printer integration is not implemented yet. The current `576` pixel width is a configurable provisional value and must be verified against the actual Xprinter XP-80T before hardware printing is added.
