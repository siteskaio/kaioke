export function youtubeId(input:string):string|null {
  const value=input.trim(); if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;
  try {const url=new URL(value); const host=url.hostname.toLowerCase().replace(/^www\./,'').replace(/^m\./,'');
    if(host==='youtu.be') {const id=url.pathname.split('/')[1]; return /^[\w-]{11}$/.test(id)?id:null;}
    if(host==='youtube.com'||host==='music.youtube.com'||host==='youtube-nocookie.com') {
      const id=url.searchParams.get('v')||(url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/)||[])[1];return id && /^[\w-]{11}$/.test(id)?id:null;
    }
  } catch {} return null;
}
export function thumbnail(id:string){return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
