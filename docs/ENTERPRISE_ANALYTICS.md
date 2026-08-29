# TradePulse enterprise analytics

## Product intent

Analytics Studio applies proven enterprise-analytics patterns without copying
proprietary product code or visual design. TradePulse keeps its own evidence-led
experience and regulated-product boundaries.

| Reference capability | TradePulse implementation |
| --- | --- |
| OAC subject areas and governed semantic metrics | Markets, forecasts, equities and trade subject areas with visible formula, grain and certification state |
| OAC drill paths and explainable calculations | Segment cross-filtering, row drill-through and source-to-report lineage |
| Power BI slicers and report interactions | Search, dynamic category slicer, sorting and clickable distribution bars |
| Power BI bookmarks and exports | Device-local saved report views and filtered CSV export |
| Snowflake governed data products | Named origins, governed relations, completeness, evidence timestamps and a warehouse-ready semantic boundary |

## Current runtime boundary

The production runtime continues to read approved Supabase Postgres relations
and security-invoker views. Row-level security and existing display-qualification
rules remain authoritative. Analytics Studio does not bypass RLS, query private
records, recompute model qualification or create an execution instruction.

Snowflake is not connected by this phase. The UI states that fact explicitly.
The report catalog separates source, governed data, semantic definition and
consumer layers so a future warehouse adapter can implement the same contracts
without changing the customer meaning of a metric.

## Interaction model

- Select one governed subject area.
- Search and slice by the subject's natural segment.
- Select a distribution bar to cross-filter the report table.
- Drill into one row to see source-specific evidence.
- Save up to eight filter-only views on the current device.
- Export only the rows visible after filters; the export contains no hidden or
  private fields.
- Load Analytics Studio as a deferred browser chunk so the controlled-beta
  landing shell remains within its existing initial-load performance budget.

## Future warehouse activation gates

Before connecting Snowflake or another enterprise warehouse:

1. Define typed ingestion and semantic contracts with reconciliation evidence.
2. Enforce organization and customer isolation at the warehouse and API layers.
3. Add query budgets, caching, workload controls and cost observability.
4. Prove lineage, freshness, completeness and duplicate controls in CI and production.
5. Complete security, privacy, market-data licensing and operational review.

No warehouse connection is an authorization to trade, charge, transfer, settle
or move customer funds.
