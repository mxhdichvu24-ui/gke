export function json(res, status, body) {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store'});
  res.end(JSON.stringify(body));
}

export async function parseBody(req, maximumBytes = 16384) {
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
    return {error: 415};
  }
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return Buffer.byteLength(JSON.stringify(req.body)) <= maximumBytes ? {data: req.body} : {error: 413};
  }
  try {
    let content = typeof req.body === 'string' ? req.body : '';
    if (!content) {
      for await (const chunk of req) {
        content += chunk;
        if (Buffer.byteLength(content) > maximumBytes) return {error: 413};
      }
    }
    return Buffer.byteLength(content) <= maximumBytes ? {data: JSON.parse(content)} : {error: 413};
  } catch {
    return {error: 400};
  }
}
