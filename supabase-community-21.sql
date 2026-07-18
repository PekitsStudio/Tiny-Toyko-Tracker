-- Teil 21: Fortschritt/Gamification – Login-Streak + Sammlerpfad.
-- Nur neue Spalten in user_settings (eigene Zeile, RLS wie gehabt). Level und
-- Achievements werden in der App aus vorhandenen Daten berechnet – keine
-- weiteren Tabellen noetig.

alter table user_settings add column if not exists last_login   date;
alter table user_settings add column if not exists streak       integer not null default 0;
alter table user_settings add column if not exists best_streak  integer not null default 0;
alter table user_settings add column if not exists collector_path text;
