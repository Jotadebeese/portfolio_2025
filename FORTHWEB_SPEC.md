# Forthweb: Browser-Native Developer Utility Suite
**Architecture, Tool Directory & Payload CMS Integration Blueprint for `jotadebeese.com`**

---

## 1. Executive Concept

**Forthweb** is an open-source, privacy-first suite of everyday developer utilities embedded directly into your portfolio projects at `jotadebeese.com`.

### Core Philosophy
1. **100% Client-Side Execution**: Every tool runs strictly in the visitor's browser using native browser APIs (`HTML5 Canvas`, `Web Crypto API`, `Web Workers`, `FileReader`).
2. **Zero Server Costs ($0.00)**: No serverless functions, no background worker billing, no database storage for inputs.
3. **Zero-Knowledge Privacy**: User tokens, secrets, SVGs, and images never touch a server or network request.
4. **Portfolio Showcase**: Demonstrates modern full-stack mastery—blending Next.js 16 App Router, React 19, Tailwind CSS v4, and Payload CMS 3.28 into an interactive product experience.

---

## 2. High-Value Tool Directory (Curated for Software Engineers)

Below are the most frustrating daily developer friction points that can be solved entirely in the browser:

### A. Media & Frontend Performance
| Tool | What It Solves | Browser Technology |
|---|---|---|
| **Web Image Compressor & Ticker Simulator** | Batch compresses AVIF/WebP/PNG/JPG to WebP/AVIF, downsamples outliers, and simulates continuous infinite marquee scrolling. | `HTML5 Canvas`, `OffscreenCanvas`, `createImageBitmap`, `JSZip` |
| **SVG to Clean JSX / Lucide Converter** | Takes messy Figma/Illustrator SVGs, strips bloated metadata, converts attributes to camelCase (`stroke-width` $\rightarrow$ `strokeWidth`), and outputs clean TypeScript React components. | In-browser DOMParser, regex AST transform |
| **PWA & Favicon Asset Generator** | Upload 1 master logo $\rightarrow$ generates all web sizes (`16x16`, `32x32`, `180x180`, `192x192`, `512x512`) + ready-to-paste `manifest.webmanifest`. | `HTML5 Canvas`, `JSZip` |

### B. Security, Cryptography & Auth
| Tool | What It Solves | Browser Technology |
|---|---|---|
| **Secret & Cryptographic Key Generator** | Generates secure API keys (`sk_live_...`), random passwords, hex/base64 strings, and SSH/RSA public-private keypairs. | Native `crypto.getRandomValues()`, `SubtleCrypto` |
| **UUID (v4 & v7) + NanoID Studio** | Generates standard UUID v4 and the new **UUID v7** (time-ordered, ideal for database indexed primary keys) + customizable NanoIDs. | Native Web Crypto API |
| **Zero-Knowledge JWT Inspector** | Decodes Bearer JWT tokens, displays header & payload claims, and calculates expiry countdown without sending tokens over the wire (like `jwt.io` does). | `atob()`, native JSON parser |
| **Checksum & Hash Calculator** | Fast local hashing for text or files (SHA-256, SHA-512, MD5, SHA-1, HMAC). | `crypto.subtle.digest()` |

### C. Data & Schema Conversion
| Tool | What It Solves | Browser Technology |
|---|---|---|
| **JSON $\longleftrightarrow$ TypeScript Interface Generator** | Paste any raw JSON API response $\rightarrow$ generates strongly typed TypeScript interfaces with optional field detection. | Client-side AST schema generator |
| **JSON $\longleftrightarrow$ YAML / TOML Converter** | Bidirectional translation between serialization formats without network latency. | In-browser parsers |
| **JSON Formatter & Visual Diff** | Prettifies, validates, and highlights structural differences between two JSON payloads. | Diff algorithms, Prism/Shiki |

### D. DevOps & Backend
| Tool | What It Solves | Browser Technology |
|---|---|---|
| **Cron Expression Humanizer & Schedule Predictor** | Type any cron string (e.g. `*/15 9-17 * * 1-5`) $\rightarrow$ translates into plain English (*"Every 15 min between 9 AM and 5 PM, Mon-Fri"*) + lists next 5 upcoming executions. | Client-side cron-parser |
| **Base64 & URL Encoder / Decoder** | Instant bidirectional encoding/decoding for URLs, text, and binary image data-URIs. | Native `encodeURIComponent()`, `btoa()`, `atob()` |
| **CURL to Fetch / Axios / Python Code Generator** | Paste raw `curl` commands $\rightarrow$ converts to copyable Next.js `fetch()`, Axios, or Python `requests` snippets. | String parsing engine |

---

## 3. How It Integrates with Your Portfolio (`portfolio_2025`)

Your portfolio is built with **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4**, and **Payload CMS 3.28** using PostgreSQL.

Content on project pages is powered by a Payload **`blocks`** field (`src/fields/content.ts`), which is dynamically rendered by `BlockContent` (`src/components/common/block-content.tsx`).

Here is the exact architecture to make Forthweb tools editable from Payload Admin and rendered live on your website:

```
Payload CMS Admin
  │
  ▼ Add Block: "Interactive Tool"
  │ (Select tool: "image-optimizer", "secret-generator", etc.)
  │
  ▼ Stored in PostgreSQL (Project.content array)
  │
Next.js 16 Server Component (src/app/(app)/projects/[slug]/page.tsx)
  │
  ▼ Passes blocks to BlockContent (src/components/common/block-content.tsx)
  │
  ▼ Detects blockType === "interactive-tool"
  │
Client Component ("use client") (src/components/tools/ToolDispatcher.tsx)
  ├── <ImageOptimizer />   (Canvas, WebP encoding, Live Ticker)
  ├── <SecretGenerator />  (Web Crypto API, UUID v7)
  └── <JwtInspector />     (Zero-knowledge token decoder)
```

---

## 4. Exact Implementation Code for Your Codebase

### Step 1: Add the Tool Block to Payload CMS
In your portfolio file **`src/fields/content.ts`**, add a new block definition to the `blocks` array:

```typescript
// Add to the `blocks` array in src/fields/content.ts:
{
  slug: "interactive-tool",
  interfaceName: "InteractiveToolBlock",
  labels: {
    singular: "Interactive Dev Tool",
    plural: "Interactive Dev Tools",
  },
  fields: [
    {
      name: "toolType",
      type: "select",
      label: "Select Tool",
      required: true,
      defaultValue: "image-optimizer",
      options: [
        { label: "Web Image Optimizer & Ticker", value: "image-optimizer" },
        { label: "Cryptographic Keys & Secret Generator", value: "secret-generator" },
        { label: "Zero-Knowledge JWT Token Inspector", value: "jwt-debugger" },
        { label: "SVG to Clean React JSX/TSX", value: "svg-cleaner" },
        { label: "Cron Expression Humanizer", value: "cron-humanizer" },
      ],
    },
    {
      name: "heading",
      type: "text",
      label: "Custom Tool Title (Optional)",
    },
    {
      name: "description",
      type: "text",
      label: "Custom Subtitle / Description (Optional)",
    },
  ],
},
```

---

### Step 2: Update the Frontend Block Renderer
In your portfolio file **`src/components/common/block-content.tsx`**, import and render the tool dispatcher:

```tsx
// Inside src/components/common/block-content.tsx:
import ToolDispatcher from "@/components/tools/tool-dispatcher";

// Inside the data.map((block, index) => { ... }) loop:
if (block.blockType === "interactive-tool") {
  return (
    <div key={index} className="my-8 w-full">
      <ToolDispatcher
        toolType={block.toolType}
        heading={block.heading}
        description={block.description}
      />
    </div>
  );
}
```

---

### Step 3: Create the Client Tool Dispatcher
Create **`src/components/tools/tool-dispatcher.tsx`**:

```tsx
"use client";

import dynamic from "next/dynamic";
import React from "react";

// Dynamically import tools so visitors only download the JS for the tool they view
const ImageOptimizer = dynamic(() => import("./image-optimizer"), { ssr: false });
const SecretGenerator = dynamic(() => import("./secret-generator"), { ssr: false });
const JwtInspector = dynamic(() => import("./jwt-inspector"), { ssr: false });

type Props = {
  toolType: string;
  heading?: string | null;
  description?: string | null;
};

export default function ToolDispatcher({ toolType, heading, description }: Props) {
  return (
    <section className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-2xl backdrop-blur-md">
      {heading && <h3 className="text-xl font-bold text-white mb-1">{heading}</h3>}
      {description && <p className="text-sm text-zinc-400 mb-6">{description}</p>}

      {toolType === "image-optimizer" && <ImageOptimizer />}
      {toolType === "secret-generator" && <SecretGenerator />}
      {toolType === "jwt-debugger" && <JwtInspector />}
    </section>
  );
}
```

---

### Step 4: Sample Client-Side Tool Components

#### Example A: Cryptographic Keys & UUID v7 Generator (`secret-generator.tsx`)
```tsx
"use client";

import React, { useState } from "react";
import { Copy, Check, RefreshCw } from "lucide-react";

export default function SecretGenerator() {
  const [copied, setCopied] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState(() => generateHexKey(32));
  const [uuidV4, setUuidV4] = useState(() => crypto.randomUUID());
  const [uuidV7, setUuidV7] = useState(() => generateUuidV7());

  function generateHexKey(length: number) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Time-ordered UUID v7 (RFC 9562)
  function generateUuidV7() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const now = BigInt(Date.now());
    
    // Timestamp in first 48 bits
    bytes[0] = Number((now >> 40n) & 0xffn);
    bytes[1] = Number((now >> 32n) & 0xffn);
    bytes[2] = Number((now >> 24n) & 0xffn);
    bytes[3] = Number((now >> 16n) & 0xffn);
    bytes[4] = Number((now >> 8n) & 0xffn);
    bytes[5] = Number(now & 0xffn);

    bytes[6] = (bytes[6] & 0x0f) | 0x70; // version 7
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 1

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  function refreshAll() {
    setApiKey(generateHexKey(32));
    setUuidV4(crypto.randomUUID());
    setUuidV7(generateUuidV7());
  }

  function copy(val: string, key: string) {
    navigator.clipboard.writeText(val);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs uppercase font-mono tracking-wider text-zinc-500">Cryptographically Secure</span>
        <button onClick={refreshAll} className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300">
          <RefreshCw className="w-3.5 h-3.5" /> Regenerate All
        </button>
      </div>

      {[
        { label: "UUID v7 (Time-Ordered Database PK)", val: uuidV7, id: "v7" },
        { label: "UUID v4 (Standard Random)", val: uuidV4, id: "v4" },
        { label: "256-bit Hex Secret (API Key / JWT Secret)", val: apiKey, id: "key" },
      ].map((item) => (
        <div key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
          <div className="text-xs font-semibold text-zinc-400 mb-1">{item.label}</div>
          <div className="flex items-center justify-between gap-2 font-mono text-sm text-zinc-100">
            <span className="truncate">{item.val}</span>
            <button onClick={() => copy(item.val, item.id)} className="text-zinc-400 hover:text-white">
              {copied === item.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 5. Rollout Strategy

### Phase 1: Foundation (In Your Portfolio)
1. Add the `interactive-tool` block in `src/fields/content.ts`.
2. Hook up `ToolDispatcher` in `src/components/common/block-content.tsx`.
3. Create the first two tools:
   - **Web Image Optimizer & Ticker Simulator**
   - **Secret & Key Generator (UUID v7/v4, 256-bit API keys)**
4. Create the project **"Forthweb"** in Payload Admin with writeups, documentation, and embedded tools.

### Phase 2: Organic Developer Traffic
1. Add **Zero-Knowledge JWT Token Inspector**.
2. Add **SVG to Clean JSX / Lucide Component Converter**.
3. Share standalone links on Reddit (`r/webdev`, `r/nextjs`), X, and LinkedIn.

### Phase 3: Developer Utilities Hub
1. Give Forthweb its own clean landing layout within your portfolio or subroute (`/projects/forthweb`).
2. Add keyboard shortcuts (`Cmd+K` / search palette) to switch between utilities instantaneously.
