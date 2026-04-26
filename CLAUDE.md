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
