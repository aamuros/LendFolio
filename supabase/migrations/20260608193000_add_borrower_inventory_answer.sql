alter table public.borrower_portfolios
  add column if not exists has_inventory boolean;

update public.borrower_portfolios
set has_inventory = true
where has_inventory is null
  and coalesce(inventory_value, 0) > 0;
