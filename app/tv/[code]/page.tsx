import TvClient from '@/components/tv-client';
export default async function Page({params}:{params:Promise<{code:string}>}){const {code}=await params;return <TvClient code={code.toUpperCase()}/>}
