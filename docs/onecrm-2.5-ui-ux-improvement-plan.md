# OneCRM 2.5 UI/UX Improvement Plan

## Findings

The current React/Ant Design interface already has the right product direction: deep navy navigation, gold accent, warm workspace surfaces, compact customer navigation, explicit server card expansion, and a distinctive VPN workflow card system. The main weaknesses are inconsistent component vocabulary, excess top spacing, too many inactive navigation items, scattered CSS colors, and one oversized page component that makes future design iteration risky.

## Design Language Improvements

- Use a single OneCRM token layer for background, surface, raised surface, accent, semantic colors, text, borders, shadows, radii, and spacing.
- Keep the current navy/gold brand direction. Do not reintroduce EnvPortal blue/white styling.
- Treat customer sections as primary panels, server cards as secondary cards, and info blocks as light inline panels. Avoid deep nested-card visual weight.
- Keep VPN workflow cards visually stronger than ordinary info blocks because VPN guidance is a product differentiator.
- Normalize icon buttons to fixed square sizes and icon-only labels for copy/open/download/remote actions.

## Information Architecture Improvements

- Main navigation exposes only usable product areas. Hidden future modules should not appear as active clickable items.
- The customer environment page remains the primary page for maintenance. Editing happens from server card three-dot menus and local edit states.
- The data navigator remains the customer navigation surface. It should stay visible on desktop and collapse or move above content on smaller screens.
- Top keyword search remains reserved for future full-text search and should stay hidden until needed.

## Density and Layout Improvements

- Compress `hero-top` into a compact workspace header.
- Reduce tag filter and stat card vertical footprint.
- Use business-relevant stats: customer count, server count, VPN-managed customers, current issues.
- Keep collapsed server cards compact. Empty cards must not reserve blank detail space.
- Preserve explicit expand/collapse controls and keep their hit area stable at the top-right of the server card.

## Componentization Improvements

Split the current large environment page into focused components:

- `DashboardStats`
- `DataNavigator`
- `OrgSection`
- `EnvironmentCard`
- `EnvironmentEditors`
- `VpnGuidePanel`
- `VpnWorkflow`
- `RemoteActions`
- `OneTag`

The first iteration should extract low-risk components first: navigation, stats, tag, and remote action helpers. The environment card can be split further after visual behavior is stable.

## Responsive Improvements

- `1280px`: narrower data navigator, compact stat cards.
- `1100px`: data navigator moves above content or collapses into a lighter panel.
- `760px`: server card action area wraps; VPN selector occupies its own row if needed.
- `520px`: hide non-critical stats, keep copy/open/remote buttons fixed to the right of each info row, and prevent text overlap.

## Verification Requirements

- `npm run build` must pass.
- `python -m compileall onecrm hermes` must pass after backend-adjacent changes.
- Japanese default and Chinese cached-language switching must remain correct.
- Tag colors must match between filter buttons and card tags.
- VPN toggle, inherited tags, RDP download, Guacamole, certificate download, and copy buttons must not regress.
- Desktop, 1K-width, tablet, and phone layouts must not overflow horizontally.

## Prioritized Implementation Order

1. Document 2.5 product and technical requirements.
2. Introduce shared design tokens and reusable tag component.
3. Clean main navigation and compact the header/stat/filter areas.
4. Extract low-risk components.
5. Add responsive breakpoints.
6. Run build and targeted regression checks.
