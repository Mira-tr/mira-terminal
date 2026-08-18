-- RELMUA Schedule expiration job.
-- Review and run after the DB v1 migration is approved.
-- This file intentionally does not run as part of the migration.

select cron.schedule(
    'relmua-schedule-expire-daily',
    '17 3 * * *',
    $$
    delete from public.schedules
    where expires_at < now()
       or status = 'expired';
    $$
);
