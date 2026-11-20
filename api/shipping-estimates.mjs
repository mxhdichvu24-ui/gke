import { json, parseBody } from '../server/http.mjs';
import { estimate } from '../server/shipping.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, {code: 'method'});
  const {data, error} = await parseBody(req);
  if (error) return json(res, error, {code: 'invalid_input'});
  // Synthetic tariff fixtures are for unit tests, never public quotes.
  const {http, body} = estimate(data,{...process.env,GKE_DEMO_RATES:'0'});
  return json(res, http, body);
}
