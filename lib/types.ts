export type Song = {id:string;room_code:string;video_id:string;title:string;channel:string;thumbnail:string;requested_by:string;status:'queued'|'playing'|'done'|'skipped';position:number;created_at:string};
export type Room = {code:string;name:string;current_song_id:string|null;playback_state:'playing'|'paused';created_at:string};
export type SearchItem = {videoId:string;title:string;channel:string;thumbnail:string};
