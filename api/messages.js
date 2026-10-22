const L = require('./_lib');

// Devuelve una página del historial de mensajes del gateway (para sincronizar quién recibió y quién no).
module.exports = async (req, res) => {
  if (req.method !== 'POST') return L.json(res, 405, { ok: false });
  if (!L.isAuthed(req)) return L.json(res, 401, { ok: false, error: 'Sesión vencida' });
  if (!L.gateReady()) return L.json(res, 200, { ok: false, error: 'Faltan SMSGATE_USER y SMSGATE_PASS en Vercel' });
  const { from, offset, limit } = await L.readJson(req);
  const qs = new URLSearchParams();
  if (from && /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(String(from))) qs.set('from', String(from));
  qs.set('offset', String(Math.max(0, parseInt(offset, 10) || 0)));
  qs.set('limit', String(Math.min(100, Math.max(1, parseInt(limit, 10) || 50))));
  try {
    const r = await L.gate('/messages?' + qs.toString(), 'GET');
    if (r.status === 401 || r.status === 403) return L.json(res, 200, { ok: false, error: 'Credenciales del gateway incorrectas' });
    if (!(r.status >= 200 && r.status < 300)) return L.json(res, 200, { ok: false, error: `El gateway respondió ${r.status}` });
    const arr = await r.json();
    const total = parseInt(r.headers.get('x-total-count') || '0', 10) || null;
    const items = (Array.isArray(arr) ? arr : []).map((m) => ({
      id: m.id,
      state: m.state,
      recipients: (m.recipients || []).map((x) => ({ p: x.phoneNumber, s: x.state, e: x.error ? String(x.error).slice(0, 80) : '' })),
    }));
    L.json(res, 200, { ok: true, total, items });
  } catch (e) {
    L.json(res, 200, { ok: false, error: L.friendly(e) });
  }
};
