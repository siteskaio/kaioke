import {NextResponse} from 'next/server';
export const fail=(message:string,status=400)=>NextResponse.json({error:message},{status});
export const codeOk=(code:string)=>/^[A-Z0-9]{6}$/.test(code);
export function replyError(error:unknown){console.error(error);return fail(error instanceof Error?error.message:'Falha inesperada',500)}
