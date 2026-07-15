"use client";

import { FormEvent, useMemo, useState } from "react";

type Entry = { id:number; name:string; status:string; pax:number; note:string; createdAt:string };

export default function Semakan() {
  const [pin,setPin]=useState(""); const [entries,setEntries]=useState<Entry[]>([]); const [error,setError]=useState(""); const [loading,setLoading]=useState(false); const [opened,setOpened]=useState(false);
  async function load(e:FormEvent){ e.preventDefault(); setLoading(true); setError(""); try { const r=await fetch("/api/rsvp",{headers:{"x-admin-pin":pin}}); if(!r.ok) throw new Error(); const d=await r.json(); setEntries(d.entries); setOpened(true); } catch { setError("PIN salah atau senarai belum tersedia."); } finally { setLoading(false); } }
  async function remove(entry:Entry){
    if(!window.confirm(`Padam jawapan daripada ${entry.name}?`)) return;
    const r=await fetch("/api/rsvp",{method:"DELETE",headers:{"content-type":"application/json","x-admin-pin":pin},body:JSON.stringify({id:entry.id})});
    if(r.ok) setEntries(current=>current.filter(item=>item.id!==entry.id));
    else window.alert("Catatan belum dapat dipadam. Cuba lagi.");
  }
  const totals=useMemo(()=>({ hadir:entries.filter(e=>e.status==="Hadir").reduce((s,e)=>s+e.pax,0), tidak:entries.filter(e=>e.status==="Tidak hadir").length, pasti:entries.filter(e=>e.status==="Belum pasti").length }),[entries]);
  return <main className="admin-shell"><section className="admin-card"><p className="eyebrow">EJAL & HANAH</p><h1>Semakan RSVP</h1>{!opened?<form onSubmit={load}><label className="field-label" htmlFor="pin">PIN pengantin</label><input id="pin" type="password" inputMode="numeric" value={pin} onChange={e=>setPin(e.target.value)} placeholder="Masukkan PIN"/><button className="submit" disabled={loading}>{loading?"Membuka…":"Buka senarai"}</button>{error&&<p className="error">{error}</p>}</form>:<><div className="stats"><article><b>{totals.hadir}</b><span>Tetamu hadir</span></article><article><b>{totals.tidak}</b><span>Tidak hadir</span></article><article><b>{totals.pasti}</b><span>Belum pasti</span></article></div><div className="table-wrap"><table><thead><tr><th>Nama</th><th>Jawapan</th><th>Pax</th><th>Catatan</th><th>Tindakan</th></tr></thead><tbody>{entries.length?entries.map(e=><tr key={e.id}><td>{e.name}</td><td><span className={`badge ${e.status.replace(" ","-").toLowerCase()}`}>{e.status}</span></td><td>{e.pax||"–"}</td><td>{e.note||"–"}</td><td><button className="delete-entry" type="button" onClick={()=>remove(e)}>Padam</button></td></tr>):<tr><td colSpan={5} className="empty">Belum ada jawapan.</td></tr>}</tbody></table></div></>}</section></main>;
}
