import {randomBytes} from 'node:crypto';
import {db,hash} from '@/lib/db';import {fail,replyError} from '@/lib/server';
export async function POST(request:Request){try{const body=await request.json().catch(()=>({}));const name=String(body.name||'Minha festa').trim().slice(0,60);if(!name)return fail('Dê um nome à sua festa.');
 const code=randomBytes(4).toString('hex').slice(0,6).toUpperCase();const adminKey=randomBytes(24).toString('hex');
 await db('rooms','',{method:'POST',body:JSON.stringify({code,name,admin_hash:hash(adminKey),playback_state:'paused'})});
 return Response.json({code,adminKey});}catch(error){return replyError(error)}}
