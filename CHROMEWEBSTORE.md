# Chrome Web Store Listing — Manhwa Voice

## Store Metadata

- **Extension Name**: Manhwa Voice — Comic & Webtoon Reader
- **Version**: 1.0.0
- **Summary**: Read English comic, manga, and manhwa dialogue aloud directly on web pages with offline OCR and automatic scrolling.
- **Category**: Accessibility / Productivity
- **Language**: English

---

## Detailed Store Description

Manhwa Voice brings comic, manga, and manhwa dialogue to life by reading dialogue bubbles aloud directly as you read on any comic website.

### Key Features:
- **Instant Speech**: Reads English dialogue bubbles aloud in clear, natural speech.
- **Automatic Scrolling**: Smoothly follows the dialogue down the page, keeping the active panel in view without touching your mouse or screen.
- **100% Local & Private OCR**: Optical character recognition runs entirely on your device inside your browser using WebAssembly. No comic images, dialogue text, or reading history are ever sent to remote servers or third-party APIs.
- **Background Scanning**: Starts narrating immediately as soon as the first panel is scanned, while continuing to process the rest of the chapter seamlessly in the background.
- **Playback Controls**: Full control over narration with Play, Pause, Resume, Stop, Next, Previous, and Repeat buttons, plus direct sentence jumping.
- **Voice & Speed Customization**: Choose any voice installed on your system and fine-tune narration speed from 0.7x to 1.5x.
- **Tall Webtoon Support**: Automatically slices ultra-tall strip comics into overlapping tiles, reconciles coordinates, and eliminates duplicate text.
- **Manual Scroll Override**: Freely scroll at any time; auto-following pauses temporarily and resumes predictably.

---

## Permissions Justification

| Permission | Technical Need | User Benefit |
|---|---|---|
| `activeTab` | Temporary access to the currently active comic tab upon user click. | Allows activating the speech reader and floating controller on the specific chapter tab you choose. |
| `scripting` | Programmatically injects the content script into the active tab. | Mounts the compact floating controller inside an isolated Shadow DOM on the reading page. |
| `storage` | Stores user settings locally via `chrome.storage.local`. | Remembers your preferred narration voice, reading speed, and auto-scroll preference across sessions. |
| `offscreen` | Runs an isolated offscreen document for Tesseract.js WebAssembly OCR. | Keeps the browser responsive by performing image text recognition in a separate background thread without freezing the webpage. |
| `optional_host_permissions` (`<all_urls>`) | Optional cross-origin image retrieval if host comic sites block direct canvas reading. | Only requested dynamically if cross-origin image decoding fails on a specific website. Never requested by default. |

---

## Privacy & Data Use Disclosure

1. **Does the extension collect personally identifiable information?**  
   **No.** Manhwa Voice collects zero personal data. There are no user accounts, no logins, no analytics, no telemetry, and no ad trackers.

2. **Does the extension transmit comic images or text to remote servers?**  
   **No.** All optical character recognition is performed strictly on your local machine using bundled WebAssembly binaries (`tesseract-core-simd.wasm`) and local language data (`eng.traineddata.gz`). Text-to-speech is rendered locally via your browser's Web Speech API.

3. **Data Storage**:  
   Only your local playback settings (voice selection, speed multiplier, auto-scroll toggle) are saved in `chrome.storage.local` on your device.

---

## Version History

- **v1.0.0** (Initial Release):
  - Complete Manifest V3 implementation with local Tesseract.js v5 WASM engine.
  - Multi-panel incremental scanning and reading queue.
  - Sentence-level utterance segmentation and comic reading order sorting.
  - Speech controller with Play/Pause/Resume/Stop/Next/Previous/Repeat.
  - Segment-driven smooth auto-scroll with manual interaction suspension.
  - Settings persistence for voice, speed (0.7x–1.5x), and auto-scroll.
  - Scoped Shadow DOM floating controller with minimization and hide support.
