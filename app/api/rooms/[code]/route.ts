import {db} from '@/lib/db';import {codeOk,fail,replyError} from '@/lib/server';import type {Room,Song} from '@/lib/types';
export const dynamic='force-dynamic';
export async function GET(_:Request,{params}:{params:Promise<{code:string}>}){try{const {code}=await params;if(!codeOk(code))return fail('Código inválido.');const rooms=await db<Room[]>('rooms',`?code=eq.${code}&select=code,name,current_song_id,playback_state,created_at`);if(!rooms.length)return fail('Sala não encontrada.',404);
 const songs=await db<Song[]>('songs',`?room_code=eq.${code}&select=*&order=created_at.asc&limit=300`);
 return Response.json({room:rooms[0],songs},{headers:{'Cache-Control':'no-store'}})}catch(error){return replyError(error)}}
