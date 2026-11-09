import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
/** Native modal provides focus containment, Escape handling and focus restoration. */
export function Dialog({children,onClose,label}: {children:ReactNode;onClose:()=>void;label:string}) {
 const [apiError,setApiError]=useState('');
 useEffect(()=>{const handler=(event:Event)=>setApiError((event as CustomEvent<string>).detail);window.addEventListener('pharmacare:api-error',handler);return()=>window.removeEventListener('pharmacare:api-error',handler);},[]);
 const ref=useRef<HTMLDialogElement>(null);
 const closeRef=useRef(onClose); closeRef.current=onClose;
 useEffect(()=>{const dialog=ref.current;const previous=document.activeElement as HTMLElement|null;dialog?.showModal();return()=>{dialog?.close();previous?.focus();};},[]);
 return createPortal(<dialog ref={ref} className="pc-dialog" aria-label={label} onCancel={e=>{e.preventDefault();closeRef.current();}} onClick={e=>{if(e.target===e.currentTarget)closeRef.current();}}><div className="pc-dialog-content">{apiError&&<div className="api-status api-error" role="alert">{apiError}</div>}{children}</div></dialog>,document.body);
}
