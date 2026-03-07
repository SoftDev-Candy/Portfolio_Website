# Swastik Toprani Portfolio Website

A clean, data-driven portfolio website for personal branding, project showcase, and professional contact.

## Overview

| Topic | Details |
| --- | --- |
| Project Type | Static single-page portfolio |
| Core Stack | HTML, modular CSS, vanilla JavaScript |
| Data Source | Local JSON files (`assets/data/*.json`) |
| Current Theme | `winter` (set in `assets/data/site.json`) |
| Status | Actively maintained |

## Site Sections

| Section | Purpose | Main Data Source |
| --- | --- | --- |
| Portfolio | Project cards, filters, featured work | `assets/data/portfolio.json`, `assets/data/projects.json` |
| About | Introduction and profile summary | `assets/data/about.json` |
| Services | Skill/service cards | `assets/data/services.json` |
| References | Recommendation/contact cards | `assets/data/references.json` |
| Resume | Education, experience, project experience, skills | `assets/data/resume.json` |
| Contact | Embedded map + contact form config | `assets/data/contact.json` |
| Global Site Config | Theme, title, CV URL, footer config | `assets/data/site.json` |

## Feature Highlights

- JSON-driven rendering for most visible content (easy updates without changing layout code).
- Filterable portfolio categories (All, Highlighted, Game, System, Network).
- Responsive sidebar with profile info, social links, and contact shortcuts.
- GitHub telemetry widget (API-driven stats with local cache fallback).
- Visitor counter with multi-provider fallback strategy.
- Contact form submission through Formspree.
- Animated visual layer using fluid canvas effects.
- Modular CSS architecture (`tokens`, `theme`, `reset`, `layout`, `components`, `effects`, `overrides`).

## Project Structure

```text
Websitr/
|-- index.html
|-- README.md
|-- Fluids_v3/
`-- assets/
    |-- css/
    |   |-- 00-tokens.css
    |   |-- 01-theme.css
    |   |-- 02-reset.css
    |   |-- 10-layout.css
    |   |-- 11-base.css
    |   |-- 20-components.css
    |   |-- 90-effects.css
    |   `-- 99-overrides.css
    |-- data/
    |   |-- site.json
    |   |-- profile.json
    |   |-- about.json
    |   |-- services.json
    |   |-- references.json
    |   |-- resume.json
    |   |-- portfolio.json
    |   |-- projects.json
    |   `-- contact.json
    |-- images/
    `-- js/
        |-- app.js
        |-- fluid-init.js
        |-- dotfield.js
        |-- fx-dust.js
        |-- script.js
        `-- scroll-nav.js
```

## Run Locally

Because the app loads local JSON via `fetch`, run it through a local server (not `file://`).

```bash
# Option 1: Python
python -m http.server 5500

# Option 2: Node (no install needed if npx is available)
npx serve .
```

Then open `http://localhost:5500` (or the URL shown by your server).

## External Integrations

| Service | Usage |
| --- | --- |
| GitHub REST API | Sidebar telemetry stats |
| Formspree | Contact form delivery |
| CountAPI / CounterAPI | Visitor counter |
| visitor-badge.laobi.icu | Counter fallback badge |
| Google Maps Embed | Location map in Contact section |
| Ionicons CDN | Icon set |
| Google Fonts | Typography |

## Update Guide (Fast Edits)

| If you want to edit... | Update this file |
| --- | --- |
| Name, avatar, social links | `assets/data/profile.json` |
| Intro text | `assets/data/about.json` |
| Services cards | `assets/data/services.json` |
| Projects and filters | `assets/data/projects.json`, `assets/data/portfolio.json` |
| Resume timeline and skills | `assets/data/resume.json` |
| Contact form/map | `assets/data/contact.json` |
| Theme, title, favicon, footer | `assets/data/site.json` |

## Privacy and Scope

This README intentionally keeps implementation and personal details high-level. Sensitive/private information should stay out of public documentation and public JSON content.

## License

Personal portfolio project. Reuse patterns with attribution, but do not copy personal branding/content directly.
