import { json } from '../server/http.mjs';
import { readSettings } from '../server/storage.mjs';
export default async function handler(req,res) {
  if(req.method!=='GET') return json(res,405,{code:'method'});
  try { const {value}=await readSettings(); return json(res,200,value); }
  catch { return json(res,503,{code:'settings_unavailable'}); }
}
