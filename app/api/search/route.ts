import {fail,replyError} from '@/lib/server';import {youtubeId,thumbnail} from '@/lib/youtube';
export async function GET(request:Request){try{const url=new URL(request.url);const q=(url.searchParams.get('q')||'').trim().slice(0,100);if(q.length<2)return fail('Digite pelo menos 2 caracteres.');
 const key=process.env.YOUTUBE_API_KEY;if(!key)return fail('Pesquisa do YouTube ainda não configurada. Cole um link direto ou configure YOUTUBE_API_KEY.',503);
 const exact=youtubeId(q);const params=new URLSearchParams({part:'snippet',q:exact||`${q} karaokê playback letra`,type:'video',videoEmbeddable:'true',maxResults:'18',key});
 const response=await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`,{cache:'no-store'});const data=await response.json();if(!response.ok)return fail(data?.error?.message||'Erro na pesquisa do YouTube',response.status);
 const items=(data.items||[]).map((it:any)=>({videoId:it.id.videoId,title:it.snippet.title,channel:it.snippet.channelTitle,thumbnail:it.snippet.thumbnails?.medium?.url||thumbnail(it.id.videoId)}));return Response.json({items},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return replyError(error)}}
