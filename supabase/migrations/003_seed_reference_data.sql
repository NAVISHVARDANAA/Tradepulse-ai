-- TradePulse AI
-- Migration 003: Reference data
-- No live prices or trade values are inserted here.

insert into public.countries (iso_code, name, region)
values
  ('US', 'United States', 'North America'),
  ('CN', 'China', 'Asia'),
  ('DE', 'Germany', 'Europe'),
  ('JP', 'Japan', 'Asia'),
  ('IN', 'India', 'Asia'),
  ('GB', 'United Kingdom', 'Europe'),
  ('FR', 'France', 'Europe'),
  ('IT', 'Italy', 'Europe'),
  ('KR', 'South Korea', 'Asia'),
  ('SG', 'Singapore', 'Asia'),
  ('NL', 'Netherlands', 'Europe'),
  ('CA', 'Canada', 'North America')
on conflict (iso_code) do nothing;

insert into public.market_assets (symbol, name, asset_type, currency)
values
  ('EURUSD', 'Euro / US Dollar', 'forex', 'USD'),
  ('USDINR', 'US Dollar / Indian Rupee', 'forex', 'INR'),
  ('XAUUSD', 'Gold / US Dollar', 'commodity', 'USD'),
  ('WTI', 'West Texas Intermediate Crude Oil', 'commodity', 'USD')
on conflict (symbol) do nothing;
