# Product navigation and mobile UX

Phase 4U replaces the flat product link list with five stable groups: Overview,
Research, Investing, Business and Account. Every previously available product
destination remains reachable; this phase changes navigation presentation, not
authorization, data access or execution boundaries.

Desktop users receive keyboard-operable grouped menus. At widths of 1040 pixels
or less, the header uses one expandable mobile menu with 44-pixel minimum touch
targets. The current section and group are derived from viewport position,
exposed through `aria-current`, and updated immediately when a destination is
selected. Escape closes any open navigation surface.

`npm run check:navigation` enforces the five groups, all 20 unique destinations,
their matching application section IDs, and the required accessible-menu state.
CI and the protected production web-artifact workflow both run this contract.

## Release procedure

This phase has no database migration or Edge Function deployment. After merging
to `main`, run **Actions → Build production web release**, select `main`, and
enter `BUILD_PHASE_4U`. The artifact remains host-neutral and does not publish
the application to a hosting provider.
