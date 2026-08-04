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

### 4. Dynamic Scatter Dot Sizing & Overlap Badging
* **Dynamic Radius Calculation**: Use `calculateDotRadius(size, isSelected, isHovered)` from `scatterZoom.ts` in `CustomScatterDot` to scale dot radius dynamically from ZAxis area (`props.size`), clamped between $3.5\text{px}$ and $11\text{px}$:
  ```ts
  const { dotR } = calculateDotRadius(size, isSelected, isHovered);
  ```
* **Active Overlap Badging**: Render gold halo rings and overlap count badges only when `isHovered || isSelected` (`isActive && overlapCount > 1`). Offset overlap badges dynamically relative to `dotR`.

### 5. Rules of Hooks Invariant
* **Top-Level Hook Placement**: ALL hooks (`useMemo`, `useCallback`, `useEffect`) inside page components (`Dashboard.tsx`, `GlobalStats.tsx`) MUST be declared at the top level of the function component before ANY conditional logic or early `return` statements (`if (isLoading)`, `if (!activePlayer)`). Failing to do so throws React Error #310.

### 6. Persistent Selection Popovers & React Portal Overlays
* **Mount Location**: Mount persistent selection cards using `createPortal(..., document.body)` with `position: fixed` and `z-index: 10000`.
* **Graph Scrollbars**: Keep graph container `overflow-y: hidden`. Mounting via Portal floats popovers above all page elements without creating graph scrollbars.
* **Placement Math Checks**:
  * Horizontal flip: `selectedCoords.x > containerW / 2` -> flip left (`circleX - popW - 18`).
  * Vertical flip: `selectedCoords.y > 150` -> flip up (`circleY - popH - 10`).
* **Score Formatting**: Ensure score values in scatter tooltips and cluster badges are floored integers capped at $1,010,000$.

