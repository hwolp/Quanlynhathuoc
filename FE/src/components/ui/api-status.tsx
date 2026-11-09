import { useRef, useState } from 'react';
export function useApiAction() {
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');const inFlight=useRef(false);
 async function run<T>(task:()=>Promise<T>) {
  if(inFlight.current)return;
  inFlight.current=true;setBusy(true);setError('');
  try { return await task(); }
  catch(error) { const message=error instanceof Error?error.message:'Có lỗi khi kết nối API.';setError(message);window.dispatchEvent(new CustomEvent('pharmacare:api-error',{detail:message})); }
  finally {inFlight.current=false;setBusy(false);}
 }
 return {busy,error,run};
}
export function ApiStatus({busy,error,onRetry}:{busy:boolean;error:string;onRetry?:()=>void}) {
 if(error)return <div role="alert" className="api-status api-error">{error}{onRetry&&<button onClick={onRetry}>Thử lại</button>}</div>;
 return busy?<div className="api-status" role="status"><span className="api-spinner"/>Đang đồng bộ dữ liệu với máy chủ…</div>:null;
}
