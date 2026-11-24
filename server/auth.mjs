import { createHmac, randomBytes, timingSafeEqual, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import { localAdmin, localMode, consumeLimit } from './storage.mjs';
import {listDocuments} from './documents.mjs';

const scrypt = promisify(scryptCallback);
const equal = (a,b) => { const x=Buffer.from(a); const y=Buffer.from(b); return x.length === y.length && timingSafeEqual(x,y); };
export async function hashPassword(password) {
  const salt = randomBytes(24).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${hash.toString('hex')}`;
}
export async function checkPassword(password, stored) {
  if (typeof password !== 'string' || password.length > 256 || !/^scrypt:[a-f0-9]{48}:[a-f0-9]{128}$/.test(stored || '')) return false;
  const [, salt, hash] = stored.split(':');
  return equal((await scrypt(password,salt,64)).toString('hex'),hash);
}
export async function credentials() {
  if ((process.env.GKE_ADMIN_USERNAME || process.env.GKE_ADMIN_EMAIL) && process.env.GKE_ADMIN_PASSWORD_HASH && process.env.GKE_SESSION_SECRET?.length >= 32)
    return {email:(process.env.GKE_ADMIN_USERNAME || process.env.GKE_ADMIN_EMAIL).toLowerCase(), passwordHash:process.env.GKE_ADMIN_PASSWORD_HASH, secret:process.env.GKE_SESSION_SECRET};
  return localAdmin();
}
export function sameOrigin(req) {
  if (req.headers['sec-fetch-site'] === 'cross-site') return false;
  const origin=req.headers.origin;
  if (!origin) return req.headers['sec-fetch-site'] === 'same-origin';
  try {
    const target=new URL(origin);
    const host=String(req.headers.host || '');
    return target.host === host && (target.protocol === 'https:' || (localMode() && target.protocol === 'http:'));
  } catch { return false; }
}
export function fingerprint(req, secret) {
  const address = (process.env.VERCEL ? req.headers['x-vercel-forwarded-for'] : req.socket?.remoteAddress) || 'unknown';
  return createHmac('sha256',secret).update(String(address).split(',')[0].trim()).digest('hex');
}
const cookieName = () => localMode() ? 'gke_admin' : '__Host-gke_admin';
export function setSession(res, config,identity={email:config.email,role:'owner'}) {
  const payload=Buffer.from(JSON.stringify({email:identity.email,version:identity.version??null, exp:Date.now()+8*60*60*1000})).toString('base64url');
  const token=payload+'.'+createHmac('sha256',config.secret).update(payload).digest('base64url');
  res.setHeader('Set-Cookie',`${cookieName()}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${localMode()?'':'; Secure'}`);
}
export function clearSession(res) {
  res.setHeader('Set-Cookie',`${cookieName()}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${localMode()?'':'; Secure'}`);
}
export async function session(req) {
  const config=await credentials();
  if (!config) return null;
  const cookie=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName()+'='))?.slice(cookieName().length+1);
  if (!cookie || cookie.length>2000) return null;
  const [payload,signature]=cookie.split('.');
  if (!payload||!signature || !equal(signature,createHmac('sha256',config.secret).update(payload).digest('base64url'))) return null;
  try {
    const data=JSON.parse(Buffer.from(payload,'base64url').toString());
    if(!Number.isFinite(data.exp)||data.exp<=Date.now())return null;
    if(data.email===config.email)return{email:data.email,role:'owner'};
    const row=(await listDocuments('staff')).find(row=>row.value.email===data.email&&row.value.enabled);
    return row&&row.revision===data.version?{email:data.email,role:row.value.role}:null;
  } catch { return null; }
}
export async function authenticate(email,password,config){
 if(typeof email!=='string')return null;email=email.trim().toLowerCase();
 if(email===config.email)return await checkPassword(password,config.passwordHash)?{email,role:'owner'}:null;
 const row=(await listDocuments('staff')).find(row=>row.value.email===email&&row.value.enabled);
 return row&&await checkPassword(password,row.value.passwordHash)?{email,role:row.value.role,version:row.revision}:null;
}
export const hasRole=(user,...roles)=>Boolean(user&&roles.includes(user.role||'owner'));
export async function allowLogin(req, config) {
  return consumeLimit('login:'+fingerprint(req,config.secret),8,900);
}
export const setupAllowed = req => localMode() && /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(req.headers.host || '') && ['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket?.remoteAddress);
