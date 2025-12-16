Color class replacement plan

Goal: Replace common hard-coded light/dark Tailwind color classes with theme-variable aware utilities and existing utilities like `.card`, `.container-dark`, `.btn-primary`, `muted-text`, and `border-border`.

Strategy:
- Prefer semantic utility classes (`card`, `container-dark`, `muted-text`, `btn-primary`, `ghost-btn`) over raw color tokens.
- Use `bg-surface` / `bg-background` / `.card` for panel backgrounds (instead of `bg-white`, `bg-gray-50`, `bg-gray-100`).
- Use `muted-text` / `text-foreground/50` for subdued text instead of `text-gray-600`, `text-gray-500`.
- Use `border-border` instead of `border-gray-200`/`border-gray-100`.
- Use `btn-primary` instead of hard `bg-green-600 text-white` or `bg-blue-600` combos.

Common replacements (safe suggestions):
- `bg-white` -> `card` (or `bg-surface` for non-elevated areas)
- `bg-gray-50` -> `bg-surface`
- `bg-gray-100` -> `bg-surface`
- `bg-gray-200` -> `bg-surface`
- `text-gray-700` -> `text-foreground` (or `muted-text` if subdued)
- `text-gray-600` -> `muted-text`
- `text-gray-500` -> `muted-text`
- `text-gray-900` -> `text-foreground`
- `hover:bg-gray-100` -> `hover:bg-surface` (verify hover contrast)
- `border-gray-200` -> `border-border`
- `border-gray-100` -> `border-border`
- `bg-blue-50` -> `bg-primary/10` or `bg-surface` depending on intent
- `bg-blue-600` (primary action) -> `btn-primary` (component class)
- `text-white` on buttons -> keep as-is if btn-primary used; otherwise ensure `text-primary-foreground` or `text-white` remains

Occurrences (example hits from the repo scan):
- `features/contacts/ImportContactsModal.tsx`:
  - `text-gray-700` (labels) -> replace with `muted-text` or `text-foreground`.
  - `text-gray-400` (file meta) -> `muted-text`.
  - `border-red-300 bg-red-50` (validation) -> keep red variants for error states, but consider `bg-error/10` if added.
- `features/messenger/ConversationList.jsx`:
  - `w-6 h-6 bg-blue-500 text-white rounded-full` -> for badges consider `bg-primary text-primary-foreground` or `rounded-full flex...` with `bg-primary`.
- `features/messenger/HoverStatusSelector.jsx` and `lib/status.ts`:
  - `text-gray-500` used for icon color -> replace with `muted-text` or `text-foreground/50`.

Notes & next steps:
1. This file is a plan and reference — actual replacements should be done conservatively per-component and verified visually.
2. For hover/bg replacements that affect accessibility, test contrast in both light and dark modes.
3. Suggested workflow: replace container/background classes first (`bg-white`, `bg-gray-*`, `border-gray-*`) then text classes, then button classes.
4. After replacements run `npx tsc --noEmit -p apps/frontend/tsconfig.json` and start dev server to verify runtime styling and fix any missing utility classes.

If you want I can now automatically apply replacements to a short list of high-impact files you name (Settings, messenger panels, ImportContactsModal). If you prefer to review before changes, I can produce a diff-preview for each file first.
