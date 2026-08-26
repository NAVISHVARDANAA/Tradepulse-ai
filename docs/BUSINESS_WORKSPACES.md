# Business workspace foundation

Phase 4Q introduces a private organization boundary and owner, admin, analyst and
viewer role vocabulary for future Business collaboration. A signed-in customer
may create one workspace and becomes its owner. Membership and audit writes are
server-controlled; customers can read only workspaces they actively belong to.

Invitations, shared portfolios, organization billing and trading are deliberately
absent. The foundation does not activate checkout, charge collection, brokerage
routing or live execution.

The Phase 4Q foundation initially shipped with invitations disabled.

Phase 4R adds seven-day in-app invitations matched to the recipient's signed-in
email, bounded by the workspace seat limit. Owners and admins can view members
and suspend non-owner access. External invitation email, organization billing,
shared portfolios and trading remain disabled.

After merge, deploy with `DEPLOY_PHASE_4R`, then run the query-only production
verification with `VERIFY_PHASE_4R`.
