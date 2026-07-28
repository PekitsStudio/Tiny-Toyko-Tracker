-- Teil 24: Wertverlauf-Altlasten bereinigen.
-- Bis zur Waehrungstrennung speicherte value_history eine gemischte EUR+USD-Summe.
-- Ab jetzt wird nur noch der EUR-Anteil gespeichert. Damit der Chart am
-- Umstellungstag keinen kuenstlichen Knick (in Hoehe des alten USD-Anteils) hat,
-- werden die alten Zeilen geleert – der Verlauf baut sich mit je einem Snapshot
-- pro Tag von selbst wieder auf.
--
-- Achtung: leert den Verlauf ALLER Nutzer. Fuer eine einzelne Person stattdessen:
--   delete from value_history where user_id = '<deine-user-id>';

delete from value_history;
