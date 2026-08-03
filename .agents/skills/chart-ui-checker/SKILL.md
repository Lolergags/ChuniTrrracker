---
name: chart-ui-checker
description: Verification checklist for Recharts scatter plot interactions, SVG axis clipping, mobile touch gestures, and password manager suppression.
---

# Charting & UI Interaction Verifier

Use this skill when editing frontend charting components (`Dashboard.tsx`, `GlobalStats.tsx`, `ScatterScrollbar.tsx`, `ChartTooltips.tsx`).

## Interaction Checklist

### 1. Scatter Plot Asymmetric SVG Axis Clipping
* Ensure SVG `<clipPath id="custom-scatter-clip">` is defined inside `<defs>` with `<rect x="105" y="-500" width="10000" height="875" />`.
* Point `.recharts-scatter` to `clip-path: url(#custom-scatter-clip) !important`.
* Prevents scatter dots from bleeding onto Y-axis ($x=105$) and X-axis ($y=375$) tick numbers.

### 2. Password Manager Suppression
* Check all search inputs and autocompletes (`PlayerAutocomplete.tsx`, `App.tsx` search bar) for password manager suppression attributes:
  ```tsx
  data-1p-ignore="true"
  data-bwignore="true"
  autoComplete="off"
  autoCorrect="off"
  spellCheck="false"
  ```

### 3. Dual Range Sliders
* Do NOT stack native `<input type="range">` elements with `pointer-events: none`.
* Always use single-container custom components (`ScatterScrollbar.tsx`) with `onPointerDown`/`onPointerMove` DOM handlers.

### 4. Overlapping Scatter Dot Markers
* Ensure `CustomScatterDot` only renders gold halo rings and overlap count badges when `isHovered || isSelected` (`isActive && overlapCount > 1`).
* Unhovered and unselected dots must render as minimal `4.5px` semi-transparent circles to maintain clean scatter plots.
