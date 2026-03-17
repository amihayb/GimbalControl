# Dark Theme Implementation — Cursor Instructions

**Model:** claude-sonnet-4-5  
**Project:** Gimbal Control UI  

---

## Context to provide in your first message

Paste this into Cursor before giving any instructions:

> We are implementing a dark theme for the Gimbal Control app. The app currently uses a light blue-white theme. I will give you a color mapping table — apply it exactly as specified. Do not invent new colors. Do not modify layout, spacing, component structure, or logic. Only change color-related CSS properties.

---

## Color mapping table (paste this in full)

| Role | Light (current) | Dark (target) |
|---|---|---|
| App background | `#f7faff` | `#0e1520` |
| Panels & cards | `#ebf0f8` | `#131d2e` |
| Top nav bar | `#ebf0f8` | `#1a2535` |
| Button default bg | `#f7faff` | `#1e2d44` |
| Active / highlighted button | `#c9dbf9` | `#2c4168` |
| Hover state | `#b8cff7` | `#354d7a` |
| Action buttons (Send, toggles) | `#8b9dc3` | `#4a6fa5` |
| Action button hover | `#6d7fa3` | `#3a5a8c` |
| Primary text & icons | `#344563` | `#c8d8f0` |
| Active / hover text | `#202124` | `#e0eeff` |
| Status / muted text | `#6c757d` | `#5c6e8a` |
| Input field background | `#f9f9f9` | `#0e1520` |
| Borders & dividers | `#cccccc` | `#1e2d44` |
| Hover border | `#cccccc` (hover) | `#253349` |
| Toggle off state | `#cccccc` | `#2a3a54` |
| Toggle on state (thumb track) | `#8b9dc3` | `#4a6fa5` |

---

## Step-by-step instructions for Cursor

### Step 1 — Create the dark theme CSS variables

Tell Cursor:

> In the main stylesheet (or a new file `dark-theme.css`), add a `[data-theme="dark"]` selector that overrides all color variables using the dark values from the mapping table above. If the app already uses CSS custom properties, remap them. If it uses hardcoded hex values, create new variables now and wire them in.

---

### Step 2 — Apply to the top navigation bar

Tell Cursor:

> Find the top navigation bar component/styles. Change its background from `#ebf0f8` to `var(--color-nav-bg)` which should resolve to `#1a2535` in dark mode. Ensure text and icon colors use `var(--color-text-primary)` → `#c8d8f0`.

---

### Step 3 — Apply to the left sidebar (Motor Control panel)

Tell Cursor:

> Find the sidebar / Motor Control panel. Apply these dark values:
> - Panel background → `#131d2e`
> - Section title text → `#c8d8f0`
> - Field labels → `#8aa8d0`
> - Input fields: background `#0e1520`, border `#1e2d44`, text `#c8d8f0`
> - Active nav item (Movement Control): background `#2c4168`, text `#c0d8f8`
> - Inactive nav items: text `#8aa8d0`
> - Status text: `#5c6e8a`
> - Dividers: `#1e2d44`

---

### Step 4 — Apply to toggles (Connection Status, Motor On)

Tell Cursor:

> For the toggle switches:
> - Track in OFF state: background `#2a3a54`
> - Track in ON state: background `#4a6fa5`
> - Thumb (the circle): background `#0e1520` (dark mode — use near-black so it contrasts with the track)
> - Do not change the toggle size or animation

---

### Step 5 — Apply to the main Movement Control panel

Tell Cursor:

> In the main content area (Movement Control):
> - Background → `#0e1520`
> - Section titles → `#c8d8f0`
> - Field labels (TR, EL, Velocity) → `#8aa8d0`
> - Input fields: background `#131d2e`, border `#1e2d44`, text `#c8d8f0`
> - "Send to Angles" button: background `#2c4168`, border `#354d7a`, text `#a0bce8`
> - "Send to Angles" hover: background `#354d7a`
> - Horizontal divider lines: `#1e2d44`

---

### Step 6 — Apply to the D-pad

Tell Cursor:

> For the directional pad control:
> - Outer ring background → `#131d2e`, border → `#253349`
> - Center circle → `#1e2d44`, border → `#253349`
> - Arrow icons → `#5c6e8a` default, `#a0bce8` on hover
> - Do not change the size or hit areas

---

### Step 7 — Apply to Predefined Positions and Scenario buttons

Tell Cursor:

> For all secondary buttons (Predefined Positions grid, Scan / Demo 1 / Demo 2):
> - Default state: background `#1e2d44`, border `#253349`, text `#8aa8d0`
> - Hover state: background `#2c4168`, text `#c0d8f8`

---

### Step 8 — Add the theme toggle

Tell Cursor:

> Add a dark/light mode toggle button to the top nav bar (right side, before the Blau Robotics logo). On click, it should toggle `data-theme="dark"` on the `<html>` or root element. Persist the preference to `localStorage` under the key `gimbal-theme`. On load, read this key and apply the theme before first render to avoid flash.

---

### Step 9 — Verify

Tell Cursor:

> Do a final pass and check for any hardcoded hex color values that were not replaced by variables. Report any that remain. Also check that no layout properties (margin, padding, width, height, border-radius, font-size) were modified during the theming work.

---

## Notes for Cursor

- **Only change colors.** Do not refactor, rename, or restructure any component.
- If you are unsure which element a color applies to, ask before making the change.
- If the codebase uses a CSS-in-JS library (styled-components, Emotion, etc.), apply the same mapping via theme tokens rather than raw CSS selectors.
- If there is an existing theme system (e.g. MUI, Ant Design, Tailwind), extend it — do not bypass it with inline styles.
