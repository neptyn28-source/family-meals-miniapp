-- Мебель, которую не ставят на план, а держат только списком в комнате.
alter table public.wms_furniture add column if not exists list_only boolean not null default false;
