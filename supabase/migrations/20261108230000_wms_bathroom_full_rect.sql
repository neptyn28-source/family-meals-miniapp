-- Ванная — целый прямоугольник 2.20 × 1.71 м: угол справа снизу не вырезан, там стоит стиральная машина.
update public.wms_floorplans f
set data = jsonb_set(f.data, '{rooms}', (
  select jsonb_agg(
    case when r->>'name' = 'Ванная' and r->'parts' = '[[4.65,0,0.89,1.71],[5.54,0,1.31,0.89]]'::jsonb
      then r || jsonb_build_object('parts', '[[4.65,0,2.2,1.71]]'::jsonb, 'label', '[5.75,0.85]'::jsonb)
      else r end
    order by ord)
  from jsonb_array_elements(f.data->'rooms') with ordinality as t(r, ord)
))
where f.data->'rooms' @> '[{"name":"Ванная","parts":[[4.65,0,0.89,1.71],[5.54,0,1.31,0.89]]}]'::jsonb;
