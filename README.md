# RECALL: Personal History Intelligence

Recall is a privacy-first personal history intelligence web application that mimics the clean, minimalist, editorial design language of **Zara.com** (vast whitespace, neutral black/white/gray palette, elegant typography, subtle interactions, and high-quality cards).

It functions **local-first** in your browser, utilizing a Chrome Manifest V3 Extension to securely fetch browsing history, storing records inside IndexedDB, and calling the Nvidia Nemotron-3 AI API for natural language queries, summaries, and behavioral insights.

---

## 1. Project Directory Structure

```
cool-goodall/
├── extension/                   # Chrome Manifest V3 Extension
│   ├── manifest.json            # Extension configuration & permissions
│   ├── background.js            # Background worker retrieving chrome.history
│   ├── content.js               # Content bridge relaying web app requests
│   ├── popup.html               # Minimal popup UI
│   └── popup.js                 # Popup click handling
├── src/                         # React Web Application source
│   ├── main.tsx                 # App rendering node
│   ├── index.css                # Global styles, fonts, and Zara design tokens
│   ├── App.tsx                  # Tab routing and IndexedDB synchronization logic
│   ├── types/
│   │   └── index.ts             # TypeScript definitions
│   ├── db/
│   │   ├── indexedDB.ts         # Promise-based IndexedDB utility methods
│   │   └── demoData.ts          # Sample browsing data generator
│   ├── services/
│   │   ├── extensionBridge.ts   # secure window.postMessage relay
│   │   ├── aiService.ts         # Nvidia Nemotron API integrations (Summaries & Chat)
│   │   └── searchService.ts     # Fuse.js keyword search and category inferencing
│   └── components/              # Minimal layout elements
│       ├── Header.tsx           # Fixed header with logo & status indicators
│       ├── DashboardTab.tsx     # Timelines & summaries
│       ├── SearchTab.tsx        # Semantic query bar & streaming AI chat
│       ├── InsightsTab.tsx      # Recharts visualizations & habits
│       ├── SettingsTab.tsx      # Local database controls & API credentials
│       └── common/              # Shared UI components
│           ├── Button.tsx
│           ├── Card.tsx
│           ├── Modal.tsx        # Slide-out drawer inspection sheet
│           └── Skeleton.tsx
├── package.json                 # Project dependencies & scripts
├── vite.config.ts               # Vite bundler options
└── tsconfig.json                # TypeScript compilation parameters
```

---

## 2. Setup & Development Instructions

### Prerequisite
Ensure you have Node.js (v18+) and npm installed.

### Step 1: Install Dependencies
Clone the repository and install packages:
```bash
npm install
```

### Step 2: Set Up the Chrome Extension
1. Open Google Chrome.
2. Navigate to `chrome://extensions`.
3. Enable **Developer mode** (toggle in top right).
4. Click **Load unpacked** (button in top left).
5. Select the `cool-goodall/extension` folder.
6. The extension is now loaded and will run silently to service Recall history requests.

### Step 3: Run Dev Server
Launch the React development server:
```bash
npm run dev
```
Open your browser to the local URL (usually `http://localhost:5173`).

### Step 4: Run Tests
Run the unit test suite:
```bash
npm run test
```

---

## 3. Zara-Style Design Language

Recall is styled to feel like a high-end fashion catalog rather than a dense data console:
- **Whitespace**: Over 50% of the screen remains empty to give items breathing room.
- **Color Scheme**: 
  - Background: Absolute white (`#FFFFFF`)
  - Primary text: Off-black (`#111111`)
  - Subheadings/Muted text: Mid-gray (`#666666`)
  - Borders/Dividers: Ultra-thin lines (`#EEEEEE`)
- **Typography**: Inter (imported from Google Fonts). Uppercase tracking for buttons/labels (`letter-spacing: 0.25em`), and extra tracking on the main logo (`tracking-[8px]`).
- **Drawer Panels**: Details are inspected via a right-hand slide-out sheet (`src/components/common/Modal.tsx`) instead of standard modals, mimicking Zara's product drawers.
- **Skeletons**: Skeletons use clean grey containers to transition state smoothly during AI query execution.

---

## 4. AI Prompt Engineering & Processing

Recall integrates with the Nvidia Nemotron-3 model (`nvidia/nemotron-3-ultra-550b-a55b`) using the provided API key.

### A. Summarization Prompt
```typescript
`You are a premium, highly sophisticated digital diary editor. 
Your goal is to synthesize a user's web browsing logs into a high-end, third-person narrative. 
Avoid clunky summaries. Write in an elegant, minimalist, and slightly literary tone.
Structure your response strictly as a JSON object...`
```

### B. Natural Language Intent Prompt
```typescript
`You are a search intent parser for personal browsing history.
Analyze the user's natural language query and extract search parameters.
Return a JSON object with optional fields: keywords, relativeTime, category, and domain...`
```

### C. Chat Reasoning Mode
We enable the model's **reasoning/thinking process** dynamically. The reasoning steps stream into a designated monospace text container, showing the AI's internal path before outputting the final user-facing text.

---

## 5. Local-First Privacy Architecture
1. **Zero External Logging**: No usage metrics or trackers exist in the codebase.
2. **IndexedDB Sandbox**: All history is stored in your browser's private database. Purging is handled via the Settings panel.
3. **API Key Security**: The API key is stored locally in the browser's `localStorage` and never leaves your device.
4. **LLM Context Isolation**: Only cleaned page metadata (titles, categories, visit count) are sent to the AI api to generate summaries. Raw user inputs or parameters are never stored in third-party clouds.

---

## 6. Deployment Guide

### Web Application (Vercel)
Recall can be deployed instantly to Vercel:
1. Install Vercel CLI: `npm i -g vercel`.
2. Run `vercel` from the root directory.
3. Vercel automatically detects Vite/React configuration. The production domain must be configured in `extension/manifest.json` under `content_scripts` to allow the extension bridge to function.

### Chrome Extension (Chrome Web Store)
To package the extension:
1. Compress the `/extension` directory into a `.zip` file.
2. Navigate to the [Chrome Web Developer Dashboard](https://chrome.google.com/webstore/devconsole).
3. Create a developer account, upload the `.zip`, and request `history` permissions.
4. Add clear video demonstrations showing how the history is synced to your localhost dashboard to satisfy Google's sensitive permissions audit.

---

## 7. Monetization & Future Roadmap

- **Premium Sync Service**: Provide optional, end-to-end encrypted cloud synchronization using Supabase RLS and client-side AES-GCM passphrases for multiple devices.
- **Local Vectors**: Upgrade keyword matching to client-side vector search using a WASM-based implementation of `Transformers.js` to create embedding vectors locally without any API cost.
- **Behavioral Analytics**: Charge for in-depth productivity analysis, including focus score charts and distracted web blocking.

---

## 8. Risks and Mitigation Strategies

- **Extension Permissions Warning**: Google flags extensions requesting `"history"` permissions. *Mitigation*: Provide clear warnings on the settings tab explaining exactly why the history permission is requested.
- **IndexedDB Space Limits**: Browsers cap IndexedDB space (often 20% of disk space). *Mitigation*: Limit the stored history records to 20,000 items, auto-purging old items when exceeding the threshold.
- **API CORS Restrictions**: Standard web pages face CORS challenges hitting external LLMs. *Mitigation*: The Chrome Extension content script relays the API call from the background worker context where CORS constraints do not apply.
