const crypto = require('crypto');
const L = require('./_lib');

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return L.json(res, 405, { ok: false });
  if (!L.isAuthed(req)) return L.json(res, 401, { ok: false, error: 'Sesión vencida' });
  const c = L.cleanCampaign(await L.readJson(req));
  if (!c.u) return L.json(res, 200, { ok: false, error: 'Falta una URL de destino válida (con http o https)' });
  // El título es opcional: si no hay, se usa el dominio del destino.
  if (!c.t) c.t = new URL(c.u).hostname.replace(/^www\./, '');
  c.r = 1; // al abrir el enlace, la persona va directo al destino
  const base = L.publicBase(req);

  if (L.kvCfg()) {
    try {
      let slug = '';
      for (let i = 0; i < 7; i++) slug += ALPHABET[crypto.randomInt(ALPHABET.length)];
      await L.kv(['SET', 'c:' + slug, JSON.stringify(c)]);
      return L.json(res, 200, { ok: true, link: `${base}/c/${slug}`, short: true });
    } catch (e) {
      return L.json(res, 200, { ok: false, error: 'No se pudo guardar en la base de datos: ' + e.message });
    }
  }
  // Sin base de datos: los datos viajan dentro del enlace (más largo).
  const d = Buffer.from(JSON.stringify(c)).toString('base64url');
  L.json(res, 200, { ok: true, link: `${base}/l?d=${d}`, short: false });
};
