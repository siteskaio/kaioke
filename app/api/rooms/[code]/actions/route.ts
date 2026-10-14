import {db,validKey} from '@/lib/db';import {codeOk,fail,replyError} from '@/lib/server';import type {Song} from '@/lib/types';
export async function POST(request:Request,{params}:{params:Promise<{code:string}>}){try{const {code}=await params;if(!codeOk(code))return fail('Código inválido');const rooms=await db<{admin_hash:string;current_song_id:string|null}[]>('rooms',`?code=eq.${code}&select=admin_hash,current_song_id`);const room=rooms[0];if(!room)return fail('Sala inexistente',404);
 if(!validKey(request.headers.get('x-admin-key')||undefined,room.admin_hash))return fail('Apenas o anfitrião pode controlar o telão.',403);
 const body=await request.json();const action=String(body.action||'');
 const queue=await db<Song[]>('songs',`?room_code=eq.${code}&status=eq.queued&select=*&order=position.asc,created_at.asc&limit=150`);
 const patchRoom=async(fields:Record<string,unknown>)=>db('rooms',`?code=eq.${code}`,{method:'PATCH',body:JSON.stringify(fields)});
 const patchSong=async(id:string,fields:Record<string,unknown>)=>db('songs',`?id=eq.${id}&room_code=eq.${code}`,{method:'PATCH',body:JSON.stringify(fields)});
 if(action==='next'||action==='play'){
   if(room.current_song_id)await patchSong(room.current_song_id,{status:action==='next'?'skipped':'done'});
   const next=queue[0];await patchRoom({current_song_id:next?.id||null,playback_state:next?'playing':'paused'});if(next)await patchSong(next.id,{status:'playing'});
 } else if(action==='pause'||action==='resume'){await patchRoom({playback_state:action==='pause'?'paused':'playing'});
 } else if(action==='remove'){
   const id=String(body.id||'');const matching=await db<Song[]>('songs',`?id=eq.${encodeURIComponent(id)}&room_code=eq.${code}&select=id,status`);
   if(!matching.length)return fail('Música não encontrada',404);
   if(id===room.current_song_id){await patchSong(id,{status:'skipped'});const next=queue[0];await patchRoom({current_song_id:next?.id||null,playback_state:next?'playing':'paused'});if(next)await patchSong(next.id,{status:'playing'});}
   else await patchSong(id,{status:'skipped'});
 } else if(action==='clear'){
   await db('songs',`?room_code=eq.${code}&status=eq.queued`,{method:'PATCH',body:JSON.stringify({status:'skipped'})});
 } else return fail('Ação inválida');
 return Response.json({ok:true});}catch(error){return replyError(error)}}
