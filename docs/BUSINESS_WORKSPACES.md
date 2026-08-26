# Business workspace foundation

Phase 4Q introduces a private organization boundary and owner, admin, analyst and
viewer role vocabulary for future Business collaboration. A signed-in customer
may create one workspace and becomes its owner. Membership and audit writes are
server-controlled; customers can read only workspaces they actively belong to.

Invitations, shared portfolios, organization billing and trading are deliberately
absent. The foundation does not activate checkout, charge collection, brokerage
routing or live execution.

After merge, deploy with `DEPLOY_PHASE_4Q`, then run the query-only production
verification with `VERIFY_PHASE_4Q`.
