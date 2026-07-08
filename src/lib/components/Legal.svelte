<script lang="ts">
  import { legal } from '$lib/stores/legal.svelte';
  function close() { legal.hide(); }
  function onkey(e: KeyboardEvent) { if (e.key === 'Escape') close(); }
</script>

<svelte:window onkeydown={onkey} />

{#if legal.open}
  <div class="ov" onclick={close} role="presentation">
    <div class="dlg" role="dialog" aria-modal="true" onclick={(e) => e.stopPropagation()}>
      <button class="x" onclick={close} aria-label="Schließen">✕</button>
      <div class="content">
        <h1>Rechtliches</h1>

        <h2>Impressum</h2>
        <h3>Angaben gemäß § 5 DDG</h3>
        <p>Julian Asleh<br />Fiedlerstraße 5<br />37115 Duderstadt<br />Deutschland</p>
        <h3>Kontakt</h3>
        <p>E-Mail: <a href="mailto:julianasleh@gmail.com">julianasleh@gmail.com</a></p>
        <h3>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h3>
        <p>Julian Asleh, Fiedlerstraße 5, 37115 Duderstadt</p>
        <h3>EU-Streitschlichtung</h3>
        <p>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
          <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener">https://ec.europa.eu/consumers/odr/</a>.
          Unsere E-Mail-Adresse finden Sie oben im Impressum.</p>
        <h3>Verbraucherstreitbeilegung / Universalschlichtungsstelle</h3>
        <p>Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.</p>

        <h2>Datenschutzerklärung</h2>
        <h3>1. Datenschutz auf einen Blick</h3>
        <p>Die folgenden Hinweise geben einen Überblick darüber, was mit Ihren personenbezogenen
          Daten passiert, wenn Sie diese Anwendung („Tiny Tokyo Tracker") nutzen. Personenbezogene
          Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.</p>
        <h3>2. Verantwortliche Stelle</h3>
        <p>Verantwortlich für die Datenverarbeitung in dieser Anwendung ist:<br />
          Julian Asleh, Fiedlerstraße 5, 37115 Duderstadt, Deutschland<br />
          E-Mail: <a href="mailto:julianasleh@gmail.com">julianasleh@gmail.com</a></p>
        <h3>3. Hosting (GitHub Pages)</h3>
        <p>Diese Anwendung wird bei GitHub Pages gehostet, einem Dienst der GitHub, Inc.,
          88 Colin P. Kelly Jr. St, San Francisco, CA 94107, USA. Beim Aufruf der Seite erfasst
          GitHub technisch notwendige Daten (insbesondere die IP-Adresse) in Server-Logfiles.
          Die Verarbeitung erfolgt auf Grundlage unseres berechtigten Interesses an einer sicheren
          und zuverlässigen Bereitstellung (Art. 6 Abs. 1 lit. f DSGVO). GitHub ist nach dem
          EU-US Data Privacy Framework zertifiziert.
          <a href="https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener">GitHub Privacy Statement</a>.</p>
        <h3>4. Benutzerkonto, Datenbank und Anmeldung (Supabase)</h3>
        <p>Für die Nutzung ist ein Benutzerkonto erforderlich. Bei der Registrierung werden Ihre
          E-Mail-Adresse und ein Passwort (verschlüsselt/gehasht) gespeichert. Ihre Sammlungs-,
          Wunschlisten- und Handelsdaten werden in einer Datenbank des Dienstes Supabase
          (Supabase Inc.) gespeichert. Die Verarbeitung erfolgt zur Erfüllung des
          Nutzungsverhältnisses (Art. 6 Abs. 1 lit. b DSGVO).
          <a href="https://supabase.com/privacy" target="_blank" rel="noopener">Supabase Privacy Policy</a>.</p>
        <h3>5. Community- und Marktplatz-Funktionen</h3>
        <p>Bestimmte Angaben sind für andere angemeldete Nutzer sichtbar, sofern Sie sie selbst
          hinterlegen oder aktiv nutzen: Anzeigename, Land, „Über mich"-Text, Kontaktangabe,
          Verkaufsangebote, Gesuche, Handels-Statistiken und Abzeichen. Alle diese Angaben sind
          freiwillig (Art. 6 Abs. 1 lit. a und b DSGVO).</p>
        <h3>6. Cookies und lokale Speicherung</h3>
        <p>Diese Anwendung verwendet keine Tracking- oder Werbe-Cookies. Im lokalen Speicher Ihres
          Browsers (LocalStorage) werden ausschließlich technisch notwendige Daten abgelegt:
          Ihre Anmelde-Sitzung, Darstellungs-Einstellungen und zuletzt genutzte Sucheingaben
          (Art. 6 Abs. 1 lit. f DSGVO; § 25 Abs. 2 TDDDG).</p>
        <h3>7. Schriftarten</h3>
        <p>Alle Schriftarten sind lokal eingebunden. Es findet keine Verbindung zu Servern von
          Google oder anderen Schriftanbietern statt.</p>
        <h3>8. Bot-Schutz (Cloudflare Turnstile)</h3>
        <p>Zum Schutz vor automatisierten Anmeldungen setzen wir auf der Anmeldeseite den Dienst
          Turnstile der Cloudflare, Inc., 101 Townsend St., San Francisco, CA 94107, USA ein.
          Dabei wird Ihre IP-Adresse an Cloudflare übermittelt und geprüft, ob die Eingabe von
          einem Menschen stammt; es werden keine Werbeprofile erstellt. Rechtsgrundlage ist unser
          berechtigtes Interesse am Schutz der Plattform vor Missbrauch (Art. 6 Abs. 1 lit. f DSGVO).
          Cloudflare ist nach dem EU-US Data Privacy Framework zertifiziert.
          <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener">Cloudflare Privacy Policy</a>.</p>
        <h3>9. Kartendaten und -bilder von Drittanbietern</h3>
        <p>Zur Anzeige von Karteninformationen, Bildern und Marktpreisen ruft die Anwendung Daten
          von Drittanbieter-Schnittstellen ab (TCGdex, Scryfall, YGOPRODeck, OPTCG-API sowie
          Preisdaten von Cardmarket/TCGplayer über diese Dienste). Dabei wird Ihre IP-Adresse an
          den jeweiligen Anbieter übermittelt (Art. 6 Abs. 1 lit. f DSGVO). Alle Preisangaben ohne Gewähr.</p>
        <h3>10. Ihre Rechte</h3>
        <p>Sie haben jederzeit das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16),
          Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit
          (Art. 20) sowie Widerspruch (Art. 21). Zur Löschung Ihres Kontos samt aller Daten genügt
          eine formlose E-Mail an <a href="mailto:julianasleh@gmail.com">julianasleh@gmail.com</a>.
          Außerdem haben Sie ein Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde, z. B. der
          Landesbeauftragten für den Datenschutz Niedersachsen.</p>
        <h3>11. SSL-/TLS-Verschlüsselung</h3>
        <p>Diese Anwendung nutzt aus Sicherheitsgründen eine SSL-/TLS-Verschlüsselung („https://").</p>

        <h2>Disclaimer</h2>
        <h3>Haftung für Inhalte</h3>
        <p>Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte nach den allgemeinen
          Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir nicht verpflichtet, übermittelte
          oder gespeicherte fremde Informationen zu überwachen. Bei Bekanntwerden von
          Rechtsverletzungen entfernen wir entsprechende Inhalte umgehend.</p>
        <h3>Nutzerinhalte und Handel zwischen Nutzern</h3>
        <p>Angebote, Gesuche, Bewertungen und Profile werden von Nutzern erstellt. Die Plattform
          vermittelt lediglich den Kontakt; Kaufverträge oder Tauschgeschäfte kommen ausschließlich
          zwischen den beteiligten Nutzern zustande. Für Abwicklung, Bezahlung, Versand und den
          Zustand der Karten sind allein die handelnden Nutzer verantwortlich.</p>
        <h3>Marktpreise</h3>
        <p>Angezeigte Kartenwerte stammen aus Drittquellen (u. a. Cardmarket, TCGplayer) und dienen
          nur der Orientierung. Alle Angaben ohne Gewähr; sie stellen keine Anlage- oder
          Preisberatung dar.</p>
        <h3>Haftung für Links</h3>
        <p>Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen
          Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter
          oder Betreiber verantwortlich.</p>
        <h3>Urheberrecht</h3>
        <p>Kartenbilder, Kartennamen und Logos sind Eigentum der jeweiligen Rechteinhaber
          (u. a. The Pokémon Company, Wizards of the Coast, Konami, Bandai) und werden nur zur
          Identifikation der Sammelobjekte angezeigt. Diese Anwendung steht in keiner Verbindung
          zu diesen Unternehmen.</p>

        <p class="muted">Stand: Juli 2026 · Erstellt in Anlehnung an die Muster von eRecht24 – ersetzt keine Rechtsberatung.</p>
      </div>
    </div>
  </div>
{/if}

<style>
  .ov { position: fixed; inset: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 300; padding: 16px; }
  .dlg { position: relative; background: var(--surface, #171a23); border: 1px solid #2a2f3a; border-radius: 16px; max-width: 780px; width: 100%; max-height: 92vh; overflow: auto; }
  .x { position: absolute; top: 10px; right: 10px; width: 34px; height: 34px; border-radius: 999px; border: 1px solid #2a2f3a; background: rgba(0,0,0,0.3); color: inherit; cursor: pointer; z-index: 2; }
  .content { padding: 26px 28px; line-height: 1.6; }
  .content h1 { font-size: 1.5rem; margin: 0 0 8px; }
  .content h2 { font-size: 1.2rem; margin-top: 30px; border-bottom: 1px solid #2a2f3a; padding-bottom: 6px; }
  .content h3 { font-size: 1rem; margin-top: 18px; }
  .content a { color: var(--gold, #f5c451); }
  .content .muted { color: var(--muted, #9aa0ad); font-size: 0.85rem; margin-top: 20px; }
</style>
