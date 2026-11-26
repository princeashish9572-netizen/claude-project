-- Schema behaviour tests. Run with scripts/test-db.sh (plain PostgreSQL + stub).
\set ON_ERROR_STOP 1
\set QUIET 1
\o /dev/null

-- Fixture users -------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000b2', 'intruder@example.com');
insert into public.admins (user_id, full_name) values ('00000000-0000-0000-0000-0000000000a1', 'Admin');

create or replace function pg_temp.expect_error(p_sql text, p_like text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm not ilike p_like then
      raise exception 'expected error like "%" but got "%" for: %', p_like, sqlerrm, p_sql;
    end if;
    return;
  end;
  raise exception 'expected error like "%" but statement succeeded: %', p_like, p_sql;
end $$;
grant execute on function pg_temp.expect_error(text, text) to anon, authenticated, service_role;

-- 1. anon has no access -----------------------------------------------------
set role anon;
select pg_temp.expect_error('select * from public.students', '%permission denied%');
select pg_temp.expect_error('select * from public.student_fee_summary', '%permission denied%');
select pg_temp.expect_error($q$select public.record_payment(gen_random_uuid(), 10)$q$, '%permission denied%');
reset role;
\echo 'ok  anon is denied'

-- 2. authenticated non-admin sees nothing and cannot write ------------------
set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
do $$ begin assert (select count(*) from public.students) = 0; end $$;
select pg_temp.expect_error($q$insert into public.students (name, phone, course, admission_date, fee_amount, schedule_start_date)
  values ('X', '9999999999', 'C', current_date, 100, current_date)$q$, '%row-level security%');
select pg_temp.expect_error($q$select public.record_payment(gen_random_uuid(), 10)$q$, '%Not authorized%');
select pg_temp.expect_error($q$select public.claim_daily_reminder(current_date)$q$, '%Not authorized%');
reset role;
\echo 'ok  non-admin is denied'

-- 3. admin creates students; dues are generated -----------------------------
set role authenticated;
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

insert into public.students (id, name, phone, course, admission_date, fee_amount, billing_cycle, schedule_start_date)
values ('10000000-0000-0000-0000-000000000001', '  Ravi   Kumar ', '98765-43210', 'JEE', public.ist_today() - 70, 1000, 'monthly', public.ist_today() - 70);

do $$
declare v_today date := public.ist_today(); r record;
begin
  select * into r from public.students where id = '10000000-0000-0000-0000-000000000001';
  assert r.name = 'Ravi Kumar', 'name normalised';
  assert r.phone = '9876543210', 'phone normalised';
  -- Past dues + exactly one future-or-horizon due exist; none beyond horizon unless it is the first future one.
  assert (select count(*) from public.fee_dues where student_id = r.id and due_date <= v_today) = 3, 'three dues to date';
  assert (select count(*) from public.fee_dues where student_id = r.id and due_date > v_today) >= 1, 'an upcoming due exists';
  assert (select bool_and(source = 'auto' and amount = 1000) from public.fee_dues where student_id = r.id);
  assert (select pending_balance from public.student_fee_summary where id = r.id) = 3000;
  assert (select payment_status from public.student_fee_summary where id = r.id) = 'overdue';
end $$;
\echo 'ok  monthly dues generated with IST today'

-- Month-end anchoring (no drift)
insert into public.students (id, name, phone, course, admission_date, fee_amount, billing_cycle, schedule_start_date, end_date)
values ('10000000-0000-0000-0000-000000000002', 'Month End', '9876500000', 'NEET', '2026-01-31', 500, 'monthly', '2026-01-31', '2026-04-30');
do $$ begin
  assert (select array_agg(due_date order by due_date) from public.fee_dues where student_id = '10000000-0000-0000-0000-000000000002')
    = array['2026-01-31','2026-02-28','2026-03-31','2026-04-30']::date[], 'month-end anchored, stops at end_date';
end $$;
\echo 'ok  month-end anchoring and end_date'

-- Custom (every 2 months) and one-time
insert into public.students (id, name, phone, course, admission_date, fee_amount, billing_cycle, cycle_interval_months, schedule_start_date, end_date)
values ('10000000-0000-0000-0000-000000000003', 'Custom', '9876500001', 'JEE', '2026-01-15', 2000, 'custom', 2, '2026-01-15', '2026-12-31');
insert into public.students (id, name, phone, course, admission_date, fee_amount, billing_cycle, schedule_start_date)
values ('10000000-0000-0000-0000-000000000004', 'One Time', '9876500002', 'Crash', public.ist_today(), 5000, 'one_time', public.ist_today());
do $$ begin
  assert (select array_agg(due_date order by due_date) from public.fee_dues where student_id = '10000000-0000-0000-0000-000000000003')
    = array['2026-01-15','2026-03-15','2026-05-15','2026-07-15','2026-09-15','2026-11-15']::date[], 'custom 2-month cycle';
  assert (select count(*) from public.fee_dues where student_id = '10000000-0000-0000-0000-000000000004') = 1;
  assert (select payment_status from public.student_fee_summary where id = '10000000-0000-0000-0000-000000000004') = 'due_today';
end $$;
\echo 'ok  custom and one-time schedules'

-- 4. Direct writes to protected columns/tables are rejected ------------------
select pg_temp.expect_error($q$update public.fee_dues set amount_paid = 1000$q$, '%permission denied%');
select pg_temp.expect_error($q$insert into public.payments (student_id, amount) values ('10000000-0000-0000-0000-000000000001', 1)$q$, '%permission denied%');
select pg_temp.expect_error($q$update public.students set cycles_generated = 99$q$, '%permission denied%');
select pg_temp.expect_error($q$insert into public.fee_dues (student_id, due_date, amount, source) values ('10000000-0000-0000-0000-000000000001', current_date, 1, 'auto')$q$, '%permission denied%');
select pg_temp.expect_error($q$delete from public.students$q$, '%permission denied%');
\echo 'ok  protected columns are not writable'

-- 5. Payments: partial, FIFO, advance, overpay, void -------------------------
do $$
declare v_p public.payments; v_today date := public.ist_today(); v_first date; v_future_before int; v_future_after int;
begin
  select min(due_date) into v_first from public.fee_dues where student_id = '10000000-0000-0000-0000-000000000001';

  -- Partial payment
  v_p := public.record_payment('10000000-0000-0000-0000-000000000001', 400, v_today, 'upi', 'UTR123', null, null);
  assert v_p.receipt_no like 'RCP-______-______', 'receipt number format';
  assert (select amount_paid from public.fee_dues where student_id = '10000000-0000-0000-0000-000000000001' and due_date = v_first) = 400;
  assert (select pending_balance from public.student_fee_summary where id = '10000000-0000-0000-0000-000000000001') = 2600;

  -- FIFO across dues: 600 finishes first due, 1000 pays second, 200 into third
  perform public.record_payment('10000000-0000-0000-0000-000000000001', 1800);
  assert (select array_agg(amount_paid order by due_date) from public.fee_dues
          where student_id = '10000000-0000-0000-0000-000000000001' and due_date <= v_today) = array[1000, 1000, 200]::numeric[];

  -- Advance payment: pays all remaining open dues then bills further cycles early.
  select count(*) into v_future_before from public.fee_dues where student_id = '10000000-0000-0000-0000-000000000001';
  perform public.record_payment('10000000-0000-0000-0000-000000000001',
    (select sum(balance) from public.fee_dues where student_id = '10000000-0000-0000-0000-000000000001') + 1500);
  select count(*) into v_future_after from public.fee_dues where student_id = '10000000-0000-0000-0000-000000000001';
  assert v_future_after = v_future_before + 2, 'two advance dues created';
  assert (select sum(balance) from public.fee_dues where student_id = '10000000-0000-0000-0000-000000000001') = 500;
  assert (select payment_status from public.student_fee_summary where id = '10000000-0000-0000-0000-000000000001') = 'paid';

  -- Void the 1800 payment: dues reopen
  select * into v_p from public.payments where student_id = '10000000-0000-0000-0000-000000000001' and amount = 1800;
  perform public.void_payment(v_p.id, 'Cheque bounced');
  assert (select voided_at is not null from public.payments where id = v_p.id);
  assert not exists (select 1 from public.payment_allocations where payment_id = v_p.id);
  assert (select sum(balance) from public.fee_dues where student_id = '10000000-0000-0000-0000-000000000001') = 2300;
  assert (select total_paid from public.student_fee_summary where id = '10000000-0000-0000-0000-000000000001')
       = (select sum(amount) from public.payments where student_id = '10000000-0000-0000-0000-000000000001' and voided_at is null);
end $$;
select pg_temp.expect_error($q$select public.record_payment('10000000-0000-0000-0000-000000000004', 5001)$q$, '%exceeds the outstanding balance by 1.00%');
select pg_temp.expect_error($q$select public.record_payment('10000000-0000-0000-0000-000000000004', 10.555)$q$, '%2 decimal places%');
select pg_temp.expect_error($q$select public.record_payment('10000000-0000-0000-0000-000000000004', 10, public.ist_today() + 1)$q$, '%future%');
select pg_temp.expect_error($q$select public.record_payment('10000000-0000-0000-0000-000000000004', 10, null, 'cash', null, null,
  (select id from public.fee_dues where student_id = '10000000-0000-0000-0000-000000000001' limit 1))$q$, '%does not belong%');
select pg_temp.expect_error($q$select public.void_payment((select id from public.payments where voided_at is not null limit 1), 'again')$q$, '%already voided%');
select pg_temp.expect_error($q$select public.void_payment((select id from public.payments where voided_at is null limit 1), '  ')$q$, '%reason is required%');
\echo 'ok  payments: partial, FIFO, advance, overpay guard, void'

-- Pay a specific due first
do $$
declare v_due uuid;
begin
  select id into v_due from public.fee_dues where student_id = '10000000-0000-0000-0000-000000000003' order by due_date desc limit 1;
  perform public.record_payment('10000000-0000-0000-0000-000000000003', 500, null, 'cash', null, null, v_due);
  assert (select amount_paid from public.fee_dues where id = v_due) = 500;
end $$;
\echo 'ok  targeted allocation'

-- Manual dues
insert into public.fee_dues (student_id, due_date, amount, description)
values ('10000000-0000-0000-0000-000000000004', public.ist_today() - 1, 750, 'Exam fee');
do $$ begin
  assert (select source from public.fee_dues where description = 'Exam fee') = 'manual';
  assert (select payment_status from public.student_fee_summary where id = '10000000-0000-0000-0000-000000000004') = 'overdue';
end $$;
\echo 'ok  manual dues'

-- 6. Reschedule, archive, unarchive ----------------------------------------
do $$
declare v_today date := public.ist_today();
begin
  update public.students set fee_amount = 1200, schedule_start_date = v_today + 3
  where id = '10000000-0000-0000-0000-000000000004';
  -- one_time due on today (unpaid, >= new start? no: today < today+3) is kept; new one-time due at today+3
  assert (select count(*) from public.fee_dues where student_id = '10000000-0000-0000-0000-000000000004' and source = 'auto') = 2;
  assert exists (select 1 from public.fee_dues where student_id = '10000000-0000-0000-0000-000000000004' and due_date = v_today + 3 and amount = 1200);

  update public.students set status = 'archived' where id = '10000000-0000-0000-0000-000000000004';
  assert (select archived_at is not null from public.students where id = '10000000-0000-0000-0000-000000000004');
  assert not exists (select 1 from public.fee_dues where student_id = '10000000-0000-0000-0000-000000000004' and due_date > v_today and amount_paid = 0 and source = 'auto');

  -- Archive + unarchive a monthly student: resumes from the next cycle, no back-billing
  insert into public.students (id, name, phone, course, admission_date, fee_amount, billing_cycle, schedule_start_date)
  values ('10000000-0000-0000-0000-000000000005', 'Pause', '9876500005', 'JEE', v_today, 800, 'monthly', v_today);
  update public.students set status = 'archived' where id = '10000000-0000-0000-0000-000000000005';
  update public.students set status = 'active' where id = '10000000-0000-0000-0000-000000000005';
  assert (select count(*) from public.fee_dues where student_id = '10000000-0000-0000-0000-000000000005' and due_date < v_today) = 0;
  -- The next cycle removed on archive is billed again on restore (not skipped).
  assert exists (select 1 from public.fee_dues where student_id = '10000000-0000-0000-0000-000000000005'
                 and due_date = (v_today + interval '1 month')::date), 'next cycle restored after unarchive';

  -- Shortening then extending end_date restores the trimmed cycles.
  update public.students set end_date = v_today where id = '10000000-0000-0000-0000-000000000005';
  assert not exists (select 1 from public.fee_dues where student_id = '10000000-0000-0000-0000-000000000005' and due_date > v_today);
  update public.students set end_date = null where id = '10000000-0000-0000-0000-000000000005';
  assert exists (select 1 from public.fee_dues where student_id = '10000000-0000-0000-0000-000000000005'
                 and due_date = (v_today + interval '1 month')::date), 'cycle restored after extending end date';
end $$;
\echo 'ok  reschedule, archive, unarchive'

-- 7. Dashboard ---------------------------------------------------------------
do $$
declare d record;
begin
  select * into d from public.dashboard_summary(7);
  assert d.total_students = (select count(*) from public.students where status = 'active');
  assert d.archived_students = 1;
  assert d.month_collection >= 0;
  assert d.overdue_amount = (select coalesce(sum(f.balance), 0) from public.fee_dues f join public.students s on s.id = f.student_id
                              where s.status = 'active' and f.due_date < public.ist_today());
end $$;
\echo 'ok  dashboard summary'

-- 8. Reminder de-duplication -------------------------------------------------
do $$
declare v1 uuid; v2 uuid; v3 uuid; v4 uuid; v5 uuid;
begin
  v1 := public.claim_daily_reminder(public.ist_today(), 'manual');
  assert v1 is not null, 'first claim succeeds';
  v2 := public.claim_daily_reminder(public.ist_today(), 'cron');
  assert v2 is null, 'concurrent/second claim is refused';
  perform public.finish_daily_reminder(v1, 'failed', null, null, null, null, 'telegram down');
  v3 := public.claim_daily_reminder(public.ist_today(), 'cron');
  assert v3 = v1, 'failed reminder can be retried';
  perform public.finish_daily_reminder(v3, 'sent', 2, 3, 1234.5, 'msg', null);
  v4 := public.claim_daily_reminder(public.ist_today(), 'cron');
  assert v4 is null, 'sent reminder is not sent again';
  v5 := public.claim_daily_reminder(public.ist_today(), 'manual', true);
  assert v5 = v1, 'explicit force resend allowed';
  assert (select attempts from public.reminder_logs where id = v1) = 3;
end $$;
\echo 'ok  reminder de-duplication'
reset role;

-- 9. Service role (cron) ------------------------------------------------------
set role service_role;
set request.jwt.claims = '{"role":"service_role"}';
do $$ begin
  perform public.generate_all_dues(45);
  perform public.claim_daily_reminder(public.ist_today() + 1, 'cron');
end $$;
reset role;
\echo 'ok  service role can run cron functions'

\echo 'ALL SCHEMA TESTS PASSED'
