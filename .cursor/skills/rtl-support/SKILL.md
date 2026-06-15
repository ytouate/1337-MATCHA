---
name: rtl-support
description: Adds right-to-left support to pages, features, and components in React apps. Use when the user explicitly mentions RTL, Arabic, bidirectional text, mirrored layout, or locale-based direction switching.
---

Add robust RTL support to an existing page, feature, or component without breaking LTR behavior.

## MANDATORY PREPARATION

Use `frontend-design` and `harden` as companion skills for design quality and edge-case resilience.

Before editing:

1. Identify scope:
   - Single component
   - Full page
   - Feature flow (multi-step or modal)
2. Confirm direction strategy:
   - Global `dir` at app/document root
   - Local `dir` at page/feature container
3. Confirm if behavior must be:
   - RTL-only for one locale, or
   - Dynamically switchable between LTR and RTL at runtime

If runtime switching is required, prioritize logical CSS and avoid hard-coded left/right rules.

---

## RTL Implementation Workflow

Follow this sequence every time.

### 1) Set Direction Source of Truth

Use a single authoritative direction value (`'ltr' | 'rtl'`) derived from locale.

- Preferred:
  - Set `document.documentElement.dir` on locale change
  - Keep `document.documentElement.lang` in sync
- For isolated feature rollout:
  - Wrap feature root with `<div dir={direction}>...</div>`

Avoid conflicting nested `dir` values unless intentional.

### 2) Replace Physical Positioning with Logical Positioning

Convert directional styles:

- `left` -> `inset-inline-start`
- `right` -> `inset-inline-end`
- `margin-left` -> `margin-inline-start`
- `margin-right` -> `margin-inline-end`
- `padding-left` -> `padding-inline-start`
- `padding-right` -> `padding-inline-end`
- `border-left` -> `border-inline-start`
- `border-right` -> `border-inline-end`
- `text-align: left/right` -> `text-align: start/end`

If using utility classes, prefer logical or direction-aware variants over duplicated LTR/RTL branches.

### 3) Mirror Layout Intentionally

When direction changes, evaluate:

- Horizontal stacks (`row`, button groups, badges)
- Side panels/drawers
- Stepper/progress indicators
- Breadcrumbs
- Pagination controls
- Icon + label order

Use one of:

- CSS logical flow that naturally mirrors
- `row-reverse` only where semantics stay correct
- Explicit direction-based class toggles for complex layouts

Do not mirror everything blindly: brand marks, charts axes, and some numeric/time sequences may stay LTR.

### 4) Handle Bidirectional Text Correctly

Use bidi-safe patterns for mixed content:

- Keep localized prose in RTL locale text
- Isolate dynamic LTR tokens inside RTL text:
  - Emails
  - URLs
  - Phone numbers
  - Order IDs
  - Coupon codes

Recommended HTML helpers:

- `dir="auto"` on free-text user content
- `<bdi>` for short dynamic inline fragments
- `<bdo>` only when explicit override is required

### 5) Mirror Directional Icons and Motion

Audit icons that imply direction:

- Chevron, arrow, caret
- Back/forward navigation
- Next/previous step
- Expand/collapse direction cues

Rules:

- Keep semantic meaning stable ("Next" should point toward progression in current direction)
- Prefer icon sets/components that support RTL-aware mirroring
- If animation moves horizontally, invert translate direction in RTL

### 6) Forms and Inputs

Review field-level behavior:

- Text inputs/textarea for Arabic should use RTL direction where expected
- Numeric inputs often remain LTR for readability
- Placeholder alignment should follow content intent
- Validation/error text alignment should use logical start/end

For search/location/address features:

- Input alignment and dropdown alignment must match direction
- Suggestion list item structure should preserve readable token order

### 7) Popovers, Dialogs, Menus, and Toasts

Overlay positioning must use logical anchoring:

- Start/end aligned placement instead of left/right constants
- Close buttons and action groups should align logically
- Slide-in animations from "start" or "end" based on direction, not fixed side

### 8) Tables, Lists, and Data Displays

Use intentional rules:

- Text columns follow locale direction
- Numeric/currency columns may stay LTR or end-aligned based on readability
- Sort indicators and column-resize handles should match mirrored UX expectations

### 9) Accessibility and Keyboard Semantics

Do not break navigation:

- Tab order must still follow DOM order
- Screen reader labels remain localized and meaningful
- Focus rings/outline offsets should not be clipped after mirroring
- Keyboard shortcuts that depend on left/right arrows may need direction-aware behavior

### 10) Internationalization Integration

All user-facing text must remain translated.

- Ensure message catalogs cover newly introduced labels
- Avoid hardcoded English in RTL condition branches
- If string interpolation includes LTR tokens, wrap or isolate appropriately

---

## React + Tailwind Direction Patterns

Use these as defaults in this codebase.

### Pattern A: Direction from locale hook/store

```tsx
const direction: "ltr" | "rtl" = locale === "ar" ? "rtl" : "ltr";

return <section dir={direction}>{children}</section>;
```

### Pattern B: Direction-aware class composition

```tsx
const isRtl = direction === "rtl";
const rowClass = isRtl ? "flex-row-reverse" : "flex-row";
```

Use this sparingly. Prefer logical CSS first.

### Pattern C: Keep spacing logical

Prefer utilities that do not encode physical sides. If physical-side utility is unavoidable, gate it behind `isRtl`.

### Pattern D: Direction-aware icon rendering

```tsx
<ChevronRight className={isRtl ? "rotate-180" : ""} />
```

Only for icons whose meaning flips with reading direction.

---

## Verification Checklist (Required)

Copy and complete this checklist in your working notes:

- [ ] Root/page/container `dir` value is set from locale
- [ ] No accidental hard-coded `left`/`right` layout dependency remains
- [ ] Horizontal spacing and alignment are mirrored correctly
- [ ] Directional icons and carousels/steppers/pagination are correct
- [ ] Mixed RTL + LTR inline tokens render in correct reading order
- [ ] Forms (input text, placeholders, errors, helper text) are directionally consistent
- [ ] Menus/dialogs/popovers anchor and animate from correct side
- [ ] Keyboard and focus behavior remain correct
- [ ] i18n strings are complete and no hardcoded text introduced
- [ ] LTR regression check passed after RTL changes

---

## Test Matrix

Test both LTR and RTL for the exact changed scope.

1. Locale switch:
   - Toggle locale and confirm live direction update behavior
2. Responsive:
   - Mobile, tablet, desktop
3. Interaction:
   - Hover/focus/active/disabled/error states
4. Real content:
   - Long Arabic text
   - Mixed Arabic + URL/email/order code
   - Empty states and validation errors
5. Regression:
   - Ensure unchanged flows still behave identically in LTR

---

## Common Pitfalls

Avoid these failures:

- Only flipping text alignment but not layout semantics
- Overusing `row-reverse` and breaking keyboard/screen-reader expectations
- Mirroring non-directional assets unnecessarily
- Hardcoding icon direction in shared components
- Forgetting overlays, toasts, and transition directions
- Breaking truncation/overflow with long Arabic strings
- Introducing separate RTL-only codepaths with duplicated business logic

---

## Output Expectations For Agent Runs

When applying this skill, the agent should:

1. Identify all direction-sensitive UI surfaces in scope
2. Implement minimal, maintainable direction-aware changes
3. Preserve behavior parity between LTR and RTL
4. Update translations if new user text appears
5. Report:
   - What was changed
   - Which RTL cases were validated
   - Any residual risks or follow-ups
