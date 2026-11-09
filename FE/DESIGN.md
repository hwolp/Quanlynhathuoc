# PharmaCare UI design

## Direction
A calm operational workspace for a pharmacy. White sidebar, muted sage canvas, deep teal actions, quiet blue/amber/rose semantic states. Basic React components with Tailwind utilities; shared navigation and statistics components live in `src/components/ui/workspace.tsx`.

## Tokens
- Primary action: #147d64; hover #10634f; white foreground.
- Main canvas: #f5f8f7; cards: #ffffff; borders: #e1eae7.
- Heading: #203c3b; body text: slate-700; secondary text: slate-500.
- System font: Segoe UI / Arial, supporting Vietnamese without remote font dependencies.
- Spacing: 4/8px rhythm, 16px card gap, 24–34px content gutters.
- Radius: 8–10px controls, 12–14px cards.

## UX
- Each role uses the same sidebar with an explicit active state.
- Inventory metric cards can apply low-stock/expiry filters.
- Search remains within the relevant page rather than the global header.
- Form labels are visible; password visibility can be toggled.
- Report empty states explain missing data; metrics are derived from actual vouchers.
- Mobile navigation wraps the workspace into a vertical layout; POS catalog and receipt stack.
- Focus indicators, semantic controls and reduced-motion support remain enabled.

## Sources applied
Local skills: ui-ux-pro-max (healthcare palette, legibility, focus and responsive guidance) and ui-styling (shared React primitives, semantic tokens, Tailwind layout). Flat surfaces were chosen over the suggested neumorphism to keep control boundaries clear.
