-- Home WMS: умное размещение по 5S.
-- storage_type — как хранится вещь в ячейке: на полке, в ящике, на штанге (вешалки), на крючке
-- или в крупном отсеке (кровать, диван). У штанги height_from_floor_cm — высота самой штанги,
-- height_cm — место под вешалки вниз от неё.
-- allowed_categories — если задано, сюда кладём только эти категории (товарное соседство).
-- weight_class у вещи — тяжёлое кладём вниз.
alter table public.wms_cells add column if not exists storage_type text not null default 'shelf';
alter table public.wms_cells drop constraint if exists wms_cells_storage_type_check;
alter table public.wms_cells add constraint wms_cells_storage_type_check
  check (storage_type in ('shelf', 'drawer', 'rod', 'hook', 'bulky'));
alter table public.wms_cells add column if not exists allowed_categories text[];

alter table public.wms_items add column if not exists weight_class text;
alter table public.wms_items drop constraint if exists wms_items_weight_class_check;
alter table public.wms_items add constraint wms_items_weight_class_check
  check (weight_class is null or weight_class in ('light', 'medium', 'heavy'));
