import {db} from '@/lib/db';import {codeOk,fail,replyError} from '@/lib/server';import {youtubeId,thumbnail} from '@/lib/youtube';
export async function POST(request:Request,{params}:{params:Promise<{code:string}>}){try{const {code}=await params;if(!codeOk(code))return fail('Código inválido');const room=await db<{code:string}[]>('rooms',`?code=eq.${code}&select=code`);if(!room.length)return fail('Sala não encontrada',404);
 const b=await request.json();const videoId=youtubeId(String(b.videoId||b.url||''));if(!videoId)return fail('Insira um link válido do YouTube.');const requested_by=String(b.requestedBy||'Convidado').trim().slice(0,32)||'Convidado';
 const recent=await db<{id:string}[]>('songs',`?room_code=eq.${code}&status=in.(queued,playing)&select=id&limit=150`);if(recent.length>=150)return fail('Fila cheia. Remova algumas músicas.');
 // Metadados de vídeo obtidos via oEmbed (sem consumir a cota Data API). Em falhas, mantemos o link.
 let title=`Vídeo ${videoId}`,channel='YouTube';let image=thumbnail(videoId);
 try{const response=await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent('https://www.youtube.com/watch?v='+videoId)}&format=json`,{signal:AbortSignal.timeout(3500),cache:'no-store'});if(response.ok){const info=await response.json();title=String(info.title||title).slice(0,180);channel=String(info.author_name||channel).slice(0,90);image=String(info.thumbnail_url||image)}}catch{}
 const position=Date.now();const inserted=await db('songs','',{method:'POST',body:JSON.stringify({room_code:code,video_id:videoId,title,channel,thumbnail:image,requested_by,status:'queued',position})});
 return Response.json({song:(inserted as any[])[0]});}catch(error){return replyError(error)}}
