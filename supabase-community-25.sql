-- Teil 25: CP-Wirtschaft server-seitig absichern (P1.3).
-- Bisher lasen/rechneten/schrieben Client-Funktionen die CP direkt in
-- user_settings. Das ist (a) manipulierbar (jeder darf seine eigene Zeile
-- updaten) und (b) anfaellig fuer Lost-Updates (Doppelklick/zwei Tabs).
-- Loesung: die drei Operationen laufen als atomare SECURITY-DEFINER-Funktionen,
-- und die betroffenen Spalten sind fuer normale Nutzer nicht mehr direkt
-- schreibbar – nur noch ueber diese Funktionen.

-- 1) Belohnung einloesen (Quest ODER Achievement). Fuegt CP nur hinzu, wenn die
--    claim_id noch nicht eingeloest wurde -> keine Doppel-Einloesung, atomar.
create or replace function claim_reward(p_claim_id text, p_cp integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_cp integer;
begin
  if p_claim_id is null or length(p_claim_id) = 0 then
    raise exception 'Ungueltige claim_id';
  end if;
  if p_cp is null or p_cp < 0 or p_cp > 100000 then
    raise exception 'Ungueltiger CP-Betrag';
  end if;
  insert into user_settings (user_id) values (auth.uid()) on conflict (user_id) do nothing;

  update user_settings
     set cp = cp + p_cp,
         claimed_quests = array_append(claimed_quests, p_claim_id)
   where user_id = auth.uid()
     and not (p_claim_id = any(claimed_quests))
  returning cp into v_cp;

  if v_cp is null then
    -- bereits eingeloest -> aktuellen Stand unveraendert zurueckgeben
    select cp into v_cp from user_settings where user_id = auth.uid();
  end if;
  return coalesce(v_cp, 0);
end $$;

-- 2) Avatar kaufen: zieht den Preis nur ab, wenn genug CP da sind und der Avatar
--    noch nicht besessen wird – beides in einer atomaren UPDATE-Bedingung.
create or replace function buy_avatar(p_path text, p_price integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_cp integer; v_owned boolean;
begin
  if p_path is null or length(p_path) = 0 then
    raise exception 'Ungueltiger Pfad';
  end if;
  if p_price is null or p_price < 0 or p_price > 100000 then
    raise exception 'Ungueltiger Preis';
  end if;
  insert into user_settings (user_id) values (auth.uid()) on conflict (user_id) do nothing;

  update user_settings
     set cp = cp - p_price,
         owned_avatars = array_append(owned_avatars, p_path)
   where user_id = auth.uid()
     and cp >= p_price
     and not (p_path = any(owned_avatars))
  returning cp into v_cp;

  if v_cp is not null then
    return v_cp; -- Kauf erfolgreich
  end if;

  -- Fehlgeschlagen: entweder schon im Besitz (dann kein Fehler) oder zu wenig CP.
  select cp, (p_path = any(owned_avatars)) into v_cp, v_owned
    from user_settings where user_id = auth.uid();
  if coalesce(v_owned, false) then
    return coalesce(v_cp, 0);
  end if;
  raise exception 'Nicht genug Collector Points.';
end $$;

-- 3) Login-Streak taeglich fortschreiben (statt im Client zu rechnen).
create or replace function touch_login()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_last date; v_streak integer; v_best integer;
begin
  insert into user_settings (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  select last_login, streak, best_streak into v_last, v_streak, v_best
    from user_settings where user_id = auth.uid();
  if v_last = current_date then
    return; -- heute schon gezaehlt
  end if;
  if v_last = current_date - 1 then
    v_streak := coalesce(v_streak, 0) + 1;
  else
    v_streak := 1;
  end if;
  v_best := greatest(coalesce(v_best, 0), v_streak);
  update user_settings
     set last_login = current_date, streak = v_streak, best_streak = v_best
   where user_id = auth.uid();
end $$;

grant execute on function claim_reward(text, integer) to authenticated;
grant execute on function buy_avatar(text, integer) to authenticated;
grant execute on function touch_login() to authenticated;

-- 4) Die sensiblen Spalten sind jetzt nur noch ueber die Funktionen schreibbar.
--    (Profilfelder wie country/bio/avatar_url/collector_path bleiben normal
--    editierbar – sie stehen bewusst nicht in dieser Liste.)
revoke update (cp, owned_avatars, claimed_quests, streak, best_streak, last_login)
  on user_settings from authenticated;
