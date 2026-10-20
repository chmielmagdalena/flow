// Panel w przeglądarce — rozmawia z programem przez /api/...
const $ = (s, el = document) => el.querySelector(s);
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function api(sciezka, opcje = {}) {
  const odp = await fetch('/api' + sciezka, {
    method: opcje.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: opcje.body ? JSON.stringify(opcje.body) : undefined
  });
  const dane = await odp.json().catch(() => ({}));
  if (!odp.ok) throw new Error(dane.blad || 'Błąd programu');
  return dane;
}

let STAN = null;

// ---------- zakładki ----------
document.querySelectorAll('.zakladki button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.zakladki button').forEach((x) => x.classList.toggle('aktywna', x === b));
  document.querySelectorAll('.widok').forEach((w) => w.classList.toggle('ukryty', w.id !== 'widok-' + b.dataset.widok));
  if (b.dataset.widok === 'historia') wczytajHistorie();
}));

function pokazWynik(el, tekst, ok) {
  el.textContent = tekst;
  el.className = 'wynik ' + (ok ? 'ok' : 'blad');
}

// ---------- stan ogólny ----------
async function wczytajStan() {
  STAN = await api('/stan');
  const u = STAN.ustawienia;
  const z = $('#tryb-znacznik');
  z.textContent = u.tryb === 'na_zywo' ? 'NA ŻYWO' : 'TRYB TESTOWY';
  z.className = 'znacznik ' + u.tryb;

  const f = $('#form-ustawienia');
  f.tryb.value = u.tryb;
  f.adresTestowy.value = u.adresTestowy || '';
  f.nadawca.value = u.nadawca || '';
  f.podpis.value = u.podpis || '';
  f.maksMailiNaPrzebieg.value = u.maksMailiNaPrzebieg;

  const p = $('#form-poczta');
  p.host.value = u.smtp.host; p.port.value = u.smtp.port; p.uzytkownik.value = u.smtp.uzytkownik;

  const s = STAN.sekrety;
  $('#google-stan').innerHTML = s.kluczGoogle
    ? `Klucz zapisany. Konto techniczne: <strong>${esc(s.kontoGoogle)}</strong> — ten adres musi mieć dostęp do arkusza jako <em>Edytor</em>.`
    : 'Brak klucza. Instrukcja jak go zdobyć: plik INSTRUKCJA.md, krok 3.';
  $('#poczta-stan').textContent = s.hasloSmtp ? 'Hasło zapisane (nie jest nigdzie wyświetlane).' : 'Brak hasła — wpisz je poniżej.';

  const ostrz = [];
  if (!s.kluczGoogle) ostrz.push('Program nie ma jeszcze dostępu do arkusza Google — zakładka <a href="#" data-idz="polaczenia">Połączenia</a>.');
  if (!s.hasloSmtp) ostrz.push('Brak hasła do poczty — zakładka <a href="#" data-idz="polaczenia">Połączenia</a>.');
  if (u.tryb === 'test' && !u.adresTestowy) ostrz.push('Tryb testowy bez adresu testowego — uzupełnij w <a href="#" data-idz="ustawienia">Ustawieniach</a>.');
  $('#ostrzezenia').innerHTML = ostrz.map((o) => `<div class="ostrzezenie">${o}</div>`).join('');
  document.querySelectorAll('[data-idz]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector(`.zakladki button[data-widok="${a.dataset.idz}"]`).click();
  }));
}

setInterval(() => {
  $('#zegar').textContent = new Date().toLocaleTimeString('pl-PL', { timeZone: 'Europe/Warsaw', hour: '2-digit', minute: '2-digit' });
}, 1000);

// ---------- scenariusze ----------
function opisWartosci(w) {
  return String(w ?? '')
    .replace(/\{\{\s*dzien\(\s*\+?(-?\d+)\s*\)\s*\}\}/g, (_, n) => `dzień miesiąca za ${n} dni`)
    .replace(/\{\{\s*data\(\s*\+?(-?\d+)\s*\)\s*\}\}/g, (_, n) => `data za ${n} dni`)
    .replace(/\{\{\{?\s*([^}]+?)\s*\}?\}\}/g, '‹$1›');
}
const OPERATORY = { rowne: '=', rozne: '≠', zawiera: 'zawiera', niepuste: 'nie jest puste', puste: 'jest puste' };

function opisKroku(k) {
  switch (k.typ) {
    case 'arkusz.czytaj': return `zakładka „${esc(k.zakladka)}”`;
    case 'filtr': return (k.warunki || []).map((w) =>
      `${esc(w.pole)} ${OPERATORY[w.op] || w.op}${['niepuste', 'puste'].includes(w.op) ? '' : ' ' + esc(opisWartosci(w.wartosc))}`).join('<br>i ');
    case 'grupuj': return `jeden mail na: ${esc(k.pole)}`;
    case 'mail.wyslij': return `do: ${esc(opisWartosci(k.do))}<br>temat: ${esc(opisWartosci(k.temat))}`;
    case 'arkusz.zapisz': return `odznacz: ${Object.keys(k.pola || {}).map(esc).join(', ')}`;
    default: return '';
  }
}

function narysujMaile(maile) {
  return maile.map((m) => `
    <details class="mail">
      <summary>
        <span class="do">${esc(m.do || '(brak adresu)')}</span>
        <span class="firmy">${esc((m.firmy || []).join(', '))}</span>
        <span class="stan ${esc(m.status)}">${{ podglad: 'do wysłania', wyslano: m.wyslanoNa && m.wyslanoNa !== m.do ? 'wysłano na test' : 'wysłano', blad: 'błąd' }[m.status] || esc(m.status)}${m.zapisano ? ' · odznaczono' : ''}</span>
      </summary>
      ${m.blad ? `<div class="blad-opis">${esc(m.blad)}</div>` : ''}
      <div class="tresc">
        <div class="temat">Temat: ${esc(m.temat)}</div>
        <iframe sandbox="" srcdoc="${esc('<body style="font-family:Segoe UI,sans-serif;font-size:14px;margin:0">' + (m.tresc || '') + '</body>')}"></iframe>
      </div>
    </details>`).join('');
}

function narysujRaport(r) {
  const klasa = r.status === 'ok' ? 'ok' : r.status;
  const liczby = r.przeczytano !== undefined ? ` <small>(wierszy w arkuszu: ${r.przeczytano}, po filtrze: ${r.poFiltrze})</small>` : '';
  return `<div class="komunikat ${klasa}">${esc(r.komunikat)}${liczby}</div>${narysujMaile(r.maile || [])}`;
}

async function wczytajScenariusze() {
  const lista = await api('/scenariusze');
  const pojemnik = $('#lista-scenariuszy');
  pojemnik.innerHTML = '';
  for (const s of lista) {
    const el = $('#szablon-scenariusza').content.firstElementChild.cloneNode(true);
    $('.sc-nazwa', el).textContent = s.nazwa;
    $('.sc-opis', el).textContent = s.opis || '';
    const wl = $('.sc-wlaczony', el);
    const wlOpis = $('.sc-wlaczony-opis', el);
    wl.checked = s.wlaczony;
    wlOpis.textContent = s.wlaczony ? 'włączony' : 'wyłączony';
    $('.sc-godzina', el).value = s.harmonogram?.godzina || '';
    $('.sc-ostatnio', el).textContent = s.ostatnieUruchomienie ? `ostatnio z harmonogramu: ${s.ostatnieUruchomienie}` : '';

    $('.kroki', el).innerHTML = s.kroki.map((k) =>
      `<li class="krok"><strong>${esc(STAN.opisyKrokow[k.typ] || k.typ)}</strong>${opisKroku(k)}</li>`).join('');

    wl.addEventListener('change', async () => {
      try {
        await api('/scenariusze/' + s.id, { method: 'PUT', body: { wlaczony: wl.checked } });
        wlOpis.textContent = wl.checked ? 'włączony' : 'wyłączony';
      } catch (e) { alert(e.message); wl.checked = !wl.checked; }
    });
    $('.sc-godzina', el).addEventListener('change', async (ev) => {
      try { await api('/scenariusze/' + s.id, { method: 'PUT', body: { godzina: ev.target.value } }); }
      catch (e) { alert(e.message); }
    });

    const wynik = $('.sc-wynik', el);
    const przyciski = el.querySelectorAll('.przyciski button');
    async function start(podglad) {
      if (!podglad) {
        const naZywo = STAN.ustawienia.tryb === 'na_zywo';
        const pytanie = naZywo
          ? `Tryb NA ŻYWO: maile pójdą do klientów, a arkusz zostanie odznaczony.\n\nCzy scenariusze w Make są wyłączone?\n\nUruchomić „${s.nazwa}”?`
          : `Tryb testowy: wszystkie maile pójdą na ${STAN.ustawienia.adresTestowy || '(brak adresu!)'}. Arkusz nie zostanie zmieniony.\n\nUruchomić?`;
        if (!confirm(pytanie)) return;
      }
      przyciski.forEach((b) => (b.disabled = true));
      wynik.innerHTML = '<div class="komunikat">Pracuję…</div>';
      try {
        const r = await api(`/scenariusze/${s.id}/uruchom`, { method: 'POST', body: podglad ? { tryb: 'podglad' } : {} });
        wynik.innerHTML = narysujRaport(r);
      } catch (e) {
        wynik.innerHTML = `<div class="komunikat blad">${esc(e.message)}</div>`;
      } finally {
        przyciski.forEach((b) => (b.disabled = false));
      }
    }
    $('.sc-podglad', el).addEventListener('click', () => start(true));
    $('.sc-uruchom', el).addEventListener('click', () => start(false));
    pojemnik.appendChild(el);
  }
}

// ---------- historia ----------
async function wczytajHistorie() {
  const h = await api('/historia');
  if (!h.length) { $('#historia').innerHTML = '<p class="opis">Jeszcze nic nie zostało uruchomione.</p>'; return; }
  $('#historia').innerHTML = `<table>
    <tr><th>Kiedy</th><th>Scenariusz</th><th>Tryb</th><th>Skąd</th><th>Wynik</th></tr>
    ${h.map((r, i) => `
      <tr class="wpis" data-i="${i}">
        <td>${esc(new Date(r.start).toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' }))}</td>
        <td>${esc(r.nazwa || r.scenariusz)}</td>
        <td>${r.tryb === 'na_zywo' ? 'na żywo' : 'test'}</td>
        <td>${esc(r.zrodlo)}</td>
        <td class="status-${esc(r.status)}">${esc(r.komunikat)}</td>
      </tr>
      <tr class="ukryty" id="szczegoly-${i}"><td colspan="5">${narysujMaile(r.maile || [])}</td></tr>`).join('')}
  </table>`;
  document.querySelectorAll('tr.wpis').forEach((tr) => tr.addEventListener('click', () =>
    $('#szczegoly-' + tr.dataset.i).classList.toggle('ukryty')));
}

// ---------- ustawienia ----------
$('#form-ustawienia').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const wynik = $('#wynik-ustawien');
  if (f.tryb.value === 'na_zywo' && STAN.ustawienia.tryb !== 'na_zywo' &&
      !confirm('Przełączasz na NA ŻYWO. Od teraz maile pójdą do klientów.\n\nCzy scenariusze A i B w Make są już wyłączone?')) return;
  try {
    await api('/ustawienia', {
      method: 'PUT',
      body: {
        tryb: f.tryb.value, adresTestowy: f.adresTestowy.value.trim(), nadawca: f.nadawca.value.trim(),
        podpis: f.podpis.value, maksMailiNaPrzebieg: Number(f.maksMailiNaPrzebieg.value)
      }
    });
    pokazWynik(wynik, 'Zapisano.', true);
    await wczytajStan();
  } catch (err) { pokazWynik(wynik, err.message, false); }
});

// ---------- połączenia ----------
$('#google-zapisz').addEventListener('click', async () => {
  const w = $('#wynik-google');
  try {
    await api('/polaczenia/google', { method: 'PUT', body: { klucz: $('#google-klucz').value } });
    $('#google-klucz').value = '';
    pokazWynik(w, 'Klucz zapisany. Teraz udostępnij arkusz adresowi podanemu wyżej i kliknij „Sprawdź połączenie”.', true);
    await wczytajStan();
  } catch (e) { pokazWynik(w, e.message.includes('JSON') ? 'To nie jest poprawny klucz — wklej całą zawartość pliku .json.' : e.message, false); }
});
$('#google-sprawdz').addEventListener('click', async (ev) => {
  const w = $('#wynik-google');
  ev.target.disabled = true; pokazWynik(w, 'Sprawdzam…', true);
  try { pokazWynik(w, (await api('/polaczenia/google/sprawdz', { method: 'POST' })).komunikat, true); }
  catch (e) { pokazWynik(w, e.message, false); }
  finally { ev.target.disabled = false; }
});

$('#form-poczta').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const w = $('#wynik-poczta');
  try {
    await api('/ustawienia', { method: 'PUT', body: { smtp: { host: f.host.value.trim(), port: Number(f.port.value), uzytkownik: f.uzytkownik.value.trim() } } });
    if (f.haslo.value) await api('/polaczenia/poczta', { method: 'PUT', body: { haslo: f.haslo.value } });
    f.haslo.value = '';
    pokazWynik(w, 'Zapisano.', true);
    await wczytajStan();
  } catch (err) { pokazWynik(w, err.message, false); }
});
$('#poczta-sprawdz').addEventListener('click', async (ev) => {
  const w = $('#wynik-poczta');
  ev.target.disabled = true; pokazWynik(w, 'Łączę się z serwerem poczty…', true);
  try { pokazWynik(w, (await api('/polaczenia/poczta/sprawdz', { method: 'POST' })).komunikat, true); }
  catch (e) { pokazWynik(w, e.message, false); }
  finally { ev.target.disabled = false; }
});

// ---------- start ----------
(async () => {
  try {
    await wczytajStan();
    await wczytajScenariusze();
  } catch (e) {
    document.body.insertAdjacentHTML('afterbegin', `<div class="ostrzezenie">Program nie odpowiada: ${esc(e.message)}. Czy okno z programem jest otwarte?</div>`);
  }
})();
