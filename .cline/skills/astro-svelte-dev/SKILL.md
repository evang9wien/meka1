---
name: astro-svelte-dev
description: Guidance for developing and modifying Astro (.astro) and Svelte (.svelte) files in this project, including the flowbite-svelte component library. Use whenever writing, editing, or reviewing Astro pages/components, Svelte components/islands, or when questions come up about Astro/Svelte/Flowbite-Svelte APIs, client directives, content collections, or type errors. Always run the required check command after code changes in these files.
---

# Astro + Svelte + Flowbite-Svelte Development

This project (`@onwidget/astrowind`) uses Astro as the main framework with Svelte
as an interactive-islands framework, styled with Flowbite Svelte components.

## Stack Versions (source of truth: `package.json`)

Always re-check `package.json` if unsure — these were current as of skill creation:

| Package | Version |
|---|---|
| `astro` | `^7.0.7` |
| `@astrojs/svelte` (Astro↔Svelte integration) | `^9.0.1` |
| `svelte` | `^5.56.3` (Svelte 5, runes mode) |
| `flowbite-svelte` | `^1.33.1` |
| `flowbite-svelte-blocks` | `^2.1.0` |
| `flowbite-svelte-icons` | `^3.1.0` |
| `flowbite` (base CSS/JS) | `^4.0.2` |
| `@astrojs/check` (powers `astro check`) | `^0.9.9` |
| `typescript` | `^5.9.2` |

Since Svelte is on major version 5, prefer **runes syntax** (`$state`, `$derived`,
`$effect`, `$props`, `$bindable`) for **new** Svelte code. Existing components in
`src/components/svelte/` mostly use the legacy `export let` / Svelte 4 style —
match the existing style of the file you are editing rather than mixing syntaxes
in the same component, unless explicitly asked to migrate it.

## Documentation Lookup (MCP servers) — use before guessing APIs

This workspace has two documentation MCP servers configured. Consult them instead
of relying on memory whenever working with Astro or Svelte/SvelteKit APIs,
directives, runes, or configuration options:

- **`astro-docs` MCP** → tool `search_astro_docs`. Use for anything Astro-specific:
  routing, `getStaticPaths`/`paginate`, content collections (`astro:content`,
  `astro/zod`), client directives (`client:load`, `client:only`, etc.), image
  handling (`astro:assets`), configuration reference.
- **`svelte-docs` MCP** → tools `list_sections` then `get_documentation`. Use for
  Svelte 5 runes, template syntax, lifecycle, stores, and SvelteKit-specific docs.
  Always call `list_sections` first to find the right section name/path, then
  fetch it with `get_documentation`.

For anything touching both frameworks (e.g. embedding a Svelte component in an
Astro page), check `astro-docs` for the `client:*` directive semantics.

## Mandatory validation after code changes

### After editing any `.astro` file (or any `.ts`/`.d.ts` file that affects Astro
type inference, e.g. `src/types.d.ts`, `src/content.config.ts`, `tsconfig.json`)

Run:

```bash
npx astro check
```

- The task is only done when this reports `0 errors` (warnings/hints ideally 0
  too, but don't introduce new ones).
- If the command reports new errors/warnings that weren't present before your
  change, fix them before considering the edit complete.
- `astro check` also type-checks embedded Svelte islands as used from `.astro`
  files (via `@astrojs/svelte`), so it partially covers Svelte usage too.
- Make sure `tsconfig.json` still excludes `dist` (build output) — if `dist` is
  ever removed from `exclude`, `astro check` will report false-positive errors
  from minified build artifacts.

### After editing any `.svelte` file

Run `svelte-check`, the Svelte-native equivalent of `astro check`, via `npx`
(no local dependency is installed, so `npx` will fetch it on demand):

```bash
npx svelte-check --tsconfig ./tsconfig.json
```

- This project currently has a pre-existing, noisy baseline of `svelte-check`
  findings unrelated to typical single-component edits (legacy Svelte 4 style
  props, implicit `any` in some `.ts` helpers, etc.). Because of this, compare
  the error count **before and after your edit** rather than expecting a clean
  `0 errors` result:
  1. Run `svelte-check` once before your edit (or note the count from the most
     recent run) as a baseline.
  2. Run it again after your edit.
  3. Confirm no *new* errors/warnings were introduced in the file(s) you
     touched. Investigate and fix any that were.
- Always also run `npx astro check` after Svelte changes if the component is
  used from any `.astro` file — it validates the props passed across the
  Astro/Svelte boundary (a common source of type errors in this project).

### General rule

Never tell the user a change is complete without having actually run the
relevant check command(s) above and shown/verified the result in this
conversation.

## Known project-specific gotchas

- **`client:only` needs an explicit framework hint.** A bare `client:only` on a
  Svelte component causes Astro to infer the wrong prop types (spurious
  `ComponentInternals` overload errors from `astro check`). Always write
  `client:only="svelte"`.
- **Tuple props inferred as arrays.** Values like
  `const view = [48.22, 16.36]` are inferred as `number[]`, but Svelte props
  typed as `[number, number]` (fixed-length tuples) will then fail to match.
  Annotate explicitly: `const view: [number, number] = [48.22, 16.36]`.
- **Inline `<script>` tags in `.astro` files** that use plain browser globals
  (e.g. Google Analytics' `window.dataLayer`/`gtag`) must have `is:inline`,
  otherwise Astro processes them as modules and `astro check` reports errors
  about undeclared globals.
- **`astro:content` zod re-export is deprecated.** Import `z` from
  `astro/zod` instead of `astro:content`, and prefer `z.url()` over the
  deprecated `z.string().url()`.
- **`Item.image` / gallery components accept both a plain URL string and an
  `{ src, alt }` object.** When touching `src/components/ui/ItemGridImage.astro`
  or similar, guard with `typeof image === "string"` before accessing
  `.src`/`.alt` — assuming it's always an object breaks the image grid layout.
