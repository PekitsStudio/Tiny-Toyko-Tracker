-- Teil 22: Collector Points (CP) + eingeloeste Quests.
-- Quests selbst werden in der App aus vorhandenen Zeitstempeln berechnet und
-- rotieren deterministisch pro Woche/Tag – hier nur die gespeicherte Belohnung.

alter table user_settings add column if not exists cp             integer not null default 0;
alter table user_settings add column if not exists claimed_quests text[]  not null default '{}';
