# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static HTML website for a Hebrew-language mortgage advisor business (Israel). No build system, no frameworks — pure HTML/CSS/Vanilla JS served directly.

## Development

No build step required. Open any `.html` file in a browser, or serve with any static file server:

```bash
npx serve .
# or
python -m http.server 8080
```

There are no tests, no linter, and no package manager in this project.

## Architecture

### Stack
- **Frontend:** Vanilla JavaScript with direct DOM manipulation
- **Styling:** CSS3 embedded in `<style>` tags inside each HTML file
- **Language/Direction:** Hebrew, RTL (`dir="rtl"`)
- **Backend:** Supabase (PostgreSQL + Storage) — no server-side code

### Supabase Integration
All data is read/written via the Supabase REST API using the anon key. The config variables `SUPABASE_URL` and `SUPABASE_KEY` are defined at the top of each HTML file's `<script>` block.

**Tables:**
- `reviews` — customer text reviews (fields: name, city, rating, text, image_url, approved, rejected)
- `video_reviews` — video testimonials (video_url for embeds, video_file_url for uploads)
- `feedback` — negative feedback submissions (1–3 stars)
- `articles` — knowledge-base articles (title, summary, body, category, image_url, published)
- `events` — events/news items

**Storage buckets:** `review-photos`, `review-videos`, `article-images`

Storage policies allow anonymous `INSERT` and `SELECT` — uploads go directly from the browser.

### Admin Panel (`admin.html`)
Password-protected (hardcoded password near top of file). Uses `sessionStorage` to persist login. Features tabs for: pending/approved/rejected reviews, video reviews, negative feedback, articles, events, and statistics (Chart.js).

Image cropping uses **CropperJS v1.5.13** (CDN). Charts use **Chart.js v4.4.0** (CDN). Both loaded via CDN only in `admin.html`.

### Public Pages Pattern
Public pages fetch data from Supabase at load time and render into the DOM. No reactive framework — UI updates are done by building HTML strings and setting `innerHTML`. The homepage loads 3 random approved reviews on each visit.

### Review Submission Flow
`review.html` → multi-step form → uploads image to `review-photos` bucket → inserts row into `reviews` table (pending, not yet approved) → admin approves/rejects via `admin.html`.

## Key Conventions

- The navigation bar must be identical across all pages — use `index.html` as the reference. When changing the nav (adding a link, renaming a section, etc.), update every HTML file.
- Each HTML file is self-contained: styles, scripts, and markup are all inline.
- `SUPABASE_URL` and `SUPABASE_KEY` are repeated in every file — update all files when changing.
- The admin password is set in `admin.html` (search for `ADMIN_PASSWORD`).
- `SITE_URL` in `admin.html` controls the share link sent to customers for the review form.

## Visual Design System

All pages — existing and new — must use the same design tokens and structural patterns. Never introduce new fonts, colors, or layout conventions.

### `<head>` boilerplate (must appear in every HTML file)
```html
<link rel="icon" type="image/png" href="תמונות/logo_main.png">
<link rel="shortcut icon" href="favicon.ico">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="manifest" href="site.webmanifest">
<meta name="theme-color" content="#1a3a5c">
```

### Color palette
| Token | Value | Usage |
|---|---|---|
| Primary dark blue | `#1a3a5c` | Nav, headings, buttons, card headers |
| Secondary blue | `#2a6496` | Gradients, accents, links |
| Dark navy | `#142d48` | Dropdown menu background |
| Background | `#f7f8fa` | Page body |
| Text primary | `#222` | Body text |
| Text secondary | `#444` | Paragraphs inside cards |
| Accent / CTA | `#e8a020` | CTA buttons, highlights |
| CTA hover | `#c98010` | CTA button hover state |
| Footer bg | `#111e2e` | Footer |

### Typography
- **Font stack:** `'Segoe UI', Arial, sans-serif`
- **Direction:** RTL (`dir="rtl"` on `<html>`)
- **Page title h1:** `font-size: 2.2rem` (mobile: `1.6rem`), white, inside `.page-header`
- **Section label:** `font-size: 1.25rem; font-weight: 800; color: #1a3a5c`
- **Card/box headings:** `font-size: 1.1rem; color: #1a3a5c`
- **Body text:** `font-size: 0.91–0.93rem; line-height: 1.55–1.7`

### Page header (blue gradient banner — every public page must have one)
```css
.page-header {
  background: linear-gradient(135deg, #1a3a5c 0%, #2a6496 100%);
  color: #fff; text-align: center; padding: 3.5rem 1rem 3rem;
}
.page-header h1 { font-size: 2.2rem; margin-bottom: 0.5rem; }
.page-header p  { opacity: 0.85; font-size: 1rem; max-width: 600px; margin: 0 auto; }
```

### Content width
All main content wraps in `.content-wrap { max-width: 860px; margin: 2.5rem auto 1rem; padding: 0 1rem; }`.

### Section label pattern
```html
<div class="section-label">🔍 כותרת</div>
```
Renders as bold colored heading with a horizontal rule extending to the right.

### Common components (copy CSS from an existing page, do not reinvent)
- `.intro-box` — white card with blue-right border, for explanatory text
- `.bank-card` / `.bank-card-header` / `.bank-card-body` — collapsible card with dark header
- `.channel-tabs` / `.channel-tab` / `.channel-content` — tab switcher inside a card
- `.step-list` — numbered step list with circular counters
- `.note-box` — amber warning/info box
- `.phone-box` — green phone-number box
- `.info-list` — icon + text list
- `.video-section` — white card with amber-right border, for YouTube embeds
- `.cta-section` — full-width dark blue CTA strip (always appears before footer)

### Footer (identical on every page)
```html
<footer>
  <span>© 2026 יחיאל ממן — יועץ משכנתאות</span> | כל הזכויות שמורות | האתר אינו מהווה ייעוץ פיננסי מחייב
</footer>
```

### Mobile breakpoint
All responsive overrides go inside `@media (max-width: 768px)`. Nav collapses to hamburger at this breakpoint.

### Dropdown hover — CRITICAL
The `@media` rule for desktop dropdown hover **must be written as a separate top-level rule**, never nested inside `.dropdown-menu {}`. Nesting it breaks hover in most browsers.

```css
/* CORRECT */
.dropdown-menu { display: none; position: absolute; top: 100%; right: 0; background: #142d48; min-width: 220px; box-shadow: 0 6px 16px rgba(0,0,0,0.35); border-radius: 0 0 8px 8px; list-style: none; padding: 0.3rem 0; z-index: 200; }
@media (min-width: 769px) { .dropdown:hover > .dropdown-menu { display: block; } }

/* WRONG — do not do this */
.dropdown-menu { display: none; ...
  @media (min-width: 769px) { .dropdown:hover > .dropdown-menu { display: block; } } ... }
```

Mobile dropdown (open/close on tap) is handled by JS — the CSS rule above is for desktop hover only.
