-- Home WMS: ответ «нет полок» — общая для семьи отметка у мебели, чтобы бот не спрашивал снова.
alter table public.wms_modules add column if not exists no_shelves boolean not null default false;
