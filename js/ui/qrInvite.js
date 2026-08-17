import { h } from '../core/dom.js';
import qrcode from '../vendor/qrcode/qrcode.js';

/** Mostra un overlay con QR + link per invitare gli amici. Funziona anche offline. */
export function openInviteModal() {
  const url = `${location.origin}${location.pathname}`;
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  const svgMarkup = qr.createSvgTag(6, 8);

  const qrWrap = h('div', { class: 'qr-wrap', html: svgMarkup });

  const backdrop = h('div', { class: 'modal-backdrop' }, [
    h('div', { class: 'modal-card' }, [
      h('h3', {}, "Fai scaricare l'app agli altri"),
      h('p', { class: 'text-muted' }, 'Fai inquadrare questo codice, oppure condividi il link: si apre direttamente nel browser, nessuna app da installare.'),
      qrWrap,
      h('p', { class: 'pill' }, url),
      h(
        'button',
        {
          class: 'btn btn-secondary',
          onclick: () => backdrop.remove(),
        },
        'Chiudi'
      ),
    ]),
  ]);

  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) backdrop.remove();
  });

  document.body.appendChild(backdrop);
}
