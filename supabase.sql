-- Execute UMA vez no SQL Editor do seu projeto Supabase.
create table if not exists public.rooms (
 code varchar(6) primary key,
 name varchar(60) not null,
 admin_hash char(64) not null,
 current_song_id uuid,
 playback_state text not null default 'paused' check(playback_state in ('playing','paused')),
 created_at timestamptz not null default now()
);
create table if not exists public.songs (
 id uuid primary key default gen_random_uuid(),
 room_code varchar(6) not null references public.rooms(code) on delete cascade,
 video_id varchar(11) not null,
 title varchar(180) not null,
 channel varchar(90) not null default 'YouTube',
 thumbnail text not null,
 requested_by varchar(32) not null,
 status text not null default 'queued' check(status in ('queued','playing','done','skipped')),
 position bigint not null default 0,
 created_at timestamptz not null default now()
);
create index if not exists songs_by_room on public.songs(room_code, status, position);
-- Todos os acessos são feitos pela API Next.js, com service_role apenas no servidor.
-- Não há acesso direto ao banco pelo navegador.
alter table public.rooms enable row level security;
alter table public.songs enable row level security;
