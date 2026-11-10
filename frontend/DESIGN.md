# Frontend design system

Groven uses warm light surfaces, neutral charcoal dark surfaces, a locally bundled DM Sans variable font, and a compact workspace layout. Keep the original green and white Groven logo assets; workspace logos belong to their tenants. Public pages explain the product through a request workflow; authenticated pages prioritize the next action, request status, and readable conversations. Keep copy specific to the task and decoration restrained: no promotional badges, ornamental gradients, or glowing feature cards.

## Themes and tenant identity

- `src/index.css` owns light/dark semantic tokens. Use `layout-page`, `layout-card`, `surface`, `border`, and `text-*` utilities rather than hardcoded surface colors.
- `ThemeProvider` supports Light, Dark, and System inside menu/account settings. The preference persists under `groven-appearance`; the inline bootstrap in `index.html` applies it before React renders. Do not place theme controls in primary page navigation.
- Use `primary` with `on-primary` for filled controls and `primary-ink` for accent text. Tenant colors are adjusted independently for readable text and button contrast.
- `TenantBrandingProvider` validates the workspace slug, scopes cached identity to the hostname, and supplies the workspace logo, accent, title, and favicon. Never read the old unscoped `grove_tenant_branding` cache.
- Client entry, invitation, recovery, navigation, and request screens use workspace identity. The tenant homepage redirects to client sign-in or the signed-in workspace; the root domain retains Groven marketing.

## Responsive interaction

Workspace navigation uses a sidebar on larger screens and labeled bottom navigation on phones. Keep primary actions visible and reserve horizontal scrolling for intentionally scrollable controls or data tables, not the page itself.

Request conversations retain one mounted chat instance while changing between compact panels and wider split layouts. This preserves the draft and connection state. Forms and dialogs use visible labels, keyboard focus, Escape dismissal, and focus restoration through `useDialogFocus`.

Use short opacity/position transitions for feedback. `MotionConfig` and the global reduced-motion rules respect the operating system preference. Avoid decorative looping motion in work screens.

## Validation

From `frontend`, run:

```sh
npm ci
npm run lint
npm test -- --runInBand
npm run build
```

The redesign was checked in Chromium with isolated API fixtures across public, onboarding, provider, client, and administration flows; light and dark modes; and phone, laptop, and desktop widths (360–1600 px). Checks covered overflow, theme persistence, tenant isolation, search/filtering, request creation/review, dialog keyboard behavior, and draft recovery after failed chat sends. Branding unit tests include invalid colors and contrast adjustment.

Browser fixtures are visual/interaction evidence, not live integration coverage. Before release, verify real email/invitation delivery, OAuth, billing, file transfers, and realtime behavior against the deployment environment. ESLint currently reports warnings but no errors.
