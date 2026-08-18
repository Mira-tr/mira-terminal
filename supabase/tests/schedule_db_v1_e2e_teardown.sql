select set_config('role', 'postgres', true);

delete from public.schedules
where owner_id = '20000000-0000-4000-8000-000000000001'
  and title like 'RELMUA E2E %';
