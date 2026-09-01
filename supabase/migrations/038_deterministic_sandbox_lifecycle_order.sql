-- Phase 6B hotfix: make append-only sandbox lifecycle ordering deterministic.
-- Transaction timestamps are stable within a transaction, while receipt UUIDs
-- are random. A monotonic identity therefore provides the only reliable tie-break.

alter table public.broker_sandbox_order_receipts
  add column lifecycle_sequence bigint generated always as identity;

alter table public.broker_sandbox_order_receipts
  add constraint broker_sandbox_order_receipts_lifecycle_sequence_key
  unique (lifecycle_sequence);

create index broker_sandbox_receipts_root_sequence
  on public.broker_sandbox_order_receipts(
    user_id,
    root_client_order_id,
    lifecycle_sequence desc
  );

create or replace view public.broker_sandbox_order_lifecycle
with (security_invoker = true)
as
select distinct on (receipt.user_id, receipt.root_client_order_id)
  receipt.id,
  receipt.user_id,
  receipt.command_id,
  receipt.action,
  receipt.environment,
  receipt.root_client_order_id,
  receipt.client_order_id,
  receipt.symbol,
  receipt.side,
  receipt.order_type,
  receipt.time_in_force,
  receipt.order_class,
  receipt.quantity,
  receipt.limit_price,
  receipt.take_profit_limit_price,
  receipt.stop_loss_stop_price,
  receipt.estimated_notional_usd,
  receipt.provider_status,
  receipt.recovered_after_ambiguous,
  receipt.provider_recorded_at,
  receipt.created_at,
  false as browser_submission_enabled,
  false as live_order_routing_enabled
from public.broker_sandbox_order_receipts receipt
order by
  receipt.user_id,
  receipt.root_client_order_id,
  receipt.lifecycle_sequence desc;

grant select on public.broker_sandbox_order_lifecycle to authenticated;

comment on column public.broker_sandbox_order_receipts.lifecycle_sequence is
  'Monotonic internal sequence used only to deterministically order append-only lifecycle receipts.';

comment on view public.broker_sandbox_order_lifecycle is
  'Latest sanitized sandbox lifecycle state per customer order root, deterministically ordered by append sequence; no browser submission or live execution capability.';
