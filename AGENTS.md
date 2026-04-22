<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This project uses **Next.js 16** (App Router) with **Tailwind CSS v4** and **Payload CMS v3**. APIs, conventions, and file structure may differ from your training data. Refer to the [Next.js docs](https://nextjs.org/docs) and the rest of this file before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# AGENTS.md — Portfolio 2025

> This document is the single source of truth for any AI agent working on this codebase.
> Read this FIRST before making any changes.

---

## Project Overview

Personal portfolio website for **Juan Bedoya** — Software Developer with an electronics engineering background and passion for AI. The site showcases projects, blog notes, and an about page, all managed through a headless CMS.

**Live URL env:** `NEXT_WEB_APP_PUBLIC_URL`

---

## Tech Stack

| Layer         | Technology                                    |
| ------------- | --------------------------------------------- |
| Framework     | **Next.js 16** (App Router, Turbopack in dev) |
| CMS           | **Payload CMS v3** (Lexical RichText)         |
| Database      | **PostgreSQL** (via `@payloadcms/db-postgres`) |
| Styling       | **Tailwind CSS v4** (NOT v3 — this matters!)  |
| Fonts         | DM Sans (body) + Roboto (headings) via `next/font/google` |
| Deployment    | **Vercel** (with `@vercel/analytics`)         |
| Media Storage | `@payloadcms/storage-vercel-blob`             |
| Code Blocks   | **Shiki** (dual-theme syntax highlighting)    |

---

## Architecture

### Route Groups

```
src/app/
├── (app)/              ← Public-facing frontend
│   ├── layout.tsx      ← Root layout with Navbar, Footer, Analytics
│   ├── globals.css     ← Frontend Tailwind + custom styles
│   ├── page.tsx        ← Homepage (/)
│   ├── about/          ← /about
│   ├── notes/          ← /notes (blog listing with filters/sort)
│   │   ├── loading.tsx ← Skeleton loader for instant navigation
│   │   └── [slug]/     ← /notes/[slug] (individual blog post)
│   │       └── loading.tsx ← Article-specific skeleton
│   └── projects/
│       └── [slug]/     ← /projects/[slug] (individual project)
│           └── loading.tsx ← Project-specific skeleton
├── (payload)/          ← Payload CMS admin panel
│   ├── layout.tsx      ← Admin layout
│   └── payloadStyles.css ← Custom admin UI styles (see "Payload Admin Styling" below)
├── sitemap.ts          ← Dynamic sitemap (fetches slugs from Payload)
└── robots.ts           ← Dynamic robots.txt
```

### Key Directories

```
src/
├── collections/        ← Payload CMS collection configs
│   ├── blog/           ← Blog collection + hooks/revalidateBlog.ts
│   ├── blogtags/       ← Blog tag taxonomy
│   ├── projects/       ← Projects collection + hooks/revalidateProject.ts
│   ├── tags/           ← Project tags
│   ├── tech/           ← Technologies
│   └── media/          ← Media uploads
├── components/
│   ├── RichText/       ← Custom Lexical RichText renderer
│   │   ├── index.tsx   ← Main RichText component
│   │   └── converters/ ← Custom JSX converters (heading, code, link, list-item)
│   ├── blogs/          ← Blog cards, filters, skeleton, table of contents
│   ├── common/         ← Hero, BlockContent, BlockImage, GalleryLightbox
│   ├── projects/       ← Project cards, skeleton
│   ├── navbar/
│   └── footer/
├── lib/
│   └── payload/
│       ├── actions.ts  ← ALL data fetching functions (see "Caching" below)
│       └── utils/      ← Utilities like extractHeadingsFromBlocks
└── globals/            ← Payload global configs (About, HomePage, BlogPage)
```

---

## Caching Strategy

**CRITICAL: Every data-fetching function uses `unstable_cache` with explicit tags.**

This is safe because every Payload collection has `afterChange` and `afterDelete` hooks that call `revalidateTag()`.

| Function           | Cache Key           | Tag             | Notes                                    |
| ------------------ | ------------------- | --------------- | ---------------------------------------- |
| `getAllProjects`    | `all-projects`      | `projects`      |                                          |
| `getProjectBySlug` | `project-by-slug`   | `projects`      |                                          |
| `getProjectSlugs`  | `project-slugs`     | `projects`      | Used by `generateStaticParams` + sitemap |
| `getAllBlogs`       | `filtered-blogs`    | `blogs`         | Accepts `tagIds[]` and `sortOption`      |
| `getBlogBySlug`    | `blog-by-slug`      | `blogs`         |                                          |
| `getBlogSlugs`     | `blog-slugs`        | `blogs`         | Used by `generateStaticParams` + sitemap |
| `getAllTags`        | `all-blog-tags`     | `blog-tags`     |                                          |
| `getAboutPage`     | `about-page`        | `about-page`    | Global                                   |
| `getBlogPage`      | `blog-page`         | `blog-page`     | Global                                   |
| `getHomePage`      | `home-page`         | `home-page`     | Global                                   |

### Revalidation Hooks

- `src/collections/blog/hooks/revalidateBlog.ts` → calls `revalidateTag("blogs")` + `revalidatePath("/notes")`
- `src/collections/projects/hooks/revalidateProject.ts` → calls `revalidateTag("projects")`

> **IMPORTANT:** If you add a new cached function, you MUST ensure the corresponding Payload collection hook calls `revalidateTag` with the matching tag. Otherwise the cache will serve stale data permanently.

---

## Tailwind CSS v4 — Critical Differences

This project uses **Tailwind v4**, NOT v3. Key differences:

1. **No `tailwind.config.js`** — Configuration is done via `@theme inline {}` blocks in CSS.
2. **`@variant dark`** instead of `dark:` prefix in `@apply` inside CSS files.
3. **`!important` in `@apply` is ILLEGAL** — Use the `!` prefix on individual utilities: `@apply !bg-foreground/10` (not `@apply bg-foreground/10 !important`).
4. **`@custom-variant`** is used for custom dark mode: `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *))`.
5. **Preflight is intentionally disabled** in `payloadStyles.css` to avoid breaking Payload's admin UI. Do NOT uncomment it.

---

## RichText Rendering Pipeline

Payload CMS uses **Lexical** for rich text. Custom converters are registered in `src/components/RichText/converters/index.tsx`:

```typescript
export const jsxConverter: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  ...headingConverter,   // Adds IDs to h2s for ToC navigation
  ...codeConverter,      // Shiki syntax highlighting
  ...linkConverter,      // Custom link styling
  ...listItemConverter,  // Interactive checklist items
});
```

### Interactive Checklist Items
- `InteractiveChecklistItem` is a Client Component that manages local checkbox state.
- Uses custom Lucide `Check` icon (not native checkbox).
- Checked state applies `line-through` + opacity to both regular and `<strong>` text via `[&_strong]:` arbitrary variants.
- State resets on page refresh (intentionally not persisted).

### Table of Contents Navigation
- `extractHeadingsFromBlocks()` pulls h2 headings from Payload block content.
- `TableOfContents` component uses manual `history.pushState()` + `element.scrollIntoView()` to bypass Next.js router hash caching.
- **Why:** Next.js ignores hash navigation if the hash is already present in the URL. The manual bypass ensures clicking the same heading link twice still scrolls.

---

## SEO Infrastructure

### Dynamic Sitemap (`src/app/sitemap.ts`)
- Fetches all blog and project slugs from Payload CMS.
- Priority hierarchy: `/` (1.0) → `/projects/*` (0.9) → `/about`, `/notes/*` (0.8).

### Dynamic Robots (`src/app/robots.ts`)
- `userAgent: "*"` — allows all crawlers.
- Disallows `/admin/` and `/api/` paths.

### JSON-LD Structured Data
- **Homepage:** `Person` schema (name, url, jobTitle).
- **Notes/[slug]:** `Article` schema (headline, author, datePublished, image).
- **Projects/[slug]:** `CreativeWork` schema.

### Metadata
- Root layout uses `title.template: "%s | Juan Bedoya"`.
- Every page overrides `generateMetadata()` with data from Payload.
- OpenGraph + Twitter card images are pulled from Payload's `metaImage` field.

---

## Security Headers (`next.config.ts`)

Applied globally via `headers()` in next config:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN` (allows Payload admin iframes)
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `Referrer-Policy: strict-origin-when-cross-origin`

---

## Payload Admin Styling (`payloadStyles.css`)

The admin panel has extensive custom CSS. Key patterns:

| Selector                    | Purpose                                           |
| --------------------------- | ------------------------------------------------- |
| `.nav`                      | Sidebar container — rounded top-right, tinted bg  |
| `.nav__link`                | Sidebar links — rounded pills, hover transitions  |
| `.nav__link:not([href])`    | Active page indicator (Payload renders active link as `<div>`, not `<a>`) |
| `.nav__link-indicator`      | **HIDDEN** — Payload's native black bar, removed via `display: none` |
| `.btn--style-primary/secondary` | Rounded buttons with shadow                  |
| `.doc-header__title`        | Inverted pill header (dark bg, white text)         |
| `.card`                     | White bg in light mode, bordered in dark mode      |

> **GOTCHA — Payload Active Links:** Payload renders inactive sidebar links as `<a class="nav__link">` but the ACTIVE page as `<div class="nav__link">` (no `href`). That's why `.nav__link:not([href])` is the correct selector for the active state. Do NOT use `a.active` or `a[aria-current]`.

### React Component Overrides
In addition to CSS, the Payload admin panel is white-labeled using custom React components injected via `payload.config.ts`. These components are located in `src/components/payload/`:
- **Logo / Icon:** Replaces the default Payload branding in the sidebar and login screens.
- **CustomAvatar:** Replaces the default user gravatar in the bottom-left corner of the sidebar.

---

## Loading Boundaries

Each dynamic route has a dedicated `loading.tsx` that mirrors the exact layout of that page to prevent layout shifts:

| Route               | Skeleton Mirrors                                |
| -------------------- | ----------------------------------------------- |
| `/notes`             | Hero + BlogFilters + BlogsSkeleton              |
| `/notes/[slug]`      | Hero (with back button) + BlockContent + ToC    |
| `/projects/[slug]`   | Title + Date + BlockContent + ToC               |

> **Why `/notes` is dynamic:** It accepts `searchParams` (tags, sort), which forces Next.js to SSR it on every request. The `loading.tsx` ensures instant client-side navigation despite the SSR delay.

---

## Bundle Analyzer

Installed and configured:
- Package: `@next/bundle-analyzer` (devDependency)
- Script: `yarn analyze` (or `npm run analyze`)
- Uses `cross-env ANALYZE=true next build`

---

## Known Gotchas & Lessons Learned

1. **Blog sort with same `publishedAt`:** If two blogs have identical `publishedAt` timestamps, sorting by "Newest"/"Oldest" appears broken because the DB falls back to arbitrary ID ordering. This is a data issue, not a code bug. Fix: ensure unique timestamps.

2. **Tailwind v4 `!important`:** Never use `@apply ... !important;` — it crashes the PostCSS compiler. Use `@apply !className` prefix syntax instead.

3. **Payload Preflight:** The `tailwindcss/preflight.css` import is commented out in `payloadStyles.css`. Uncommenting it will destroy the entire Payload admin UI layout.

4. **`unstable_cache` with dynamic args:** The cache key string (e.g. `["filtered-blogs"]`) is static, but `unstable_cache` internally hashes the function arguments too. This works correctly for different `tagIds[]` + `sortOption` combinations.

5. **Next.js hash navigation:** The Next.js router ignores clicks on hash links if the hash is already in the URL. The ToC component manually bypasses this with `history.pushState` + `scrollIntoView`.

6. **`yarn payload generate:types`:** Run this whenever the CMS schema changes to regenerate `src/payload-types.ts`.

---

## Environment Variables

| Variable                    | Purpose                        |
| --------------------------- | ------------------------------ |
| `NEXT_WEB_APP_PUBLIC_URL`   | Base URL for sitemap/JSON-LD   |
| `DATABASE_URI`              | PostgreSQL connection string   |
| `PAYLOAD_SECRET`            | Payload CMS encryption key     |
| `BLOB_READ_WRITE_TOKEN`     | Vercel Blob storage token      |

---

## Common Commands

```bash
yarn dev              # Start dev server (Turbopack)
yarn build            # Production build
yarn analyze          # Bundle analysis with visual treemap
yarn payload generate:types  # Regenerate TypeScript types from CMS schema
```
