-- Teil 26: Sprach-Codes vereinheitlichen (Design-Review P17).
-- Bisher wurde language beim Speichern mal klein ("de"), mal gross ("DE")
-- abgelegt -> in der Statistik tauchte dieselbe Sprache doppelt auf. Der Client
-- schreibt jetzt konsequent Grossbuchstaben; hier werden die Altbestaende
-- angeglichen.

update cards    set language = upper(language) where language is not null and language <> upper(language);
update wishlist set language = upper(language) where language is not null and language <> upper(language);
