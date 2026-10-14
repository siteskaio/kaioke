import {createHash, timingSafeEqual} from 'node:crypto';
const base=process.env.SUPABASE_URL?.replace(/\/$/,'');
const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
export function configured(){return Boolean(base&&secret)}
export function hash(value:string){return createHash('sha256').update(value).digest('hex')}
export function validKey(provided:string|undefined,stored:string|undefined){if(!provided||!stored)return false;const a=Buffer.from(hash(provided));const b=Buffer.from(stored);return a.length===b.length&&timingSafeEqual(a,b)}
export async function db<T=unknown>(table:string,query:string='',options:RequestInit={}):Promise<T>{
 if(!configured())throw new Error('Supabase não configurado. Veja o README.md e .env.local.');
 const response=await fetch(`${base}/rest/v1/${table}${query}`,{
   ...options, cache:'no-store',headers:{apikey:secret!,Authorization:`Bearer ${secret}`,'Content-Type':'application/json',Prefer:'return=representation',...options.headers}
 });
 if(!response.ok){const msg=await response.text();throw new Error(`Erro Supabase (${response.status}): ${msg.slice(0,300)}`)}
 const raw=await response.text();return (raw?JSON.parse(raw):null) as T;
}
export function textParam(s:string){return encodeURIComponent(s)}
