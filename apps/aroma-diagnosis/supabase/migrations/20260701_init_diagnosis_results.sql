-- 香り診断の回答・結果を保存するテーブル
-- ※ このマイグレーションは Supabase プロジェクト aroma-shindan
--    (ibygjngtmbewreeffxhe) に適用済みです。記録用に残しています。

create table if not exists public.diagnosis_results (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  answers jsonb not null,
  result_type text not null,
  result_blend text not null,
  nickname text,
  email text
);

alter table public.diagnosis_results enable row level security;

-- 匿名ユーザーは診断結果の登録のみ可能（閲覧は不可 = 個人情報保護）
create policy "anon_can_insert_results"
  on public.diagnosis_results
  for insert
  to anon
  with check (true);

-- 集計用ビュー（個人情報を含まない）
create view public.diagnosis_stats
  with (security_invoker = off) as
  select result_type, count(*) as total
  from public.diagnosis_results
  group by result_type;
