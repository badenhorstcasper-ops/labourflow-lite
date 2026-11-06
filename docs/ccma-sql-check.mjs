// Local check of supabase/migrations/20261106130000_ccma_deadline_tracker.sql in PGlite (Postgres in WASM)
// with stubs for auth/cron/vault and the live is_account_member/current_account_owner helpers.
// Run: mkdir -p /tmp/pgl && cd /tmp/pgl && npm i @electric-sql/pglite && cp /workspace/pocket-consultant/docs/ccma-sql-check.mjs . && node ccma-sql-check.mjs
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
const db = new PGlite();
const q = async (sql, p) => (await db.query(sql, p)).rows;
await db.exec(`
create role anon; create role authenticated; create role service_role;
create schema auth; create schema cron; create schema vault; create schema net;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
grant usage on schema auth to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
create table cron.job (jobid serial, jobname text unique, schedule text, command text);
create function cron.schedule(n text, s text, c text) returns bigint language sql as $$ insert into cron.job(jobname,schedule,command) values (n,s,c) returning jobid $$;
create function cron.unschedule(n text) returns boolean language sql as $$ delete from cron.job where jobname=n returning true $$;
create table vault.decrypted_secrets (name text, decrypted_secret text);
create table public.team_members (owner_user_id uuid, member_user_id uuid, status text, joined_at timestamptz default now());
grant select on public.team_members to authenticated;
create function public.current_account_owner() returns uuid language sql stable security definer set search_path=public as $$
  select coalesce((select owner_user_id from public.team_members where member_user_id = auth.uid() and status='active' order by joined_at desc nulls last limit 1), auth.uid()) $$;
create function public.is_account_member(_owner uuid, _user uuid) returns boolean language sql stable security definer set search_path=public as $$
  select _owner = _user or exists (select 1 from public.team_members where owner_user_id=_owner and member_user_id=_user and status='active') $$;
grant usage on schema public to authenticated, anon, service_role;
`);
await db.exec(fs.readFileSync('/workspace/pocket-consultant/supabase/migrations/20261106130000_ccma_deadline_tracker.sql','utf8'));
await db.exec(`grant select, insert, update, delete on public.ccma_matters to authenticated; grant all on all tables in schema public to service_role;`);
// re-apply the reminder privilege lines after the broad grant above (Supabase default privileges grant all, migration revokes)
await db.exec(`revoke insert, update, delete on public.ccma_deadline_reminders from anon, authenticated; grant select on public.ccma_deadline_reminders to authenticated; grant update (read_at) on public.ccma_deadline_reminders to authenticated;`);
// run migration twice: idempotent?
await db.exec(fs.readFileSync('/workspace/pocket-consultant/supabase/migrations/20261106130000_ccma_deadline_tracker.sql','utf8'));
console.log('cron jobs', await q(`select jobname, schedule from cron.job`));
const A='00000000-0000-0000-0000-00000000000a', B='00000000-0000-0000-0000-00000000000b', C='00000000-0000-0000-0000-00000000000c';
await db.exec(`insert into public.team_members values ('${A}','${C}','active', now())`);
const as = async (uid, sql) => { await db.exec(`set role authenticated; select set_config('test.uid','${uid}',false);`); try { return await q(sql); } finally { await db.exec(`reset role;`); } };
const today = (await q(`select (now() at time zone 'Africa/Johannesburg')::date::text d`))[0].d;
console.log('today SAST', today);
// A inserts dismissal with dummy due_date (server must override)
const ins = await as(A, `insert into public.ccma_matters (title, dispute_type, trigger_date, due_date, reminder_days) values ('  Test dismissal ', 'unfair_dismissal', '2026-11-01', '2099-01-01', '{1,7,7,99,3}') returning title, due_date::text, owner_user_id, created_by_user_id, reminder_days`);
console.log('insert', ins);
console.log('discrimination', await as(A, `insert into public.ccma_matters (title, dispute_type, trigger_date) values ('disc','unfair_discrimination','2026-08-31') returning due_date::text`));
console.log('custom', await as(A, `insert into public.ccma_matters (title, dispute_type, custom_due_date) values ('custom','custom','${today}') returning due_date::text`));
try { await as(A, `insert into public.ccma_matters (title, dispute_type) values ('bad','unfair_dismissal')`); console.log('BAD: no error'); } catch(e) { console.log('missing trigger rejected:', e.message.slice(0,80)); }
try { await as(A, `insert into public.ccma_matters (title, dispute_type, trigger_date, owner_user_id) values ('steal','review_award','2026-11-01','${B}')`); console.log('BAD: inserted into B'); } catch(e) { console.log('foreign owner rejected:', e.message.slice(0,80)); }
// due soon: trigger so that due = today+3 for dismissal
await as(A, `insert into public.ccma_matters (title, dispute_type, trigger_date) values ('soon','unfair_dismissal', '${today}'::date - 27)`);
await as(A, `insert into public.ccma_matters (title, dispute_type, trigger_date, email_reminders) values ('overdue noemail','rescission', '${today}'::date - 16, false)`);
await as(A, `insert into public.ccma_matters (title, dispute_type, trigger_date, status) values ('done one','rescission', '${today}'::date - 14, 'done')`);
console.log('B sees', (await as(B, `select count(*)::int n from public.ccma_matters`))[0].n);
console.log('C (team) sees', (await as(C, `select count(*)::int n from public.ccma_matters`))[0].n);
console.log('B update affects', (await as(B, `update public.ccma_matters set title='hack' returning id`)).length);
try { await as(A, `select public.flag_ccma_deadline_reminders()`); console.log('BAD: user can run flag'); } catch(e) { console.log('user cannot run flag:', e.message.slice(0,60)); }
await db.exec(`set role service_role`);
console.log('flag 1', await q(`select public.flag_ccma_deadline_reminders() n`));
console.log('flag 2 (idempotent)', await q(`select public.flag_ccma_deadline_reminders() n`));
await db.exec(`reset role`);
console.log('reminders', await q(`select m.title, r.stage, r.days_left, r.email_status from public.ccma_deadline_reminders r join public.ccma_matters m on m.id=r.matter_id order by m.title`));
console.log('reminder_sent_at set', await q(`select title, reminder_sent_at is not null s from public.ccma_matters order by title`));
console.log('A reads reminders', (await as(A, `select count(*)::int n from public.ccma_deadline_reminders`))[0].n, 'B', (await as(B, `select count(*)::int n from public.ccma_deadline_reminders`))[0].n);
console.log('A marks read', (await as(A, `update public.ccma_deadline_reminders set read_at=now() returning id`)).length);
try { await as(A, `update public.ccma_deadline_reminders set email_status='sent'`); console.log('BAD: user changed email_status'); } catch(e) { console.log('email_status locked:', e.message.slice(0,60)); }
try { await as(A, `insert into public.ccma_deadline_reminders (matter_id, owner_user_id, recipient_user_id, due_date, stage, days_left) select id, owner_user_id, created_by_user_id, due_date, 5, 5 from public.ccma_matters limit 1`); console.log('BAD insert'); } catch(e) { console.log('user insert blocked:', e.message.slice(0,60)); }
// done -> completed_at; editing date re-arms
console.log('done', await as(A, `update public.ccma_matters set status='done' where title='soon' returning completed_at is not null c, due_date::text`));
console.log('reopen + move date', await as(A, `update public.ccma_matters set status='open', trigger_date=trigger_date+1, owner_user_id='${B}' where title='soon' returning completed_at, due_date::text, owner_user_id='${A}' as owner_kept`));
await db.exec(`set role service_role`);
console.log('flag 3 after date move', await q(`select public.flag_ccma_deadline_reminders() n`));
await db.exec(`reset role`);
console.log('stage fn', await q(`select public.ccma_reminder_stage(5,'{7,3,1}') a, public.ccma_reminder_stage(10,'{7,3,1}') b, public.ccma_reminder_stage(0,'{}') c, public.ccma_reminder_stage(-8,'{7}') d, public.ccma_reminder_stage(2,'{}') e`));
