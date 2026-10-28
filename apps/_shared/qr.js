// Draws a QR code of link into el; the code is also the link, so a phone
// page can be tried on a computer (the car's browser blocks new windows)
export async function qr(el, link, size) {
  if (!window.QRCode) {
    await new Promise((resolve, reject) => {
      const s = Object.assign(document.createElement('script'), { src: '/probe/qrcode.min.js', onload: resolve, onerror: reject });
      document.head.append(s);
    });
  }
  const a = Object.assign(document.createElement('a'), { href: link, target: '_blank', rel: 'noopener' });
  el.replaceChildren(a);
  new QRCode(a, { text: link, width: size, height: size, correctLevel: QRCode.CorrectLevel.M });
}
