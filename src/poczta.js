// Wysyłka maili przez skrzynkę biura (home.pl). Nie budujemy własnego serwera poczty —
// używamy tego samego serwera SMTP, z którego korzystał Make.
import nodemailer from 'nodemailer';

export function polaczeniePoczty(smtp, haslo) {
  if (!haslo) throw new Error('Brak hasła do poczty. Wpisz je w panelu: Połączenia → Poczta.');
  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: Number(smtp.port),
    secure: Number(smtp.port) === 465, // 465 = SSL od razu; 587 = STARTTLS
    requireTLS: Number(smtp.port) !== 465,
    auth: { user: smtp.uzytkownik, pass: haslo },
    connectionTimeout: 20000
  });
  return {
    async sprawdz() { await transport.verify(); },
    async wyslij({ od, do: adresat, temat, html, tekst }) {
      const info = await transport.sendMail({ from: od, to: adresat, subject: temat, html, text: tekst });
      return info.messageId;
    }
  };
}
