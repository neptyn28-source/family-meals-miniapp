-- GENERATED production reference-data migration.
-- Source: supabase/seed/*.ts on production-hardening.
-- Contains only app catalog/default configuration; no sample users or personal data.
begin;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('chicken_breast','куриная грудка','meat',array['poultry','chicken']::text[],'g',null,113,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('куриная грудка','chicken_breast')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('филе куриное','chicken_breast')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('куриное филе','chicken_breast')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('грудка куриная','chicken_breast')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('курица грудка','chicken_breast')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('филе грудки','chicken_breast')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('chicken_mince','куриный фарш','meat',array['poultry','chicken','mince']::text[],'g',null,143,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('куриный фарш','chicken_mince')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('фарш куриный','chicken_mince')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('beef','говядина','meat',array['beef']::text[],'g',null,187,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('говядина','beef')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('говядина мякоть','beef')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('мякоть говядины','beef')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('говяжья вырезка','beef')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('beef_mince','говяжий фарш','meat',array['beef','mince']::text[],'g',null,254,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('говяжий фарш','beef_mince')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('фарш говяжий','beef_mince')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('фарш из говядины','beef_mince')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('chebupeli','чебупели с говядиной','convenience',array['convenience','beef','semi_finished']::text[],'g',null,260,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('чебупели с говядиной','chebupeli')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('чебупели','chebupeli')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('pork','свинина','meat',array['pork']::text[],'g',null,259,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('свинина','pork')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('свиная шея','pork')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('свиной фарш','pork')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('бекон','pork')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('ветчина','pork')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('turkey','индейка','meat',array['poultry','turkey']::text[],'g',null,150,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('индейка','turkey')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('филе индейки','turkey')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('chicken_thigh','куриное бедро','meat',array['poultry','chicken']::text[],'g',null,185,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('куриное бедро','chicken_thigh')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('бедро куриное','chicken_thigh')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('куриные бедра','chicken_thigh')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('окорочок','chicken_thigh')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('salmon','лосось','fish',array['fish']::text[],'g',null,208,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('лосось','salmon')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('семга','salmon')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('форель','salmon')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('white_fish','белая рыба','fish',array['fish']::text[],'g',null,80,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('белая рыба','white_fish')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('минтай','white_fish')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('треска','white_fish')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('хек','white_fish')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('orange','апельсин','fruit',array['fruit','citrus','orange']::text[],'pcs',200,43,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('апельсин','orange')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('апельсины','orange')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('peanut_butter','арахисовая паста','spread',array['peanut']::text[],'g',null,588,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('арахисовая паста','peanut_butter')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('арахисовое масло','peanut_butter')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('hummus','хумус','spread',array['hummus']::text[],'g',null,166,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('хумус','hummus')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('rice_brown','коричневый рис','grain',array['rice','brown_rice']::text[],'g',null,337,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('коричневый рис','rice_brown')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('бурый рис','rice_brown')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('рис бурый','rice_brown')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('рис коричневый','rice_brown')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('mushrooms','шампиньоны','vegetable',array['mushroom']::text[],'g',null,27,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('шампиньоны','mushrooms')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('грибы','mushrooms')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('шампиньон','mushrooms')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('lime','лайм','fruit',array['fruit','citrus']::text[],'pcs',60,30,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('лайм','lime')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('лаймы','lime')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('egg_noodles','яичная лапша','grain',array['pasta','noodles']::text[],'g',null,350,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('яичная лапша','egg_noodles')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('лапша','egg_noodles')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('rice_white','рис белый','grain',array['rice']::text[],'g',null,344,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('рис белый','rice_white')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('рис','rice_white')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('белый рис','rice_white')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('рис круглозерный','rice_white')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('рис длиннозерный','rice_white')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('рис басмати','rice_white')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('рис жасмин','rice_white')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('pasta','макароны','grain',array['pasta']::text[],'g',null,350,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('макароны','pasta')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('паста','pasta')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('спагетти','pasta')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('пенне','pasta')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('фузилли','pasta')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('макаронные изделия','pasta')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('buckwheat','гречка','grain',array['buckwheat']::text[],'g',null,313,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('гречка','buckwheat')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('гречневая крупа','buckwheat')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('крупа гречневая','buckwheat')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('bulgur','булгур','grain',array['bulgur']::text[],'g',null,342,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('булгур','bulgur')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('oats','овсяные хлопья','grain',array['oats']::text[],'g',null,352,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('овсяные хлопья','oats')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('овсянка','oats')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('геркулес','oats')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('хлопья овсяные','oats')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('semolina','манная крупа','grain',array['semolina']::text[],'g',null,333,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('манная крупа','semolina')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('манка','semolina')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('flour','мука пшеничная','grain',array['flour']::text[],'g',null,334,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('мука пшеничная','flour')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('мука','flour')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('bread','хлеб','bakery',array['bread']::text[],'g',null,250,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('хлеб','bread')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('хлеб белый','bread')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('батон','bread')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('хлеб для тостов','bread')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('тостовый хлеб','bread')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('tortilla','тортилья','bakery',array['bread']::text[],'pcs',40,300,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('тортилья','tortilla')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('тортильи','tortilla')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('лепешка тортилья','tortilla')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('пшеничная лепешка','tortilla')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('crispbread','хлебцы','bakery',array['bread']::text[],'g',null,360,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('хлебцы','crispbread')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('хлебцы ржаные','crispbread')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('granola','гранола','grain',array['sweet']::text[],'g',null,420,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('гранола','granola')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('мюсли','granola')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('potato','картофель','vegetable',array['potato','starchy']::text[],'g',null,77,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('картофель','potato')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('картошка','potato')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('картофель молодой','potato')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('zucchini','кабачок','vegetable',array['zucchini']::text[],'g',null,24,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('кабачок','zucchini')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('кабачки','zucchini')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('цукини','zucchini')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('cucumber','огурец','vegetable',array['fresh_veg']::text[],'g',null,15,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('огурец','cucumber')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('огурцы','cucumber')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('tomato','помидор','vegetable',array['fresh_veg']::text[],'g',null,20,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('помидор','tomato')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('помидоры','tomato')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('томат','tomato')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('томаты','tomato')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('черри','tomato')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('bell_pepper','перец болгарский','vegetable',array['fresh_veg']::text[],'g',null,26,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('перец болгарский','bell_pepper')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('болгарский перец','bell_pepper')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('перец сладкий','bell_pepper')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('onion','лук репчатый','vegetable',array['aromatic']::text[],'g',null,41,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('лук репчатый','onion')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('лук','onion')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('луковица','onion')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('carrot','морковь','vegetable',array['root']::text[],'g',null,35,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('морковь','carrot')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('морковка','carrot')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('garlic','чеснок','vegetable',array['aromatic']::text[],'g',null,143,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('чеснок','garlic')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('чеснока','garlic')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('beet','свекла','vegetable',array['root']::text[],'g',null,43,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('свекла','beet')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('буряк','beet')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('cabbage','капуста белокочанная','vegetable',array['cabbage']::text[],'g',null,28,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('капуста белокочанная','cabbage')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('капуста','cabbage')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('broccoli','брокколи замороженная','vegetable',array['frozen_veg']::text[],'g',null,28,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('брокколи замороженная','broccoli')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('брокколи','broccoli')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('greens','зелень','vegetable',array['greens']::text[],'g',null,40,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('зелень','greens')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('укроп','greens')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('петрушка','greens')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('зеленый лук','greens')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('apple','яблоко','fruit',array['fruit','apple']::text[],'pcs',170,47,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('яблоко','apple')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('яблоки','apple')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('banana','банан','fruit',array['fruit','banana']::text[],'pcs',120,96,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('банан','banana')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('бананы','banana')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('pear','груша','fruit',array['fruit','pear']::text[],'pcs',170,47,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('груша','pear')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('груши','pear')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('berries_frozen','ягоды замороженные','fruit',array['berries']::text[],'g',null,45,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('ягоды замороженные','berries_frozen')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('ягоды','berries_frozen')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('ягодная смесь','berries_frozen')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('черника','berries_frozen')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('малина','berries_frozen')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('prunes','чернослив','fruit',array['dried_fruit']::text[],'g',null,256,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('чернослив','prunes')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('cottage_cheese','творог 5%','dairy',array['cottage_cheese']::text[],'g',null,121,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('творог 5','cottage_cheese')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('творог','cottage_cheese')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('sour_cream','сметана 15%','dairy',array['dairy_fat']::text[],'g',null,162,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('сметана 15','sour_cream')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('сметана','sour_cream')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('cream','сливки 10%','dairy',array['dairy_fat','liquid']::text[],'ml',null,119,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('сливки 10','cream')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('сливки','cream')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('milk','молоко 2,5%','dairy',array['liquid']::text[],'ml',null,52,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('молоко 2 5','milk')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('молоко','milk')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('kefir','кефир 1%','dairy',array['liquid']::text[],'ml',null,40,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('кефир 1','kefir')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('кефир','kefir')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('ryazhenka','ряженка 2,5%','dairy',array['liquid']::text[],'ml',null,54,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('ряженка 2 5','ryazhenka')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('ряженка','ryazhenka')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('yogurt','йогурт натуральный','dairy',array['yogurt']::text[],'g',null,68,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('йогурт натуральный','yogurt')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('йогурт','yogurt')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('греческий йогурт','yogurt')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('cheese','сыр полутвёрдый','dairy',array['cheese']::text[],'g',null,350,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('сыр полутвердый','cheese')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('сыр','cheese')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('сыр российский','cheese')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('сыр гауда','cheese')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('моцарелла','cheese')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('butter','масло сливочное','fat',array['fat']::text[],'g',null,748,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('масло сливочное','butter')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('сливочное масло','butter')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('egg','яйцо куриное','egg',array['egg']::text[],'pcs',55,157,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('яйцо куриное','egg')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('яйца','egg')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('яйцо','egg')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('oil','масло подсолнечное','fat',array['fat','liquid']::text[],'ml',null,899,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('масло подсолнечное','oil')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('растительное масло','oil')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('подсолнечное масло','oil')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('масло растительное','oil')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('soy_sauce','соевый соус','sauce',array['sauce','salty','liquid']::text[],'ml',null,55,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('соевый соус','soy_sauce')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('соус соевый','soy_sauce')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('teriyaki','соус терияки','sauce',array['sauce','salty','liquid']::text[],'ml',null,90,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('соус терияки','teriyaki')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('терияки','teriyaki')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('tomato_paste','томатная паста','sauce',array['sauce']::text[],'g',null,102,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('томатная паста','tomato_paste')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('tomatoes_canned','томаты в собственном соку','sauce',array['sauce']::text[],'g',null,24,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('томаты в собственном соку','tomatoes_canned')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('томаты консервированные','tomatoes_canned')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('пассата','tomatoes_canned')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('протертые томаты','tomatoes_canned')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('honey','мёд','sweet',array['sweet']::text[],'g',null,304,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('мед','honey')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('sugar','сахар','sweet',array['sweet']::text[],'g',null,398,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('сахар','sugar')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_catalog (id,canonical_name,category,tags,default_unit,grams_per_piece,kcal_per_100g,active)
 values ('walnuts','грецкие орехи','nuts',array['nuts']::text[],'g',null,654,true)
 on conflict (id) do update set canonical_name=excluded.canonical_name,category=excluded.category,tags=excluded.tags,default_unit=excluded.default_unit,grams_per_piece=excluded.grams_per_piece,kcal_per_100g=excluded.kcal_per_100g,updated_at=now();
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('грецкие орехи','walnuts')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_aliases (alias_norm,ingredient_id) values ('орехи грецкие','walnuts')
   on conflict (alias_norm) do update set ingredient_id=excluded.ingredient_id;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('chicken_breast','Пятёрочка',399,900,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('chicken_breast','Чижик',349,900,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('chicken_breast','ВкусВилл',469,800,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('chicken_mince','Пятёрочка',229,400,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('chicken_mince','Чижик',199,400,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('beef','Пятёрочка',429,500,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('beef','Чижик',389,500,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('beef','ВкусВилл',499,400,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('beef_mince','Пятёрочка',299,400,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('beef_mince','Чижик',269,400,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('chebupeli','Пятёрочка',189,300,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('chebupeli','Чижик',169,300,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('rice_white','Пятёрочка',119,900,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('rice_white','Чижик',99,900,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('pasta','Пятёрочка',89,450,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('pasta','Чижик',69,450,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('buckwheat','Пятёрочка',99,800,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('buckwheat','Чижик',85,800,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('bulgur','Пятёрочка',109,500,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('bulgur','ВкусВилл',139,500,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('oats','Пятёрочка',79,500,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('oats','Чижик',65,500,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('semolina','Пятёрочка',69,700,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('semolina','Чижик',59,700,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('flour','Пятёрочка',79,1000,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('flour','Чижик',65,1000,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('bread','Пятёрочка',65,400,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('bread','Чижик',55,400,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('tortilla','Пятёрочка',139,6,'pcs',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('tortilla','Чижик',119,6,'pcs',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('crispbread','Пятёрочка',89,150,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('crispbread','ВкусВилл',119,150,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('granola','Пятёрочка',199,300,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('granola','ВкусВилл',249,300,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('potato','Пятёрочка',59,1500,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('potato','Чижик',45,1500,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('zucchini','Пятёрочка',139,1000,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('zucchini','Чижик',119,1000,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('cucumber','Пятёрочка',169,1000,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('cucumber','Чижик',149,1000,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('tomato','Пятёрочка',229,1000,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('tomato','Чижик',199,1000,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('bell_pepper','Пятёрочка',299,1000,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('bell_pepper','Чижик',269,1000,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('onion','Пятёрочка',45,1000,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('onion','Чижик',39,1000,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('carrot','Пятёрочка',49,1000,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('carrot','Чижик',42,1000,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('garlic','Пятёрочка',49,100,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('garlic','Чижик',39,100,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('beet','Пятёрочка',45,1000,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('beet','Чижик',39,1000,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('cabbage','Пятёрочка',35,1000,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('cabbage','Чижик',29,1000,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('broccoli','Пятёрочка',189,400,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('broccoli','Чижик',159,400,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('greens','Пятёрочка',59,50,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('greens','Чижик',49,50,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('apple','Пятёрочка',139,1000,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('apple','Чижик',119,1000,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('banana','Пятёрочка',149,1000,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('banana','Чижик',129,1000,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('pear','Пятёрочка',229,1000,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('pear','Чижик',199,1000,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('berries_frozen','Пятёрочка',249,300,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('berries_frozen','Чижик',199,300,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('prunes','Пятёрочка',159,200,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('cottage_cheese','Пятёрочка',149,350,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('cottage_cheese','Чижик',129,350,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('cottage_cheese','ВкусВилл',179,300,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('sour_cream','Пятёрочка',109,300,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('sour_cream','Чижик',95,300,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('cream','Пятёрочка',119,500,'ml',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('cream','Чижик',99,500,'ml',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('milk','Пятёрочка',89,900,'ml',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('milk','Чижик',79,900,'ml',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('kefir','Пятёрочка',89,900,'ml',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('kefir','Чижик',79,900,'ml',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('ryazhenka','Пятёрочка',99,900,'ml',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('ryazhenka','ВкусВилл',119,900,'ml',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('yogurt','Пятёрочка',89,350,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('yogurt','ВкусВилл',119,400,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('cheese','Пятёрочка',229,250,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('cheese','Чижик',199,250,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('butter','Пятёрочка',189,180,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('butter','Чижик',169,180,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('egg','Пятёрочка',119,10,'pcs',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('egg','Чижик',99,10,'pcs',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('oil','Пятёрочка',139,1000,'ml',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('oil','Чижик',119,1000,'ml',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('soy_sauce','Пятёрочка',119,300,'ml',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('soy_sauce','Чижик',99,300,'ml',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('teriyaki','Пятёрочка',169,250,'ml',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('tomato_paste','Пятёрочка',79,270,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('tomato_paste','Чижик',65,270,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('tomatoes_canned','Пятёрочка',139,400,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('tomatoes_canned','ВкусВилл',179,500,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('honey','Пятёрочка',299,250,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('honey','Чижик',249,250,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('sugar','Пятёрочка',89,1000,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('sugar','Чижик',75,1000,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.ingredient_prices (ingredient_id,store,price_rub,package_amount,package_unit,effective_from,manually_verified_at)
 values ('walnuts','Пятёрочка',199,100,'g',date '2026-09-28',null)
 on conflict (ingredient_id,store,effective_from) do update set price_rub=excluded.price_rub,package_amount=excluded.package_amount,package_unit=excluded.package_unit;
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('chicken_soy_garlic_rice','Куриная грудка в соево-чесночном соусе, белый рис, огурец',array['lunch','dinner']::text[],array['chicken','favorite','asian_style']::text[],'rice',true,true,2,array['stove','pan','pot']::text[],35,350,'["Рис промыть до прозрачной воды, залить водой 1:1,5, варить под крышкой 15 минут на слабом огне, 10 минут настоять.","Грудку нарезать полосками 1,5 см, обсушить.","Обжарить на разогретой сковороде с маслом 6–7 минут до золотистого цвета, помешивая.","Отложить детскую часть курицы без соуса.","Во взрослую часть добавить измельчённый чеснок, соевый соус и мёд, прогреть 1–2 минуты до глянца.","Огурец нарезать брусочками и подавать отдельно."]'::jsonb,'Курица без соевого соуса и чеснока, мелко нарезанная; рис с каплей сливочного масла.','Соль не нужна — соевый соус уже солёный. Перец по вкусу только взрослым.',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='chicken_soy_garlic_rice';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_soy_garlic_rice','chicken_breast',130,'raw',false,0);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_soy_garlic_rice','rice_white',60,'dry',false,1);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_soy_garlic_rice','cucumber',70,'raw',false,2);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_soy_garlic_rice','soy_sauce',12,'raw',false,3);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_soy_garlic_rice','garlic',4,'raw',false,4);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_soy_garlic_rice','honey',4,'raw',false,5);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_soy_garlic_rice','oil',6,'raw',false,6);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('beef_teriyaki_rice_zucchini','Говядина терияки, белый рис, жареный кабачок отдельно',array['lunch','dinner']::text[],array['beef','favorite','asian_style','zucchini_side','fried_zucchini']::text[],'rice',true,true,2,array['stove','pan','pot']::text[],40,350,'["Рис сварить (1:1,5, 15 минут + 10 минут под крышкой).","Говядину нарезать тонкими полосками поперёк волокон.","Обжаривать на сильном огне порциями по 2–3 минуты, чтобы мясо жарилось, а не тушилось.","Отложить детскую часть говядины без соуса и потушить её 5 минут с ложкой воды до мягкости.","Во взрослую часть влить терияки с чесноком, прогреть 1 минуту.","Кабачок нарезать кружками 1 см, обжарить отдельно по 2–3 минуты с каждой стороны, посолить после жарки."]'::jsonb,'Мягкая тушёная говядина без терияки, мелко нарезанная; кабачок без корочки.','Терияки солёный — мясо не солить. Кабачок: щепотка соли после жарки.',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='beef_teriyaki_rice_zucchini';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_teriyaki_rice_zucchini','beef',115,'raw',false,0);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_teriyaki_rice_zucchini','rice_white',55,'dry',false,1);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_teriyaki_rice_zucchini','zucchini',120,'raw',false,2);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_teriyaki_rice_zucchini','teriyaki',18,'raw',false,3);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_teriyaki_rice_zucchini','garlic',3,'raw',false,4);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_teriyaki_rice_zucchini','oil',8,'raw',false,5);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('pasta_beef_creamy_tomato','Паста с говяжьим фаршем в сливочно-томатном соусе',array['lunch','dinner']::text[],array['beef','favorite','pasta_dish']::text[],'pasta',true,true,2,array['stove','pan','pot']::text[],30,350,'["Лук мелко нарезать, обжарить на масле 3–4 минуты.","Добавить фарш, разбивая лопаткой, жарить 7–8 минут до изменения цвета.","Добавить томаты, тушить 10 минут.","Влить сливки, прогреть 2 минуты без кипения.","Пасту отварить в подсоленной воде на 1 минуту меньше времени на упаковке, смешать с соусом.","Подавать с тёртым сыром. На второй день разогреть с 2–3 ст. л. воды."]'::jsonb,'Детскую порцию взять до добавления перца; пасту нарезать короче.','Соль: около 1 ч. л. на всю кастрюлю/сковороду взрослой части. Детскую порцию отложить до досаливания и острых добавок. Базилик/орегано — щепотка, только взрослым.',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='pasta_beef_creamy_tomato';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('pasta_beef_creamy_tomato','pasta',75,'dry',false,0);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('pasta_beef_creamy_tomato','beef_mince',95,'raw',false,1);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('pasta_beef_creamy_tomato','tomatoes_canned',80,'canned',false,2);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('pasta_beef_creamy_tomato','cream',35,'raw',false,3);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('pasta_beef_creamy_tomato','onion',30,'raw',false,4);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('pasta_beef_creamy_tomato','cheese',10,'raw',false,5);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('pasta_beef_creamy_tomato','oil',5,'raw',false,6);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('chicken_quesadilla','Кесадилья с куриной грудкой и сыром, овощи',array['lunch','dinner']::text[],array['chicken','favorite','quesadilla']::text[],'bread',true,true,2,array['stove','pan','electric_grill']::text[],30,320,'["Курицу нарезать мелким кубиком и обжарить 6–7 минут (начинку можно сделать сразу на 2 дня и хранить в холодильнике).","Перец нарезать соломкой, слегка обжарить.","На половину тортильи выложить курицу, перец, сыр, сложить пополам.","Жарить на электрогриле 3–4 минуты до расплавления сыра (собирать непосредственно перед едой).","Подавать со сметаной и нарезанными огурцом и помидором."]'::jsonb,'Ребёнку — четвертинка тортильи с курицей и сыром без перца, нарезанная полосками.','Курицу слегка посолить при жарке, паприка — только во взрослую часть.',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='chicken_quesadilla';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_quesadilla','tortilla',1.5,'raw',false,0);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_quesadilla','chicken_breast',95,'raw',false,1);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_quesadilla','cheese',30,'raw',false,2);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_quesadilla','bell_pepper',40,'raw',false,3);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_quesadilla','tomato',60,'raw',false,4);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_quesadilla','sour_cream',20,'raw',false,5);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_quesadilla','cucumber',60,'raw',false,6);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_quesadilla','oil',3,'raw',false,7);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('draniki_sour_cream','Драники со сметаной и салатом из помидоров',array['lunch','dinner']::text[],array['favorite','vegetarian']::text[],'potato',true,true,2,array['stove','pan']::text[],45,300,'["Картофель и лук натереть на мелкой тёрке, отжать лишнюю жидкость.","Добавить яйцо, муку, соль, перемешать.","Выкладывать по 1 ст. л. на сковороду с маслом, жарить по 3–4 минуты с каждой стороны.","Выложить на бумажное полотенце.","На второй день разогреть на сухой сковороде под крышкой.","Подавать со сметаной и нарезанными помидорами."]'::jsonb,'1–2 небольших драника, без хрустящей корочки, со сметаной.','Соль: 1/2 ч. л. на 500 г картофеля. Чёрный перец — только взрослым.',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='draniki_sour_cream';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('draniki_sour_cream','potato',250,'raw',false,0);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('draniki_sour_cream','egg',0.3,'raw',false,1);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('draniki_sour_cream','flour',15,'raw',false,2);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('draniki_sour_cream','onion',20,'raw',false,3);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('draniki_sour_cream','oil',12,'raw',false,4);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('draniki_sour_cream','sour_cream',35,'raw',false,5);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('draniki_sour_cream','tomato',70,'raw',false,6);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('beef_potato_stew_multicooker','Говядина, тушённая с картофелем и морковью (мультиварка)',array['lunch','dinner']::text[],array['beef','stew']::text[],'potato',true,true,2,array['multicooker']::text[],90,350,'["Говядину нарезать кубиком 2–3 см, обжарить в чаше мультиварки на «Жарке» 10 минут.","Добавить лук и морковь, жарить ещё 5 минут.","Добавить томатную пасту и 200 мл воды, режим «Тушение» 50 минут.","Добавить картофель кубиком, тушить ещё 30 минут.","Посыпать зеленью."]'::jsonb,'Мясо и картофель размять вилкой, без перца и лаврового листа.','Соль: около 1 ч. л. на всю кастрюлю/сковороду взрослой части. Детскую порцию отложить до досаливания и острых добавок. Лавровый лист — 1 шт. на всю чашу, вынуть перед подачей.',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='beef_potato_stew_multicooker';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_potato_stew_multicooker','beef',110,'raw',false,0);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_potato_stew_multicooker','potato',170,'raw',false,1);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_potato_stew_multicooker','carrot',40,'raw',false,2);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_potato_stew_multicooker','onion',30,'raw',false,3);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_potato_stew_multicooker','tomato_paste',10,'raw',false,4);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_potato_stew_multicooker','oil',5,'raw',false,5);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_potato_stew_multicooker','greens',3,'raw',false,6);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('chicken_meatballs_tomato_buckwheat','Тефтели из куриного фарша в томатном соусе, гречка',array['lunch','dinner']::text[],array['chicken','meatballs']::text[],'buckwheat',true,true,2,array['stove','pan','pot']::text[],45,350,'["К фаршу добавить мелко натёртый лук, яйцо, соль; сформовать тефтели размером с грецкий орех.","Слегка обжарить со всех сторон 4–5 минут.","Залить томатами и сметаной, добавить 100 мл воды, тушить под крышкой 20 минут.","Гречку промыть, залить водой 1:2, варить 15 минут под крышкой."]'::jsonb,'Тефтели разрезать на кусочки, соус без перца.','Соль: около 1 ч. л. на всю кастрюлю/сковороду взрослой части. Детскую порцию отложить до досаливания и острых добавок.',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='chicken_meatballs_tomato_buckwheat';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_meatballs_tomato_buckwheat','chicken_mince',120,'raw',false,0);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_meatballs_tomato_buckwheat','buckwheat',55,'dry',false,1);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_meatballs_tomato_buckwheat','onion',25,'raw',false,2);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_meatballs_tomato_buckwheat','egg',0.15,'raw',false,3);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_meatballs_tomato_buckwheat','tomatoes_canned',70,'canned',false,4);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_meatballs_tomato_buckwheat','sour_cream',15,'raw',false,5);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_meatballs_tomato_buckwheat','oil',5,'raw',false,6);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('beef_plov_multicooker','Плов с говядиной (мультиварка)',array['lunch','dinner']::text[],array['beef','plov']::text[],'rice',true,true,2,array['multicooker']::text[],80,350,'["Говядину нарезать кубиком, обжарить на «Жарке» 10 минут.","Добавить лук и морковь соломкой, жарить 7 минут.","Засыпать промытый рис ровным слоем, воткнуть головку чеснока, залить горячей водой на 1,5 см выше риса.","Режим «Плов» или «Крупа» ~40 минут. Перемешать после окончания."]'::jsonb,'Порцию без зиры и перца; мясо мелко нарезать.','Соль: 1,5 ч. л. на всю чашу; зира — 1/2 ч. л., только если ребёнок нормально её ест.',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='beef_plov_multicooker';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_plov_multicooker','beef',100,'raw',false,0);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_plov_multicooker','rice_white',65,'dry',false,1);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_plov_multicooker','carrot',55,'raw',false,2);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_plov_multicooker','onion',30,'raw',false,3);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_plov_multicooker','garlic',5,'raw',false,4);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_plov_multicooker','oil',10,'raw',false,5);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('chicken_bulgur_vegetables','Куриная грудка с булгуром и тушёными овощами',array['lunch','dinner']::text[],array['chicken']::text[],'bulgur',true,true,2,array['stove','pan','pot']::text[],35,350,'["Булгур обжарить на сухой сковороде 1 минуту, залить водой 1:2, варить 12 минут.","Курицу кубиком обжарить 6 минут.","Добавить лук, морковь, перец, помидор, тушить под крышкой 10 минут.","Подавать булгур с курицей и овощами."]'::jsonb,'Овощи мягкие, курица мелко нарезана; без перца.','Соль: около 1 ч. л. на всю кастрюлю/сковороду взрослой части. Детскую порцию отложить до досаливания и острых добавок. Паприка сладкая — щепотка.',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='chicken_bulgur_vegetables';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_bulgur_vegetables','chicken_breast',120,'raw',false,0);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_bulgur_vegetables','bulgur',55,'dry',false,1);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_bulgur_vegetables','bell_pepper',50,'raw',false,2);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_bulgur_vegetables','carrot',40,'raw',false,3);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_bulgur_vegetables','tomato',50,'raw',false,4);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_bulgur_vegetables','onion',20,'raw',false,5);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_bulgur_vegetables','oil',7,'raw',false,6);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('beef_patties_mash','Говяжьи котлеты на электрогриле, картофельное пюре, огурец',array['lunch','dinner']::text[],array['beef','patties']::text[],'potato',true,true,2,array['electric_grill','pot','mixer']::text[],45,350,'["Хлеб замочить в молоке (часть молока), лук натереть, смешать с фаршем, яйцом и солью.","Сформовать котлеты толщиной 1,5 см, жарить на электрогриле 8–10 минут до полной готовности.","Картофель сварить 20 минут, слить воду, размять миксером с горячим молоком и маслом.","Огурец нарезать."]'::jsonb,'Половина котлеты, пюре без перца.','Соль: около 1 ч. л. на всю кастрюлю/сковороду взрослой части. Детскую порцию отложить до досаливания и острых добавок.',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='beef_patties_mash';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_patties_mash','beef_mince',110,'raw',false,0);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_patties_mash','potato',170,'raw',false,1);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_patties_mash','milk',25,'raw',false,2);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_patties_mash','butter',5,'raw',false,3);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_patties_mash','egg',0.2,'raw',false,4);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_patties_mash','onion',15,'raw',false,5);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_patties_mash','bread',10,'raw',false,6);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_patties_mash','cucumber',60,'raw',false,7);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('chicken_broccoli_creamy_pasta','Паста с куриной грудкой и брокколи в сливочном соусе',array['lunch','dinner']::text[],array['chicken','pasta_dish']::text[],'pasta',true,true,2,array['stove','pan','pot']::text[],30,350,'["Пасту отварить в подсоленной воде, за 3 минуты до готовности добавить брокколи.","Курицу кубиком обжарить 6 минут, добавить чеснок.","Влить сливки, прогреть 2 минуты, добавить сыр.","Соединить с пастой и брокколи."]'::jsonb,'Порцию отложить до чеснока; брокколи мелко порубить.','Соль: около 1 ч. л. на всю кастрюлю/сковороду взрослой части. Детскую порцию отложить до досаливания и острых добавок.',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='chicken_broccoli_creamy_pasta';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_broccoli_creamy_pasta','pasta',70,'dry',false,0);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_broccoli_creamy_pasta','chicken_breast',100,'raw',false,1);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_broccoli_creamy_pasta','broccoli',80,'frozen',false,2);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_broccoli_creamy_pasta','cream',40,'raw',false,3);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_broccoli_creamy_pasta','cheese',10,'raw',false,4);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_broccoli_creamy_pasta','garlic',3,'raw',false,5);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_broccoli_creamy_pasta','oil',5,'raw',false,6);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('borscht_beef','Борщ с говядиной и сметаной',array['lunch','dinner']::text[],array['beef','soup']::text[],null,true,true,2,array['stove','pot','pan']::text[],100,400,'["Говядину залить 2 л холодной воды, варить 1 час, снимая пену.","Свёклу соломкой потушить с томатной пастой и ложкой бульона 10 минут.","Лук и морковь обжарить 5 минут.","В бульон добавить картофель, через 10 минут — капусту, ещё через 10 — свёклу и зажарку, варить 10 минут.","Настоять 15 минут, подавать со сметаной и зеленью."]'::jsonb,'Гуща без капустных прожилок, с ложкой сметаны; мясо мелко нарезать.','Соль: 1,5 ч. л. на кастрюлю; лавровый лист 1 шт.; чеснок — только во взрослые тарелки.',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='borscht_beef';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('borscht_beef','beef',60,'raw',false,0);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('borscht_beef','beet',60,'raw',false,1);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('borscht_beef','cabbage',70,'raw',false,2);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('borscht_beef','potato',60,'raw',false,3);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('borscht_beef','carrot',25,'raw',false,4);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('borscht_beef','onion',20,'raw',false,5);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('borscht_beef','tomato_paste',10,'raw',false,6);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('borscht_beef','oil',5,'raw',false,7);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('borscht_beef','sour_cream',15,'raw',false,8);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('borscht_beef','bread',30,'raw',false,9);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('borscht_beef','greens',3,'raw',false,10);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('beef_stroganoff_buckwheat','Бефстроганов со сметанным соусом, гречка',array['lunch','dinner']::text[],array['beef']::text[],'buckwheat',true,true,2,array['stove','pan','pot']::text[],45,350,'["Говядину нарезать тонкой соломкой, обжарить на сильном огне 3–4 минуты порциями.","Добавить лук, жарить 4 минуты, присыпать мукой.","Добавить сметану, томатную пасту и 100 мл воды, тушить под крышкой 25 минут до мягкости.","Гречку сварить 1:2, 15 минут.","Подавать с огурцом."]'::jsonb,'Мясо мелко нарезать, соус без перца.','Соль: около 1 ч. л. на всю кастрюлю/сковороду взрослой части. Детскую порцию отложить до досаливания и острых добавок.',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='beef_stroganoff_buckwheat';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_stroganoff_buckwheat','beef',110,'raw',false,0);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_stroganoff_buckwheat','buckwheat',55,'dry',false,1);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_stroganoff_buckwheat','onion',30,'raw',false,2);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_stroganoff_buckwheat','sour_cream',30,'raw',false,3);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_stroganoff_buckwheat','tomato_paste',5,'raw',false,4);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_stroganoff_buckwheat','flour',5,'raw',false,5);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_stroganoff_buckwheat','oil',6,'raw',false,6);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('beef_stroganoff_buckwheat','cucumber',50,'raw',false,7);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('chicken_rice_veg_multicooker','Куриная грудка с рисом и овощами (мультиварка)',array['lunch','dinner']::text[],array['chicken']::text[],'rice',true,true,2,array['multicooker']::text[],50,350,'["Курицу кубиком обжарить на «Жарке» 7 минут с луком.","Добавить морковь и перец, 5 минут.","Добавить промытый рис, залить водой 1:1,7, режим «Крупа» 25 минут.","Перемешать, посыпать зеленью."]'::jsonb,'Без перца и специй, курицу мелко нарезать.','Соль: около 1 ч. л. на всю кастрюлю/сковороду взрослой части. Детскую порцию отложить до досаливания и острых добавок. Куркума — щепотка для цвета.',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='chicken_rice_veg_multicooker';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_rice_veg_multicooker','chicken_breast',115,'raw',false,0);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_rice_veg_multicooker','rice_white',60,'dry',false,1);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_rice_veg_multicooker','carrot',40,'raw',false,2);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_rice_veg_multicooker','bell_pepper',40,'raw',false,3);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_rice_veg_multicooker','onion',20,'raw',false,4);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_rice_veg_multicooker','oil',6,'raw',false,5);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chicken_rice_veg_multicooker','greens',3,'raw',false,6);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('zucchini_fritters_chicken','Оладьи из кабачков со сметаной и куриная грудка на гриле',array['lunch','dinner']::text[],array['chicken','zucchini_fritters']::text[],null,true,true,2,array['stove','pan','electric_grill']::text[],40,330,'["Кабачок натереть, посолить, через 10 минут отжать.","Смешать с яйцом, мукой и тёртым сыром.","Жарить оладьи по 3 минуты с каждой стороны.","Грудку отбить до 1,5 см, жарить на электрогриле 5–6 минут, нарезать.","Подавать со сметаной и помидором."]'::jsonb,'Оладьи без корочки, курицу мелко нарезать.','Кабачок подсолить при отжиме (1/2 ч. л.), тесто больше не солить.',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='zucchini_fritters_chicken';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('zucchini_fritters_chicken','zucchini',180,'raw',false,0);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('zucchini_fritters_chicken','egg',0.4,'raw',false,1);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('zucchini_fritters_chicken','flour',30,'raw',false,2);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('zucchini_fritters_chicken','cheese',12,'raw',false,3);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('zucchini_fritters_chicken','sour_cream',30,'raw',false,4);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('zucchini_fritters_chicken','oil',10,'raw',false,5);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('zucchini_fritters_chicken','chicken_breast',90,'raw',false,6);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('zucchini_fritters_chicken','tomato',50,'raw',false,7);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('chebupeli_salad','Чебупели с овощным салатом',array['lunch','dinner']::text[],array['convenience','favorite','quick']::text[],null,true,false,1,array['stove','pan']::text[],15,300,'["Обжарить чебупели на сухой сковороде под крышкой по 3–4 минуты с каждой стороны (по инструкции на упаковке).","Огурцы и помидоры нарезать, заправить сметаной."]'::jsonb,'Ребёнку — 1 чебупель, остудить, нарезать; больше овощей.','Салат слегка подсолить.',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='chebupeli_salad';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chebupeli_salad','chebupeli',160,'semi_finished',false,0);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chebupeli_salad','cucumber',70,'raw',false,1);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chebupeli_salad','tomato',70,'raw',false,2);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('chebupeli_salad','sour_cream',15,'raw',false,3);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('syrniki_sour_cream','Сырники со сметаной и ягодами',array['breakfast']::text[],array['favorite','syrniki','sweet']::text[],null,true,false,1,array['stove','pan']::text[],25,220,'["Творог размять с яйцом и сахаром.","Добавить муку, сформовать сырники, обвалять в муке.","Жарить на среднем огне по 3–4 минуты с каждой стороны под крышкой.","Подавать со сметаной и ягодами."]'::jsonb,'1–2 сырника, ягоды размять.','Щепотка соли в тесто.',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='syrniki_sour_cream';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('syrniki_sour_cream','cottage_cheese',120,'raw',false,0);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('syrniki_sour_cream','egg',0.4,'raw',false,1);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('syrniki_sour_cream','flour',20,'raw',false,2);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('syrniki_sour_cream','sugar',6,'raw',false,3);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('syrniki_sour_cream','oil',6,'raw',false,4);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('syrniki_sour_cream','sour_cream',25,'raw',false,5);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('syrniki_sour_cream','berries_frozen',30,'frozen',false,6);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('nordic_breakfast','Скандинавский завтрак: тост, яйцо, сыр, огурец',array['breakfast']::text[],array['favorite','savory']::text[],null,true,false,1,array['toaster','pot']::text[],12,230,'["Яйца сварить 8 минут.","Хлеб подсушить в тостере, смазать маслом.","Выложить сыр, огурец, половинки яйца, зелень."]'::jsonb,'Половина тоста без корки, яйцо мелко нарезать.','Щепотка соли на яйцо только взрослым.',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='nordic_breakfast';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('nordic_breakfast','bread',55,'raw',false,0);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('nordic_breakfast','egg',1,'raw',false,1);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('nordic_breakfast','cheese',20,'raw',false,2);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('nordic_breakfast','cucumber',60,'raw',false,3);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('nordic_breakfast','butter',5,'raw',false,4);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('nordic_breakfast','greens',2,'raw',false,5);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('oatmeal_berries','Овсянка на молоке с ягодами и мёдом',array['breakfast']::text[],array['porridge','sweet']::text[],null,true,false,1,array['stove','pot']::text[],10,280,'["Молоко довести до кипения, всыпать хлопья.","Варить 5 минут, помешивая.","Добавить ягоды и мёд."]'::jsonb,'Мёд заменить размятым бананом или ягодами, если мёд ребёнку не даёте.','Щепотка соли в кашу.',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='oatmeal_berries';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('oatmeal_berries','oats',50,'dry',false,0);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('oatmeal_berries','milk',180,'raw',false,1);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('oatmeal_berries','berries_frozen',50,'frozen',false,2);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('oatmeal_berries','honey',6,'raw',false,3);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('omelet_tomato_cheese','Омлет с помидором и сыром, тост',array['breakfast']::text[],array['eggs','savory']::text[],null,true,false,1,array['stove','pan','toaster']::text[],12,220,'["Взбить яйца с молоком и солью.","Вылить на сковороду с маслом, добавить помидор.","Готовить под крышкой 5–6 минут на слабом огне, посыпать сыром.","Подать с тостом."]'::jsonb,'Кусочек омлета без корочки.','Соль: щепотка на 2 яйца.',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='omelet_tomato_cheese';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('omelet_tomato_cheese','egg',2,'raw',false,0);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('omelet_tomato_cheese','milk',40,'raw',false,1);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('omelet_tomato_cheese','cheese',15,'raw',false,2);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('omelet_tomato_cheese','tomato',60,'raw',false,3);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('omelet_tomato_cheese','bread',30,'raw',false,4);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('omelet_tomato_cheese','butter',3,'raw',false,5);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('kefir_pancakes_berries','Оладьи на кефире с ягодами',array['breakfast']::text[],array['sweet','pancakes']::text[],null,true,false,1,array['stove','pan']::text[],25,220,'["Смешать кефир, яйцо, сахар, щепотку соли и соды.","Всыпать муку до консистенции густой сметаны.","Жарить небольшие оладьи по 2 минуты с каждой стороны.","Подавать с ягодами и сметаной."]'::jsonb,'2 маленьких оладушка.','Щепотка соли.',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='kefir_pancakes_berries';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('kefir_pancakes_berries','kefir',110,'raw',false,0);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('kefir_pancakes_berries','flour',55,'raw',false,1);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('kefir_pancakes_berries','egg',0.4,'raw',false,2);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('kefir_pancakes_berries','sugar',6,'raw',false,3);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('kefir_pancakes_berries','oil',7,'raw',false,4);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('kefir_pancakes_berries','berries_frozen',40,'frozen',false,5);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('kefir_pancakes_berries','sour_cream',20,'raw',false,6);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('rice_milk_porridge','Рисовая каша на молоке с маслом',array['breakfast']::text[],array['porridge','sweet']::text[],null,true,false,1,array['stove','pot','multicooker']::text[],30,280,'["Рис промыть, отварить в 100 мл воды 7 минут.","Влить молоко, варить на слабом огне 15 минут, помешивая (или режим «Молочная каша»).","Добавить масло и сахар."]'::jsonb,'Та же каша, чуть жиже.','Щепотка соли.',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='rice_milk_porridge';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('rice_milk_porridge','rice_white',40,'dry',false,0);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('rice_milk_porridge','milk',200,'raw',false,1);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('rice_milk_porridge','butter',5,'raw',false,2);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('rice_milk_porridge','sugar',5,'raw',false,3);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('hot_toasts_cheese_tomato','Горячие тосты с сыром и помидором, кефир',array['breakfast']::text[],array['savory']::text[],null,true,false,1,array['toaster','electric_grill']::text[],10,230,'["Хлеб подсушить в тостере.","Выложить помидор и сыр, прогреть на электрогриле под крышкой 2 минуты до расплавления.","Подать со стаканом кефира."]'::jsonb,'Половинка тоста, нарезанная полосками.','Без дополнительной соли.',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='hot_toasts_cheese_tomato';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('hot_toasts_cheese_tomato','bread',65,'raw',false,0);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('hot_toasts_cheese_tomato','cheese',25,'raw',false,1);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('hot_toasts_cheese_tomato','tomato',50,'raw',false,2);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('hot_toasts_cheese_tomato','butter',4,'raw',false,3);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('hot_toasts_cheese_tomato','kefir',100,'raw',false,4);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('yogurt_granola_banana','Йогурт с гранолой и бананом',array['breakfast']::text[],array['sweet','no_cook']::text[],null,true,false,1,array[]::text[],3,250,'["Выложить йогурт, сверху гранолу и нарезанный банан."]'::jsonb,'Гранолу размочить в йогурте 5 минут.','—',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='yogurt_granola_banana';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('yogurt_granola_banana','yogurt',170,'raw',false,0);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('yogurt_granola_banana','granola',35,'dry',false,1);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('yogurt_granola_banana','banana',0.5,'raw',false,2);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('semolina_porridge','Манная каша с ягодами',array['breakfast']::text[],array['porridge','sweet']::text[],null,true,false,1,array['stove','pot']::text[],10,260,'["Молоко довести до кипения, тонкой струйкой всыпать манку, помешивая.","Варить 3 минуты.","Добавить масло, сахар, ягоды."]'::jsonb,'Та же каша.','Щепотка соли.',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='semolina_porridge';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('semolina_porridge','semolina',30,'dry',false,0);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('semolina_porridge','milk',200,'raw',false,1);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('semolina_porridge','butter',4,'raw',false,2);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('semolina_porridge','sugar',5,'raw',false,3);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('semolina_porridge','berries_frozen',30,'frozen',false,4);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('snack_apple','Яблоко',array['snack1','snack2']::text[],array['fruit','apple']::text[],null,true,false,1,array[]::text[],0,170,'["Вымыть, нарезать дольками."]'::jsonb,'Тонкие дольки без кожуры.','—',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='snack_apple';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('snack_apple','apple',1,'raw',false,0);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('snack_banana','Банан',array['snack1','snack2']::text[],array['fruit','banana']::text[],null,true,false,1,array[]::text[],0,120,'["Очистить."]'::jsonb,'Половина банана.','—',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='snack_banana';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('snack_banana','banana',1,'raw',false,0);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('snack_pear','Груша',array['snack1','snack2']::text[],array['fruit','pear']::text[],null,true,false,1,array[]::text[],0,170,'["Вымыть, нарезать."]'::jsonb,'Мягкие дольки без кожуры.','—',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='snack_pear';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('snack_pear','pear',1,'raw',false,0);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('snack_kefir','Кефир',array['snack1','snack2']::text[],array['dairy']::text[],null,true,false,1,array[]::text[],0,250,'["Налить стакан."]'::jsonb,'Полстакана.','—',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='snack_kefir';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('snack_kefir','kefir',250,'raw',false,0);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('snack_ryazhenka','Ряженка',array['snack1','snack2']::text[],array['dairy']::text[],null,true,false,1,array[]::text[],0,250,'["Налить стакан."]'::jsonb,'Полстакана.','—',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='snack_ryazhenka';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('snack_ryazhenka','ryazhenka',250,'raw',false,0);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('snack_yogurt_berries','Натуральный йогурт с ягодами',array['snack1','snack2']::text[],array['dairy']::text[],null,true,false,1,array[]::text[],2,180,'["Разморозить ягоды, смешать с йогуртом."]'::jsonb,'Половина порции.','—',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='snack_yogurt_berries';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('snack_yogurt_berries','yogurt',150,'raw',false,0);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('snack_yogurt_berries','berries_frozen',30,'frozen',false,1);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('snack_cottage_honey','Творог с мёдом',array['snack1','snack2']::text[],array['dairy','cottage_cheese']::text[],null,true,false,1,array[]::text[],1,110,'["Выложить творог, полить мёдом."]'::jsonb,'Без мёда, с размятой ягодой.','—',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='snack_cottage_honey';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('snack_cottage_honey','cottage_cheese',100,'raw',false,0);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('snack_cottage_honey','honey',8,'raw',false,1);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('snack_crispbread_cheese','Хлебцы с сыром и огурцом',array['snack1','snack2']::text[],array['savory']::text[],null,true,false,1,array[]::text[],2,90,'["Выложить сыр и огурец на хлебцы."]'::jsonb,'Сыр кусочками, огурец брусочками.','—',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='snack_crispbread_cheese';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('snack_crispbread_cheese','crispbread',20,'raw',false,0);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('snack_crispbread_cheese','cheese',20,'raw',false,1);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('snack_crispbread_cheese','cucumber',50,'raw',false,2);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('snack_carrot_yogurt_dip','Морковные палочки с йогуртовым соусом',array['snack1','snack2']::text[],array['vegetable']::text[],null,true,false,1,array[]::text[],5,160,'["Морковь нарезать палочками.","Йогурт смешать с зеленью и щепоткой соли."]'::jsonb,'Морковь натереть или отварить до мягкости.','Щепотка соли в соус.',true)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='snack_carrot_yogurt_dip';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('snack_carrot_yogurt_dip','carrot',100,'raw',false,0);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('snack_carrot_yogurt_dip','yogurt',60,'raw',false,1);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('snack_carrot_yogurt_dip','greens',2,'raw',false,2);
insert into public.planner_recipes (id,title,meal_types,tags,side,active,batchable,batch_days,equipment,cook_minutes,ref_portion_g,steps,child_adaptation,seasoning,child_ok)
 values ('snack_walnuts_prunes','Грецкие орехи и чернослив',array['snack1','snack2']::text[],array['nuts']::text[],null,true,false,1,array[]::text[],0,40,'["Отмерить горсть."]'::jsonb,'Ребёнку 2 лет цельные орехи не давать — только чернослив, мелко нарезанный.','—',false)
 on conflict (id) do update set title=excluded.title,meal_types=excluded.meal_types,tags=excluded.tags,side=excluded.side,active=excluded.active,batchable=excluded.batchable,batch_days=excluded.batch_days,equipment=excluded.equipment,cook_minutes=excluded.cook_minutes,ref_portion_g=excluded.ref_portion_g,steps=excluded.steps,child_adaptation=excluded.child_adaptation,seasoning=excluded.seasoning,child_ok=excluded.child_ok,updated_at=now();
delete from public.planner_recipe_ingredients where recipe_id='snack_walnuts_prunes';
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('snack_walnuts_prunes','walnuts',20,'raw',false,0);
insert into public.planner_recipe_ingredients (recipe_id,ingredient_id,amount,state,optional,position)
   values ('snack_walnuts_prunes','prunes',20,'dry',false,1);
insert into public.family_settings (family_id,settings)
select f.id, jsonb_set('{"weekly_budget_rub":8000,"weight_mode":"mild_loss","portion_ranges":{"husband":{"min":300,"max":400},"wife":{"min":250,"max":350},"child":{"min":120,"max":180}},"custom_portions":null,"small_meal_factor":{"husband":1,"wife":1,"child":0.5},"wife_snacks":2,"husband_snacks":0,"child_home_snacks":true,"kindergarten_weekdays":[1,2,3,4,5],"stores":["Пятёрочка","Чижик","ВкусВилл"],"preferred_store":null,"equipment":["stove","pan","pot","multicooker","electric_grill","toaster","mixer"],"repetition":{"max_same_breakfast":2,"max_same_snack":2,"max_main_batches_per_recipe":1,"max_side_batches":{"rice":2,"pasta":1,"potato":1,"buckwheat":1,"bulgur":1,"bread":1},"max_soups_per_week":1},"kcal_day_ranges":null,"allow_unverified_budget":true}'::jsonb,'{weekly_budget_rub}',to_jsonb(f.budget_weekly),true)
from public.families f on conflict (family_id) do nothing;
insert into public.family_ingredient_caps (family_id,ingredient_id,category,max_amount,unit,enabled)
   select f.id,'potato',null,2000,'g',true from public.families f
   on conflict (family_id,ingredient_id) where ingredient_id is not null do nothing;
insert into public.family_ingredient_caps (family_id,ingredient_id,category,max_amount,unit,enabled)
   select f.id,'pasta',null,700,'g',true from public.families f
   on conflict (family_id,ingredient_id) where ingredient_id is not null do nothing;
insert into public.family_ingredient_caps (family_id,ingredient_id,category,max_amount,unit,enabled)
   select f.id,'rice_white',null,1200,'g',true from public.families f
   on conflict (family_id,ingredient_id) where ingredient_id is not null do nothing;
insert into public.family_ingredient_caps (family_id,ingredient_id,category,max_amount,unit,enabled)
   select f.id,'cheese',null,450,'g',true from public.families f
   on conflict (family_id,ingredient_id) where ingredient_id is not null do nothing;
insert into public.family_ingredient_caps (family_id,ingredient_id,category,max_amount,unit,enabled)
   select f.id,'oil',null,400,'ml',true from public.families f
   on conflict (family_id,ingredient_id) where ingredient_id is not null do nothing;
insert into public.family_ingredient_caps (family_id,ingredient_id,category,max_amount,unit,enabled)
   select f.id,'butter',null,150,'g',true from public.families f
   on conflict (family_id,ingredient_id) where ingredient_id is not null do nothing;
insert into public.family_ingredient_caps (family_id,ingredient_id,category,max_amount,unit,enabled)
   select f.id,'sour_cream',null,900,'g',true from public.families f
   on conflict (family_id,ingredient_id) where ingredient_id is not null do nothing;
insert into public.family_ingredient_caps (family_id,ingredient_id,category,max_amount,unit,enabled)
   select f.id,'cream',null,600,'ml',true from public.families f
   on conflict (family_id,ingredient_id) where ingredient_id is not null do nothing;
insert into public.family_ingredient_caps (family_id,ingredient_id,category,max_amount,unit,enabled)
   select f.id,'sugar',null,200,'g',true from public.families f
   on conflict (family_id,ingredient_id) where ingredient_id is not null do nothing;
insert into public.family_ingredient_caps (family_id,ingredient_id,category,max_amount,unit,enabled)
   select f.id,'soy_sauce',null,150,'ml',true from public.families f
   on conflict (family_id,ingredient_id) where ingredient_id is not null do nothing;
insert into public.family_ingredient_caps (family_id,ingredient_id,category,max_amount,unit,enabled)
   select f.id,'banana',null,4,'pcs',true from public.families f
   on conflict (family_id,ingredient_id) where ingredient_id is not null do nothing;
insert into public.family_ingredient_caps (family_id,ingredient_id,category,max_amount,unit,enabled)
   select f.id,'apple',null,5,'pcs',true from public.families f
   on conflict (family_id,ingredient_id) where ingredient_id is not null do nothing;
insert into public.family_ingredient_caps (family_id,ingredient_id,category,max_amount,unit,enabled)
   select f.id,null,'meat',4500,'g',true from public.families f
   on conflict (family_id,category) where category is not null do nothing;
insert into public.family_ingredient_caps (family_id,ingredient_id,category,max_amount,unit,enabled)
   select f.id,null,'convenience',700,'g',true from public.families f
   on conflict (family_id,category) where category is not null do nothing;
insert into public.family_rules (family_id,rule_type,code,description,enabled,rule_kind,params)
 select f.id,'hard','planner_default_01','Апельсин полностью запрещён',true,'ban_ingredient','{"kind":"ban_ingredient","ingredient_id":"orange","severity":"hard"}'::jsonb from public.families f
 on conflict (family_id,code) do nothing;
insert into public.family_rules (family_id,rule_type,code,description,enabled,rule_kind,params)
 select f.id,'hard','planner_default_02','Никакого арахисового масла',true,'ban_ingredient_tag','{"kind":"ban_ingredient_tag","tag":"peanut","severity":"hard"}'::jsonb from public.families f
 on conflict (family_id,code) do nothing;
insert into public.family_rules (family_id,rule_type,code,description,enabled,rule_kind,params)
 select f.id,'hard','planner_default_03','Никакого хумуса',true,'ban_ingredient','{"kind":"ban_ingredient","ingredient_id":"hummus","severity":"hard"}'::jsonb from public.families f
 on conflict (family_id,code) do nothing;
insert into public.family_rules (family_id,rule_type,code,description,enabled,rule_kind,params)
 select f.id,'hard','planner_default_04','Никаких творожных запеканок',true,'ban_recipe_tag','{"kind":"ban_recipe_tag","tag":"cottage_casserole","severity":"hard"}'::jsonb from public.families f
 on conflict (family_id,code) do nothing;
insert into public.family_rules (family_id,rule_type,code,description,enabled,rule_kind,params)
 select f.id,'hard','planner_default_05','Коричневый рис запрещён, только белый',true,'ban_ingredient_tag','{"kind":"ban_ingredient_tag","tag":"brown_rice","severity":"hard"}'::jsonb from public.families f
 on conflict (family_id,code) do nothing;
insert into public.family_rules (family_id,rule_type,code,description,enabled,rule_kind,params)
 select f.id,'hard','planner_default_06','Из птицы — только куриная грудка (и готовый куриный фарш)',true,'ban_ingredient_tag','{"kind":"ban_ingredient_tag","tag":"poultry","except_ingredients":["chicken_breast","chicken_mince"],"severity":"hard"}'::jsonb from public.families f
 on conflict (family_id,code) do nothing;
insert into public.family_rules (family_id,rule_type,code,description,enabled,rule_kind,params)
 select f.id,'hard','planner_default_07','Без свинины',true,'ban_ingredient_tag','{"kind":"ban_ingredient_tag","tag":"pork","severity":"hard"}'::jsonb from public.families f
 on conflict (family_id,code) do nothing;
insert into public.family_rules (family_id,rule_type,code,description,enabled,rule_kind,params)
 select f.id,'hard','planner_default_08','Без рыбы',true,'ban_ingredient_tag','{"kind":"ban_ingredient_tag","tag":"fish","severity":"hard"}'::jsonb from public.families f
 on conflict (family_id,code) do nothing;
insert into public.family_rules (family_id,rule_type,code,description,enabled,rule_kind,params)
 select f.id,'hard','planner_default_09','Кабачок — только отдельным жареным гарниром или оладьями',true,'ingredient_only_in_tags','{"kind":"ingredient_only_in_tags","ingredient_id":"zucchini","allowed_tags":["zucchini_side","zucchini_fritters"],"severity":"hard"}'::jsonb from public.families f
 on conflict (family_id,code) do nothing;
insert into public.family_rules (family_id,rule_type,code,description,enabled,rule_kind,params)
 select f.id,'hard','planner_default_10','Жареный кабачок не на завтрак',true,'ban_tag_at_meal_types','{"kind":"ban_tag_at_meal_types","tag":"fried_zucchini","meal_types":["breakfast"],"severity":"hard"}'::jsonb from public.families f
 on conflict (family_id,code) do nothing;
insert into public.family_rules (family_id,rule_type,code,description,enabled,rule_kind,params)
 select f.id,'hard','planner_default_11','Суп — максимум один раз в неделю',true,'max_tag_per_week','{"kind":"max_tag_per_week","tag":"soup","max":1,"severity":"hard"}'::jsonb from public.families f
 on conflict (family_id,code) do nothing;
insert into public.family_rules (family_id,rule_type,code,description,enabled,rule_kind,params)
 select f.id,'hard','planner_default_12','Никакого супа с курицей, лапшой, яйцом и лаймом',true,'ban_recipe_tag','{"kind":"ban_recipe_tag","tag":"chicken_noodle_lime_soup","severity":"hard"}'::jsonb from public.families f
 on conflict (family_id,code) do nothing;
insert into public.family_rules (family_id,rule_type,code,description,enabled,rule_kind,params)
 select f.id,'hard','planner_default_13','Без грибной перегрузки: грибы не чаще 1 блюда в неделю',true,'max_tag_per_week','{"kind":"max_tag_per_week","tag":"mushroom","max":1,"severity":"hard"}'::jsonb from public.families f
 on conflict (family_id,code) do nothing;
insert into public.family_rules (family_id,rule_type,code,description,enabled,rule_kind,params)
 select f.id,'preference','planner_default_14','Полуфабрикаты (чебупели) — не чаще раза в неделю',true,'max_tag_per_week','{"kind":"max_tag_per_week","tag":"convenience","max":1,"severity":"preference"}'::jsonb from public.families f
 on conflict (family_id,code) do nothing;
insert into public.family_rules (family_id,rule_type,code,description,enabled,rule_kind,params)
 select f.id,'preference','planner_default_15','Не делать частым шаблон «курица-гриль + гречка + огурец/помидор»',true,'ban_recipe_tag','{"kind":"ban_recipe_tag","tag":"grilled_chicken_buckwheat","severity":"preference"}'::jsonb from public.families f
 on conflict (family_id,code) do nothing;
insert into public.family_rules (family_id,rule_type,code,description,enabled,rule_kind,params)
 select f.id,'preference','planner_default_16','Любимые блюда предлагать чаще',true,'prefer_recipe','{"kind":"prefer_recipe","recipe_id":"chicken_soy_garlic_rice","weight":2,"severity":"preference"}'::jsonb from public.families f
 on conflict (family_id,code) do nothing;
insert into public.family_rules (family_id,rule_type,code,description,enabled,rule_kind,params)
 select f.id,'preference','planner_default_17','Любимые блюда предлагать чаще',true,'prefer_recipe','{"kind":"prefer_recipe","recipe_id":"beef_teriyaki_rice_zucchini","weight":2,"severity":"preference"}'::jsonb from public.families f
 on conflict (family_id,code) do nothing;
insert into public.family_rules (family_id,rule_type,code,description,enabled,rule_kind,params)
 select f.id,'preference','planner_default_18','Сырники — любимый завтрак',true,'prefer_recipe','{"kind":"prefer_recipe","recipe_id":"syrniki_sour_cream","weight":2,"severity":"preference"}'::jsonb from public.families f
 on conflict (family_id,code) do nothing;
update public.inventory i
set ingredient_id=a.ingredient_id, updated_at=now()
from public.ingredient_aliases a
where i.ingredient_id is null
  and a.alias_norm=btrim(regexp_replace(lower(replace(i.name,'ё','е')),'[^a-zа-я0-9]+',' ','gi'));
commit;
