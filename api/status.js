const L = require('./_lib');

// Consulta el estado REAL de cada mensaje en SMSGate (en cola, enviado, entregado, fallido).
module.exports = async (req, res) => {
  if (req.method !== 'POST') return L.json(res, 405, { ok: false });
  if (!L.isAuthed(req)) return L.json(res, 401, { ok: false, error: 'Sesión vencida' });
  if (!L.gateReady()) return L.json(res, 200, { ok: false, error: 'Faltan SMSGATE_USER y SMSGATE_PASS en Vercel' });
  const { ids } = await L.readJson(req);
  const list = (Array.isArray(ids) ? ids : []).map(String).filter((i) => /^[\w-]{1,40}$/.test(i)).slice(0, 25);
  const results = {};
  await Promise.all(list.map(async (id) => {
    try {
      let r = await L.gate('/messages/' + id, 'GET');
      if (r.status === 404) r = await L.gate('/message/' + id, 'GET');
      if (r.status >= 200 && r.status < 300) {
        const j = await r.json();
        const bad = (j.recipients || []).find((x) => x.state === 'Failed');
        results[id] = { state: j.state, error: bad && bad.error ? String(bad.error).slice(0, 80) : '' };
      } else {
        results[id] = { state: 'Unknown' };
      }
    } catch (e) {
      results[id] = { state: 'Unknown' };
    }
  }));
  L.json(res, 200, { ok: true, results });
};
