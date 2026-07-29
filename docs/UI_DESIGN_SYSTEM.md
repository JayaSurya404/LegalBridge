# UI design system

## Philosophy

The interface combines modern Indian public-institution trust with premium legal SaaS clarity without resembling a government portal. It favours calm hierarchy, evidence visibility, cautious status language, and document readability over decorative AI imagery.

## Tokens

| Role | Value | Use |
| --- | --- | --- |
| Deep navy | `#10233F` | Primary actions, navigation, headings |
| Navy hover | `#183657` | Interactive navy state |
| Warm cream | `#F7F2E8` | Document and secondary surfaces |
| Warm white | `#FCFAF6` | Application canvas |
| Saffron | `#E5972D` | Restrained emphasis and active source |
| Muted green | `#35755A` | Verified, completed, approved |
| Amber | `#A86614` | Review required and pending |
| Red | `#A63B3C` | Blocked, rejected, invalidated |
| Slate | `#617084` | Secondary text |

Colour never acts alone; icons and explicit status text accompany it. Focus uses a strong amber outline and offset.

## Typography and document reading

System sans-serif supports UI scanning. Georgia supplies headings and the motion document, creating an editorial legal tone without loading external fonts. Body text remains at least 14px on dense surfaces and 16px in forms on mobile. Legal text uses approximately 1.8 line height and a restrained reading width.

## Spacing, radii, borders, shadows

The spacing system follows a 4px base with common gaps of 12, 16, 20, 24, and 32px. Controls have 8px radii, cards 16px, and panels 12px. Borders use cool slate-grey; review states tint the border rather than replacing structure. Shadows are restrained (`0 8px 26px` with low-opacity navy).

## Layout rules

- Workspace content is capped at 1600px and remains fluid below that.
- Desktop sidebar is 256px expanded or 80px collapsed.
- Page headers keep eyebrow, title, description, synthetic badge, and actions in a consistent sequence.
- Repeated metrics use responsive 2/4-column grids.
- Dense content becomes a single column before controls become cramped.
- Sticky navigation never covers page controls.

## Tables and records

Wide legal comparisons render as stacked cards, especially on mobile. Audit, document, workflow, authority, and citation records use the same card/border/status grammar. Long IDs and filenames wrap or truncate only when a full value remains available nearby.

## Mobile adaptation

At small widths the desktop sidebar disappears, a focus-trapped modal drawer provides navigation, page actions wrap, metric grids collapse, and comparison panels stack. Touch targets are at least 44px. Horizontal scrolling is reserved for the compact case-module navigation bar and does not create page-level overflow.

## Status language

- Green: verified, processed, completed, approved.
- Amber: pending, review, paused, revision.
- Red: rejected, blocked, invalidated.
- Slate/blue: queued, informative, source-linked.

## Motion

Motion is limited to hero entry, drawer/dialog presence, progress, active-node pulse, and standard micro-transitions. Both `prefers-reduced-motion` and the saved Reduced Motion preference reduce all animation and smooth scrolling to effectively zero. Long legal text is never animated.

## Print

Print styles hide application navigation and editing controls, remove card borders/shadows, retain the motion text, and append reviewer, version, mock hash, timestamp, synthetic-demo, and “Not automatically filed” notices.
