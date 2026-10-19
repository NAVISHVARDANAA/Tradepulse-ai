# Phase 9F event-to-market impact brief

Phase 9F moves TradePulse from audience-planning infrastructure to a concrete
customer workflow: turning one market-moving event into a reviewable impact
hypothesis in about five minutes.

## Real problem statement

**Research fragmentation under time pressure:** when a shipping disruption,
interest-rate surprise, commodity supply shock or export restriction occurs,
self-directed investors, analysts and globally exposed SME operators must move
between headlines, market screens, supplier context and spreadsheets to answer
four basic questions:

1. What changed?
2. How could the event transmit into markets or operating exposure?
3. What evidence supports or contradicts that path?
4. How fresh and trustworthy is each observation?

The fragmented workflow is slow and encourages a dangerous shortcut: treating a
price move as proof that the event caused it. Phase 9F puts the event frame,
transmission hypothesis, source-labelled observations, confirmation signals and
counter-signals in one workspace.

## Who it serves

| User | Immediate job | Phase 9F output |
| --- | --- | --- |
| Self-directed investor | Understand portfolio exposure without chasing a headline | Asset watchlist, transmission path and thesis-invalidating signals |
| Analyst or researcher | Build a fast first-pass event brief | Source/timestamp context, explicit assumptions and corroboration checklist |
| Globally exposed SME operator | Assess cost, FX, supplier or delivery risk | Operator questions covering suppliers, inventory, contracts, cash flow and FX thresholds |

## What is real now

- Four real-world scenario structures cover logistics, monetary policy,
  commodity supply and trade-policy shocks.
- The active market route is reused. If a market observation exists, its value,
  change, source and timestamp are displayed. If it is missing, Phase 9F says so
  and does not create a replacement number.
- The user can edit the working claim, choose an investor, operator or analyst
  lens, set severity and horizon, and mark evidence they personally checked.
- The resulting brief is copied or downloaded locally as plain text. Nothing is
  uploaded, sent, persisted, published or converted into an alert.
- The guided demo now begins with the customer problem—explaining a live event—
  before moving into the broader market and analytics surfaces.

## What “real time” means here

Phase 9F solves a **real-time reasoning problem**, not the separate commercial
problem of licensing a continuous market/news feed. Every observation retains
its source and timestamp. Old observations are labelled as reference context;
the product never upgrades them to a real-time claim.

A licensed real-time experience still requires provider rights, redistribution
entitlements, credentials, mapping, freshness monitoring, canary evidence,
incident ownership and an explicit release decision. Those controls remain
independently blocked.

## Safety and release boundary

The brief is a scenario hypothesis. It is not proof of causation, a price
prediction, personalised advice or an instruction to trade. Phase 9F adds no
migration, provider connection, news scraper, external analytics, messaging,
account provisioning, alert creation, order routing, payment, money movement,
funding, custody or settlement.

Publishing the candidate only makes the code reviewable. Building requires
`BUILD_PHASE_9F`; deployment requires `DEPLOY_PHASE_9F`; production verification
requires `VERIFY_WEB_PHASE_9F`. None of those actions is performed by the Phase
9F feature or its release checks.
