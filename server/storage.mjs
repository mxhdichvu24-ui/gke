import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { defaultSettings } from '../src/site-defaults.mjs';
import {routeCarriers} from '../src/warehouse/data/carriers.mjs';

let queue = Promise.resolve();
const empty = () => ({settings: {value: structuredClone(defaultSettings), revision: 0}, contacts: [], limits: {}, admin: null});
export const localMode = () => process.env.GKE_LOCAL_DEV === '1' && !process.env.VERCEL && process.env.NODE_ENV !== 'production';
const filename = () => resolve(process.env.GKE_LOCAL_DATA || '.gke-local/data.json');
export const storageReady = () => localMode() || Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);

async function localRead() {
  try { return JSON.parse(await readFile(filename(), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return empty(); throw error; }
}

export function localTransaction(change) {
  if (!localMode()) throw new Error('Local storage is unavailable');
  const task = queue.then(async () => {
    const data = await localRead();
    const result = await change(data);
    const target = filename();
    await mkdir(dirname(target), {recursive: true, mode: 0o700});
    const temp = `${target}.${randomUUID()}.tmp`;
    await writeFile(temp, JSON.stringify(data), {mode: 0o600});
    await rename(temp, target);
    return result;
  });
  queue = task.catch(() => {});
  return task;
}

export async function supabase(path, {method = 'GET', body, prefer} = {}) {
  if (!storageReady() || localMode()) throw new Error('Cloud storage is unavailable');
  const headers = {apikey: process.env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`, 'Content-Type':'application/json'};
  if (process.env.SUPABASE_SECRET_KEY.startsWith('sb_secret_')) delete headers.Authorization;
  if (prefer) headers.Prefer = prefer;
  const response = await fetch(new URL(`/rest/v1/${path}`, process.env.SUPABASE_URL), {
    method, headers, ...(body === undefined ? {} : {body: JSON.stringify(body)}), signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw Object.assign(new Error('Storage request failed'),{status:response.status});
  if (response.status === 204) return null;
  const content = await response.text();
  return content ? JSON.parse(content) : null;
}

export async function readSettings() {
  if (localMode()) { await queue; return (await localRead()).settings; }
  if (!storageReady()) return {value: structuredClone(defaultSettings), revision: 0};
  const rows = await supabase('gke_site_settings?id=eq.main&select=value,revision');
  return rows[0] || {value: structuredClone(defaultSettings), revision: 0};
}

export async function saveSettings(value, revision, actor) {
  if (localMode()) return localTransaction(data => {
    if (data.settings.revision !== revision) return {code: 'conflict'};
    data.settings = {value, revision: revision + 1, updated_at: new Date().toISOString(), updated_by: actor};
    return data.settings;
  });
  return supabase('rpc/save_gke_settings', {method: 'POST', body: {new_value: value, expected_revision: revision, actor}});
}

export async function consumeLimit(key, maximum, seconds) {
  const bucket = Math.floor(Date.now() / 1000 / seconds);
  if (localMode()) return localTransaction(data => {
    const id = `${key}:${bucket}:${seconds}`;
    data.limits[id] = (data.limits[id] || 0) + 1;
    for (const k of Object.keys(data.limits)) if (Number(k.split(':').at(-2))*Number(k.split(':').at(-1)) < Date.now()/1000-86400) delete data.limits[k];
    return data.limits[id] <= maximum;
  });
  return supabase('rpc/consume_gke_limit', {method: 'POST', body: {limit_key: key, max_attempts: maximum, period_seconds: seconds}});
}

export async function acceptContact({key, digest, payload, fingerprint}) {
  if (!localMode()) return supabase('rpc/accept_gke_contact', {method:'POST', body: {request_key:key, payload_hash:digest, request_payload:payload, client_hash:fingerprint}});
  return localTransaction(data => {
    const old = data.contacts.find(row => row.request_key === key);
    if (old) return old.payload_hash === digest ? {reference: old.reference} : {code:'idempotency_conflict'};
    const bucket = Math.floor(Date.now()/900000);
    const limitKey = `contact:${fingerprint}:${bucket}:900`;
    if ((data.limits[limitKey] || 0) >= 5) return {code:'rate_limited'};
    data.limits[limitKey] = (data.limits[limitKey] || 0) + 1;
    const row = {request_key:key, reference: randomUUID(), payload_hash:digest, payload, status:'received', notes:'', created_at:new Date().toISOString()};
    data.contacts.unshift(row);
    data.contactVersion=(data.contactVersion||0)+1;
    return {reference:row.reference};
  });
}

export async function listContacts() {
  if (localMode()) { await queue; return (await localRead()).contacts; }
  const all = [];
  for (let offset=0; ;offset+=1000) {
    const rows = await supabase(`gke_quote_requests?select=reference,payload,status,notes,created_at&order=created_at.desc&limit=1000&offset=${offset}`);
    all.push(...rows);
    if (rows.length < 1000) return all;
  }
}

export async function updateContact(reference, patch) {
  const changes=row=>{
    const {carrier,...fields}=patch;
    if(carrier===undefined)return fields;
    if(typeof carrier!=='string'||(carrier!==''&&!routeCarriers[row.payload.route]?.includes(carrier)))throw new Error('invalid_carrier');
    return {...fields,payload:{...row.payload,carrier}};
  };
  if (localMode()) return localTransaction(data => {
    const row = data.contacts.find(item => item.reference === reference);
    if (!row) return null;
    Object.assign(row, changes(row));
    data.contactVersion=(data.contactVersion||0)+1;
    return row;
  });
  let fields=patch;
  if(patch.carrier!==undefined){
    const current=await supabase(`gke_quote_requests?reference=eq.${encodeURIComponent(reference)}&select=payload&limit=1`);
    if(!current[0])return null;
    fields=changes(current[0]);
  }
  const rows = await supabase(`gke_quote_requests?reference=eq.${encodeURIComponent(reference)}`, {method:'PATCH', body:fields, prefer:'return=representation'});
  return rows[0] || null;
}

export async function localAdmin() {
  if (!localMode()) return null;
  await queue;
  return (await localRead()).admin;
}

// Server-side access for additional administrator workspace data.
export async function localReadState(){await queue;return localRead();}

export async function contactVersion(){
  if(localMode()){await queue;return String((await localRead()).contactVersion||0);}
  const rows=await supabase('gke_contact_revision?id=eq.main&select=version');
  if(!rows?.length)throw new Error('Missing contact revision');
  return String(rows[0].version);
}
