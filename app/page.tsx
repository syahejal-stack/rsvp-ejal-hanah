"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type Status = "Hadir" | "Tidak hadir" | "Belum pasti";
type GuestNote = { id: number; name: string; note: string; createdAt: string };
type AdminEntry = {
  id: number;
  name: string;
  status?: Status;
  pax?: number;
  note?: string;
  createdAt?: string;
  created_at?: string;
};

const TEMERLOH_TAG = "[TEMERLOH]";
const TEMERLOH_PIN = "12486";
const KLANG_API_PIN = "10127";

const options: { label: Status; icon: string; detail: string }[] = [
  { label: "Hadir", icon: "✓", detail: "Insya-Allah saya datang" },
  { label: "Tidak hadir", icon: "×", detail: "Maaf, saya tidak dapat hadir" },
  { label: "Belum pasti", icon: "?", detail: "Saya akan sahkan kemudian" },
];

export default function Home() {
  const [mode, setMode] = useState<"loading" | "klang" | "temerloh" | "semakan">("loading");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isTemerloh = params.get("majlis") === "temerloh";
    setMode(isTemerloh ? (params.get("semakan") === "1" ? "semakan" : "temerloh") : "klang");
  }, []);

  if (mode === "loading") return <main style={{ minHeight: "100svh", background: "#031c2d" }} />;
  if (mode === "temerloh") return <TemerlohPage />;
  if (mode === "semakan") return <TemerlohSemakan />;
  return <KlangPage />;
}

function cleanTemerlohName(value: string) {
  return value.replace(`${TEMERLOH_TAG} `, "").replace(TEMERLOH_TAG, "").trim();
}

function cleanTemerlohNote(value = "") {
  return value.replace(`${TEMERLOH_TAG} `, "").replace(TEMERLOH_TAG, "").trim();
}

function TemerlohPage() {
  const [opened, setOpened] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [pax, setPax] = useState("1");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [guestNotes, setGuestNotes] = useState<GuestNote[]>([]);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const audioRef = useRef<HTMLAudioElement>(null);

  const loadGuestNotes = useCallback(async () => {
    try {
      const response = await fetch("/api/rsvp?public=1", { cache: "no-store" });
      if (!response.ok) return;
      const entries: GuestNote[] = (await response.json()).entries ?? [];
      setGuestNotes(entries.filter((entry) => entry.name.startsWith(TEMERLOH_TAG) && cleanTemerlohNote(entry.note)));
    } catch {
      // Kad masih boleh digunakan walaupun ucapan belum dapat dimuatkan.
    }
  }, []);

  useEffect(() => {
    void loadGuestNotes();
    const targetTime = Date.UTC(2026, 11, 12, 3, 0, 0); // 12 Dis 2026, 11 pagi Malaysia.
    const update = () => {
      const remaining = Math.max(0, targetTime - Date.now());
      setCountdown({
        days: Math.floor(remaining / 86400000),
        hours: Math.floor((remaining / 3600000) % 24),
        minutes: Math.floor((remaining / 60000) % 60),
        seconds: Math.floor((remaining / 1000) % 60),
      });
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [loadGuestNotes]);

  async function openCard() {
    setOpened(true);
    try {
      await audioRef.current?.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
    window.setTimeout(() => document.getElementById("temerloh-info")?.scrollIntoView({ behavior: "smooth" }), 250);
  }

  async function toggleMusic() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      try {
        await audio.play();
        setPlaying(true);
      } catch {
        setError("Tekan sekali lagi untuk memainkan lagu.");
      }
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError("Sila masukkan nama anda.");
    if (!status) return setError("Sila pilih jawapan kehadiran.");
    setSending(true);
    setError("");

    try {
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: `${TEMERLOH_TAG} ${name.trim()}`,
          status,
          pax: status === "Hadir" ? Number(pax) : 0,
          note: note.trim() ? `${TEMERLOH_TAG} ${note.trim()}` : "",
        }),
      });
      if (!response.ok) throw new Error();
      setDone(true);
      await loadGuestNotes();
    } catch {
      setError("Jawapan belum dapat disimpan. Sila cuba sekali lagi.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="tm-page">
      <style>{`
        :root{--tm-deep:#03283d;--tm-sea:#075c78;--tm-blue:#0e85a7;--tm-foam:#eaf9fa;--tm-pearl:#fffdf8;--tm-silver:#b9d2d9;--tm-ink:#123743}
        *{box-sizing:border-box}.tm-page{min-height:100svh;color:var(--tm-ink);font-family:Arial,Helvetica,sans-serif;background:#021c2d;overflow:hidden}.tm-page button,.tm-page input,.tm-page textarea,.tm-page select{font:inherit}
        .tm-cover{position:relative;min-height:100svh;display:grid;place-items:center;padding:28px 18px;text-align:center;color:white;overflow:hidden;background:radial-gradient(circle at 20% 18%,rgba(91,217,234,.3),transparent 28%),radial-gradient(circle at 78% 75%,rgba(20,135,170,.42),transparent 31%),linear-gradient(155deg,#021927,#04344b 45%,#08708c)}
        .tm-cover:before,.tm-cover:after{content:"";position:absolute;left:-15%;width:130%;height:34%;border-radius:50%;background:rgba(210,249,250,.13);filter:blur(2px);animation:tm-wave 8s ease-in-out infinite alternate}.tm-cover:before{bottom:-18%;transform:rotate(-4deg)}.tm-cover:after{bottom:-24%;opacity:.65;animation-delay:-4s;transform:rotate(4deg)}
        .tm-stars{position:absolute;inset:0;opacity:.48;background-image:radial-gradient(circle,rgba(255,255,255,.8) 0 1px,transparent 1.5px);background-size:38px 38px;mask-image:linear-gradient(to bottom,#000,transparent 72%)}
        .tm-flower{position:absolute;width:220px;height:220px;opacity:.56;filter:drop-shadow(0 12px 28px rgba(0,0,0,.18))}.tm-flower.left{left:-70px;top:-55px;transform:rotate(-24deg)}.tm-flower.right{right:-78px;bottom:-60px;transform:rotate(155deg)}.tm-flower i,.tm-flower b,.tm-flower span,.tm-flower:before,.tm-flower:after{content:"";position:absolute}.tm-flower:before{width:58px;height:120px;left:88px;top:20px;border-radius:80% 20%;background:linear-gradient(#76b8bd,#0f6376);transform:rotate(-38deg)}.tm-flower:after{width:52px;height:102px;left:126px;top:70px;border-radius:80% 20%;background:linear-gradient(#a9d5d5,#237b8a);transform:rotate(35deg)}.tm-flower i{width:98px;height:98px;left:18px;top:92px;border-radius:50%;background:radial-gradient(circle,#d9c39d 0 9%,#fff 10% 31%,#cfeff1 32% 54%,#fff 55% 72%,transparent 73%)}.tm-flower b{width:72px;height:72px;left:132px;top:18px;border-radius:50%;background:radial-gradient(circle,#d3b87f 0 8%,#fff 9% 30%,#b9e2e5 31% 66%,transparent 67%)}.tm-flower span{width:46px;height:88px;left:25px;top:25px;border-radius:80% 20%;background:#297b85;transform:rotate(-58deg)}
        .tm-cover-content{position:relative;z-index:2;width:min(100%,560px)}.tm-kicker{margin:0 0 16px;font-size:11px;font-weight:800;letter-spacing:.22em}.tm-arabic{font-family:Georgia,serif;font-size:25px;margin:0 0 26px}.tm-cover h1{margin:0;font-family:Georgia,"Times New Roman",serif;font-size:clamp(52px,14vw,86px);font-weight:400;line-height:.94;text-shadow:0 8px 30px rgba(0,0,0,.22)}.tm-cover h1 em{display:block;margin:14px 0;font-size:.42em;font-weight:400}.tm-cover-date{margin:28px 0 8px;font-family:Georgia,serif;font-size:20px;letter-spacing:.08em}.tm-cover-place{margin:0 0 34px;color:rgba(255,255,255,.78);font-size:13px;letter-spacing:.08em}.tm-open,.tm-music{border:1px solid rgba(255,255,255,.62);color:#fff;background:rgba(2,32,47,.48);backdrop-filter:blur(10px);box-shadow:0 14px 35px rgba(0,0,0,.2);cursor:pointer}.tm-open{min-width:220px;padding:15px 24px;border-radius:999px;font-weight:800}.tm-open small{display:block;margin-top:5px;font-size:10px;font-weight:500;color:rgba(255,255,255,.75)}.tm-music{position:fixed;right:14px;bottom:16px;z-index:20;width:48px;height:48px;border-radius:50%;font-size:18px}
        .tm-info{position:relative;padding:44px 14px 70px;background:radial-gradient(circle at 8% 8%,rgba(28,146,174,.13),transparent 24%),linear-gradient(160deg,#edfafa,#fffdf8 55%,#e7f5f6)}.tm-card{width:min(100%,600px);margin:0 auto;padding:34px clamp(17px,5vw,45px);border:1px solid rgba(14,133,167,.24);border-radius:32px;background:rgba(255,255,255,.9);box-shadow:0 25px 70px rgba(2,48,65,.13);text-align:center}.tm-line{display:flex;align-items:center;justify-content:center;gap:12px;color:#13819d;font-size:9px}.tm-line span{width:70px;height:1px;background:linear-gradient(90deg,transparent,#55a9b8,transparent)}.tm-eyebrow{margin:22px 0 8px;color:#08718e;font-size:10px;font-weight:900;letter-spacing:.2em}.tm-card h2{margin:0;font-family:Georgia,serif;font-size:42px;font-weight:400;color:#064d65}.tm-copy{max-width:470px;margin:15px auto 28px;line-height:1.75;font-size:14px;color:#49656d}.tm-host{margin:26px 0;padding:22px 15px;border-radius:22px;background:linear-gradient(145deg,#effbfb,#e4f3f5)}.tm-host span,.tm-host small{display:block}.tm-host span{font-size:10px;letter-spacing:.16em;color:#44808d}.tm-host strong{display:block;margin:9px 0 5px;font-family:Georgia,serif;font-size:21px;color:#073f55}.tm-host small{color:#5f7a81}.tm-datebox{padding:24px 15px;border-top:1px solid #dcebed;border-bottom:1px solid #dcebed}.tm-datebox strong{display:block;font-family:Georgia,serif;font-size:26px;color:#075d76}.tm-datebox span{display:block;margin-top:7px;font-size:13px;color:#58757c}.tm-count{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:22px 0}.tm-count div{padding:15px 5px;border-radius:16px;background:#073f55;color:white}.tm-count strong{display:block;font-family:Georgia,serif;font-size:24px}.tm-count span{font-size:9px;letter-spacing:.08em;color:#bce6e8}.tm-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:20px 0}.tm-action{display:flex;align-items:center;justify-content:center;min-height:54px;padding:12px;border-radius:16px;text-decoration:none;font-size:12px;font-weight:800}.tm-action.primary{background:#087795;color:white}.tm-action.secondary{border:1px solid #9fcbd1;color:#075c78;background:white}.tm-location{margin:28px 0;padding:23px 16px;border-radius:22px;background:#f4fbfb}.tm-location h3{margin:6px 0 10px;font-family:Georgia,serif;font-size:25px;color:#064d65}.tm-location p{margin:0 0 16px;line-height:1.6;font-size:13px;color:#567178}.tm-map{display:inline-flex;padding:12px 17px;border-radius:999px;background:#086f8a;color:white;text-decoration:none;font-size:12px;font-weight:800}
        .tm-rsvp{margin-top:30px;padding-top:29px;border-top:1px solid #dcebed;text-align:left}.tm-rsvp h3,.tm-guestbook h3{margin:4px 0 8px;text-align:center;font-family:Georgia,serif;font-size:32px;color:#064d65}.tm-intro{text-align:center;margin:0 auto 24px;font-size:13px;line-height:1.6;color:#647c82}.tm-label{display:block;margin:14px 0 7px;font-size:11px;font-weight:800;color:#315b65}.tm-label span{font-weight:400}.tm-rsvp input,.tm-rsvp textarea,.tm-rsvp select{width:100%;border:1px solid #bcd9de;border-radius:13px;padding:13px;background:white;color:#183f49;outline:none}.tm-rsvp input:focus,.tm-rsvp textarea:focus,.tm-rsvp select:focus{border-color:#0785a3;box-shadow:0 0 0 3px rgba(7,133,163,.11)}.tm-options{display:grid;gap:9px}.tm-choice{display:flex;align-items:center;gap:12px;width:100%;padding:12px;border:1px solid #c6dde1;border-radius:15px;background:white;text-align:left;color:#244d57;cursor:pointer}.tm-choice.active{border-color:#0785a3;background:#e9f8f9;box-shadow:0 0 0 2px rgba(7,133,163,.08)}.tm-choice>b{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:#e6f4f5;color:#087795}.tm-choice span{display:flex;flex-direction:column}.tm-choice small{margin-top:2px;color:#71878c}.tm-submit{display:flex;justify-content:space-between;width:100%;margin-top:18px;padding:15px 18px;border:0;border-radius:14px;background:linear-gradient(135deg,#075c78,#0797ae);color:white;font-weight:900;cursor:pointer}.tm-submit:disabled{opacity:.55}.tm-error{margin:12px 0 0;color:#a44545;font-size:12px}.tm-success{padding:28px 18px;border-radius:20px;background:#eaf8f3;text-align:center}.tm-success b{display:grid;place-items:center;width:46px;height:46px;margin:0 auto 12px;border-radius:50%;background:#2b9272;color:white;font-size:23px}.tm-success button{border:0;background:transparent;color:#087795;font-weight:900;text-decoration:underline}.tm-guestbook{margin-top:32px;padding-top:28px;border-top:1px solid #dcebed}.tm-notes{display:grid;gap:10px}.tm-notes blockquote{margin:0;padding:16px;border-radius:16px;background:#f0f9f9;text-align:left}.tm-notes p{margin:0 0 7px;line-height:1.5;color:#345a63}.tm-notes footer{font-size:11px;font-weight:800;color:#07809b}.tm-empty{text-align:center;color:#7a8f94;font-size:12px}.tm-close{margin:30px auto 0;max-width:470px;line-height:1.7;font-family:Georgia,serif;color:#41626b}.tm-admin-link{display:inline-block;margin-top:22px;color:#50828d;font-size:10px;text-decoration:none}
        @keyframes tm-wave{to{transform:translateY(-18px) rotate(2deg)}}@media(max-width:430px){.tm-card{padding:28px 14px;border-radius:24px}.tm-actions{grid-template-columns:1fr}.tm-count strong{font-size:21px}.tm-cover h1{font-size:58px}}
      `}</style>

      <section className="tm-cover">
        <div className="tm-stars" aria-hidden="true" />
        <div className="tm-flower left" aria-hidden="true"><i /><b /><span /></div>
        <div className="tm-flower right" aria-hidden="true"><i /><b /><span /></div>
        <div className="tm-cover-content">
          <p className="tm-arabic" lang="ar" dir="rtl">بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ</p>
          <p className="tm-kicker">JEMPUTAN MAJLIS PERKAHWINAN</p>
          <h1>Hanah <em>&amp;</em> Ejal</h1>
          <p className="tm-cover-date">Sabtu · 12 Disember 2026</p>
          <p className="tm-cover-place">Taman Perindu · Temerloh</p>
          {!opened && <button className="tm-open" type="button" onClick={openCard}>Buka Jemputan<small>Lihat maklumat majlis dan RSVP</small></button>}
        </div>
      </section>

      <section className="tm-info" id="temerloh-info">
        <section className="tm-card">
          <div className="tm-line"><span />◆<span /></div>
          <p className="tm-eyebrow">DENGAN PENUH KESYUKURAN</p>
          <h2>Hanah &amp; Ejal</h2>
          <p className="tm-copy">Kami menjemput Dato’ / Datin / Tuan / Puan / Encik / Cik hadir ke kenduri perkahwinan anakanda kami serta mendoakan kebahagiaan pasangan pengantin.</p>

          <div className="tm-host">
            <span>TUAN RUMAH</span>
            <strong>Karudin bin Kamarulzaman</strong>
            <small>&amp; Ruzawati binti Ramly</small>
          </div>

          <div className="tm-datebox"><strong>Sabtu, 12 Disember 2026</strong><span>11.00 pagi – 3.00 petang</span></div>

          <div className="tm-count" aria-label="Kiraan detik majlis">
            <div><strong>{countdown.days}</strong><span>HARI</span></div>
            <div><strong>{String(countdown.hours).padStart(2, "0")}</strong><span>JAM</span></div>
            <div><strong>{String(countdown.minutes).padStart(2, "0")}</strong><span>MINIT</span></div>
            <div><strong>{String(countdown.seconds).padStart(2, "0")}</strong><span>SAAT</span></div>
          </div>

          <div className="tm-actions">
            <a className="tm-action primary" href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=Kenduri%20Perkahwinan%20Hanah%20%26%20Ejal&dates=20261212T030000Z%2F20261212T070000Z&details=Jemputan%20kenduri%20perkahwinan%20Hanah%20dan%20Ejal.&location=No.%2029%2C%20Jalan%20Perindu%202%2C%20Taman%20Perindu%2C%2028000%20Temerloh%2C%20Pahang" target="_blank" rel="noreferrer">Tambah ke Kalendar</a>
            <a className="tm-action secondary" href="tel:0192550432">Hubungi RSVP</a>
          </div>

          <section className="tm-location">
            <p className="tm-eyebrow">LOKASI MAJLIS</p>
            <h3>Taman Perindu, Temerloh</h3>
            <p>No. 29, Jalan Perindu 2, Taman Perindu<br />28000 Temerloh, Pahang</p>
            <a className="tm-map" href="https://maps.app.goo.gl/zFWaXgV6EjfgeVB86?g_st=awb" target="_blank" rel="noreferrer">Buka Google Maps ↗</a>
          </section>

          <audio ref={audioRef} src="/audio/lagu-ejal-hanah.mp3?v=3" loop preload="auto" onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />

          <section className="tm-rsvp">
            <p className="tm-eyebrow">PENGESAHAN KEHADIRAN</p>
            <h3>RSVP</h3>
            <p className="tm-intro">Mohon sahkan kehadiran untuk membantu persiapan pihak keluarga.</p>
            {done ? (
              <div className="tm-success"><b>✓</b><h3>Jawapan diterima</h3><p>Terima kasih, {name}. Maklum balas anda telah disimpan.</p><button type="button" onClick={() => { setDone(false); setName(""); setStatus(null); setPax("1"); setNote(""); }}>Isi untuk tetamu lain</button></div>
            ) : (
              <form onSubmit={submit} noValidate>
                <label className="tm-label" htmlFor="tm-name">Nama tetamu</label>
                <input id="tm-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Contoh: Ahmad bin Ali" autoComplete="name" />
                <label className="tm-label">Kehadiran</label>
                <div className="tm-options">
                  {options.map((option) => <button className={status === option.label ? "tm-choice active" : "tm-choice"} type="button" key={option.label} onClick={() => { setStatus(option.label); setError(""); }}><b>{option.icon}</b><span><strong>{option.label}</strong><small>{option.detail}</small></span></button>)}
                </div>
                {status === "Hadir" && <><label className="tm-label" htmlFor="tm-pax">Jumlah tetamu termasuk anda</label><select id="tm-pax" value={pax} onChange={(event) => setPax(event.target.value)}>{[1,2,3,4,5,6].map((number) => <option value={number} key={number}>{number} orang</option>)}</select></>}
                <label className="tm-label" htmlFor="tm-note">Ucapan <span>(pilihan dan akan dipaparkan)</span></label>
                <textarea id="tm-note" rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Titipkan doa atau ucapan ringkas" />
                {error && <p className="tm-error">{error}</p>}
                <button className="tm-submit" type="submit" disabled={sending}><span>{sending ? "Sedang menyimpan…" : "Hantar jawapan"}</span><span>→</span></button>
              </form>
            )}
          </section>

          <section className="tm-guestbook">
            <p className="tm-eyebrow">UCAPAN TETAMU</p><h3>Doa &amp; Catatan</h3>
            {guestNotes.length ? <div className="tm-notes">{guestNotes.map((entry) => <blockquote key={entry.id}><p>“{cleanTemerlohNote(entry.note)}”</p><footer>— {cleanTemerlohName(entry.name)}</footer></blockquote>)}</div> : <p className="tm-empty">Belum ada ucapan. Jadilah tetamu pertama menitipkan doa.</p>}
          </section>

          <p className="tm-close">Terima kasih atas doa dan kesudian hadir meraikan hari bahagia kami.</p>
          <a className="tm-admin-link" href="/?majlis=temerloh&semakan=1">Semakan RSVP</a>
          <div className="tm-line"><span />◆<span /></div>
        </section>
      </section>
      {opened && <button className="tm-music" type="button" onClick={toggleMusic} aria-label={playing ? "Jeda lagu" : "Mainkan lagu"}>{playing ? "Ⅱ" : "▶"}</button>}
    </main>
  );
}

function TemerlohSemakan() {
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [entries, setEntries] = useState<AdminEntry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [limited, setLimited] = useState(false);

  async function loadEntries() {
    setLoading(true);
    setError("");
    try {
      let response = await fetch(`/api/rsvp?pin=${encodeURIComponent(KLANG_API_PIN)}`, { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        const all: AdminEntry[] = data.entries ?? [];
        setEntries(all.filter((entry) => entry.name.startsWith(TEMERLOH_TAG)));
        setLimited(false);
        return;
      }

      response = await fetch("/api/rsvp?public=1", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json();
      const all: AdminEntry[] = data.entries ?? [];
      setEntries(all.filter((entry) => entry.name.startsWith(TEMERLOH_TAG)));
      setLimited(true);
    } catch {
      setError("Senarai belum dapat dimuatkan. Cuba semula sebentar lagi.");
    } finally {
      setLoading(false);
    }
  }

  function unlock(event: FormEvent) {
    event.preventDefault();
    if (pin !== TEMERLOH_PIN) return setError("PIN tidak betul.");
    setUnlocked(true);
    setError("");
    void loadEntries();
  }

  const hadir = entries.filter((entry) => entry.status === "Hadir");
  const tidak = entries.filter((entry) => entry.status === "Tidak hadir");
  const belum = entries.filter((entry) => entry.status === "Belum pasti");
  const totalPax = hadir.reduce((sum, entry) => sum + Number(entry.pax ?? 0), 0);

  return (
    <main className="tsa-page">
      <style>{`
        *{box-sizing:border-box}.tsa-page{min-height:100svh;padding:24px 12px;background:linear-gradient(155deg,#031d2d,#075a73);color:#173d47;font-family:Arial,Helvetica,sans-serif}.tsa-card{width:min(100%,950px);margin:0 auto;padding:26px;border-radius:25px;background:#f9ffff;box-shadow:0 24px 70px rgba(0,0,0,.22)}.tsa-card h1{margin:0;font-family:Georgia,serif;font-size:36px;color:#075b74}.tsa-sub{margin:8px 0 24px;color:#638088}.tsa-login{max-width:380px;margin:14vh auto 0;text-align:center}.tsa-login input{width:100%;padding:14px;border:1px solid #b5d3d8;border-radius:13px;text-align:center;font-size:20px;letter-spacing:.18em}.tsa-button{width:100%;margin-top:10px;padding:14px;border:0;border-radius:13px;background:#087895;color:white;font-weight:900}.tsa-error{color:#a13e3e;font-size:12px}.tsa-top{display:flex;align-items:center;justify-content:space-between;gap:12px}.tsa-top button{border:0;border-radius:12px;padding:10px 13px;background:#087895;color:white;font-weight:800}.tsa-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:22px 0}.tsa-stat{padding:17px 12px;border-radius:16px;background:#e9f7f8;text-align:center}.tsa-stat strong{display:block;font-family:Georgia,serif;font-size:28px;color:#075b74}.tsa-stat span{font-size:10px;color:#54737b}.tsa-warning{padding:11px;border-radius:12px;background:#fff4d8;color:#80601a;font-size:12px}.tsa-table{overflow:auto;border:1px solid #dbeaec;border-radius:16px}.tsa-table table{width:100%;border-collapse:collapse;min-width:720px}.tsa-table th,.tsa-table td{padding:13px;border-bottom:1px solid #e5eff0;text-align:left;font-size:12px}.tsa-table th{background:#eaf6f7;color:#48717b;font-size:10px;letter-spacing:.08em}.tsa-badge{display:inline-block;padding:5px 8px;border-radius:999px;background:#e8eef0;font-size:10px;font-weight:800}.tsa-badge.hadir{background:#dff3e7;color:#27714a}.tsa-badge.tidak-hadir{background:#f6e2df;color:#8d4c45}.tsa-badge.belum-pasti{background:#f6eed8;color:#81691f}.tsa-empty{padding:35px;text-align:center;color:#72898e}.tsa-back{display:inline-block;margin-top:20px;color:#087895;text-decoration:none;font-weight:800}@media(max-width:650px){.tsa-card{padding:18px 12px}.tsa-stats{grid-template-columns:1fr 1fr}.tsa-top{align-items:flex-start;flex-direction:column}.tsa-top button{width:100%}}
      `}</style>
      {!unlocked ? (
        <section className="tsa-card tsa-login"><h1>Semakan RSVP</h1><p className="tsa-sub">Majlis Hanah &amp; Ejal · Temerloh</p><form onSubmit={unlock}><input type="password" inputMode="numeric" value={pin} onChange={(event) => setPin(event.target.value)} placeholder="Masukkan PIN" autoFocus /><button className="tsa-button" type="submit">Buka semakan</button></form>{error && <p className="tsa-error">{error}</p>}<a className="tsa-back" href="/?majlis=temerloh">← Kembali ke kad</a></section>
      ) : (
        <section className="tsa-card"><div className="tsa-top"><div><h1>RSVP Temerloh</h1><p className="tsa-sub">Sabtu, 12 Disember 2026</p></div><button type="button" onClick={() => void loadEntries()}>{loading ? "Memuatkan…" : "Muat semula"}</button></div>
          <div className="tsa-stats"><div className="tsa-stat"><strong>{entries.length}</strong><span>JUMLAH JAWAPAN</span></div><div className="tsa-stat"><strong>{hadir.length}</strong><span>HADIR</span></div><div className="tsa-stat"><strong>{totalPax}</strong><span>JUMLAH TETAMU</span></div><div className="tsa-stat"><strong>{tidak.length + belum.length}</strong><span>TIDAK / BELUM PASTI</span></div></div>
          {limited && <p className="tsa-warning">Paparan terhad kepada ucapan awam kerana akses penuh API belum tersedia.</p>}{error && <p className="tsa-error">{error}</p>}
          <div className="tsa-table"><table><thead><tr><th>Nama</th><th>Status</th><th>Pax</th><th>Ucapan</th><th>Masa</th></tr></thead><tbody>{entries.length ? entries.map((entry) => <tr key={entry.id}><td><strong>{cleanTemerlohName(entry.name)}</strong></td><td><span className={`tsa-badge ${(entry.status ?? "").toLowerCase().replaceAll(" ", "-")}`}>{entry.status ?? "—"}</span></td><td>{entry.pax ?? "—"}</td><td>{cleanTemerlohNote(entry.note)}</td><td>{entry.createdAt || entry.created_at ? new Date(entry.createdAt ?? entry.created_at).toLocaleString("ms-MY") : "—"}</td></tr>) : <tr><td className="tsa-empty" colSpan={5}>{loading ? "Sedang memuatkan…" : "Belum ada jawapan RSVP Temerloh."}</td></tr>}</tbody></table></div>
          <a className="tsa-back" href="/?majlis=temerloh">← Kembali ke kad</a>
        </section>
      )}
    </main>
  );
}

function KlangPage() {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [pax, setPax] = useState("1");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [guestNotes, setGuestNotes] = useState<GuestNote[]>([]);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [inviteOpened, setInviteOpened] = useState(false);
  const [opening, setOpening] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const backdropRef = useRef<HTMLVideoElement>(null);

  async function openInvitation() {
    const audio = audioRef.current;
    const video = videoRef.current;
    const backdrop = backdropRef.current;
    if (!audio || !video) return;

    const hero = video.closest(".video-hero") as
      | (HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void })
      | null;

    setOpening(true);
    video.muted = true;
    video.currentTime = 0;
    audio.currentTime = 0;
    if (backdrop) {
      backdrop.muted = true;
      backdrop.currentTime = 0;
    }

    try {
      const fullscreenPromise =
        hero && !document.fullscreenElement
          ? hero.requestFullscreen
            ? hero.requestFullscreen({ navigationUI: "hide" }).catch(() => undefined)
            : Promise.resolve(hero.webkitRequestFullscreen?.())
          : Promise.resolve();

      const tasks: Promise<unknown>[] = [fullscreenPromise, video.play(), audio.play()];
      if (backdrop) tasks.push(backdrop.play());

      await Promise.all(tasks);
      window.setTimeout(() => {
        setInviteOpened(true);
        setOpening(false);
      }, 420);
      setMusicPlaying(true);
    } catch {
      setOpening(false);
      setError("Tekan sekali lagi untuk memulakan video dan lagu.");
    }
  }

  async function skipVideo() {
    audioRef.current?.pause();
    videoRef.current?.pause();
    backdropRef.current?.pause();

    setInviteOpened(true);
    setMusicPlaying(false);

    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      // Sesetengah browser dalam aplikasi tidak membenarkan kawalan skrin penuh.
    }

    window.setTimeout(() => {
      document.getElementById("jemputan")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  async function toggleInvitation() {
    const audio = audioRef.current;
    const video = videoRef.current;
    const backdrop = backdropRef.current;
    if (!audio || !video) return;

    if (musicPlaying) {
      audio.pause();
      video.pause();
      backdrop?.pause();
      setMusicPlaying(false);
    } else {
      video.muted = true;
      if (video.ended) {
        video.currentTime = 0;
        if (backdrop) backdrop.currentTime = 0;
      }
      try {
        const tasks: Promise<unknown>[] = [video.play(), audio.play()];
        if (backdrop) tasks.push(backdrop.play());
        await Promise.all(tasks);
        setMusicPlaying(true);
      } catch {
        setError("Tekan sekali lagi untuk menyambung.");
      }
    }
  }

  async function finishVideo() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      // Sesetengah pelayar dalam aplikasi tidak membenarkan keluar skrin penuh melalui kod.
    }
    window.setTimeout(() => {
      document.getElementById("jemputan")?.scrollIntoView({ behavior: "smooth" });
    }, 180);
  }

  const loadGuestNotes = useCallback(async () => {
    try {
      const response = await fetch("/api/rsvp?public=1", { cache: "no-store" });
      if (response.ok) {
        setGuestNotes(((await response.json()).entries ?? []).filter((entry: GuestNote) => !entry.name.startsWith(TEMERLOH_TAG)));
      }
    } catch {
      // Ucapan tetamu tidak menghalang bahagian lain daripada dipaparkan.
    }
  }, []);

  useEffect(() => {
    void loadGuestNotes();
  }, [loadGuestNotes]);

  useEffect(() => {
    // 10 Januari 2027, 12:00 tengah malam waktu Malaysia (UTC+8).
    const targetTime = Date.UTC(2027, 0, 9, 16, 0, 0);

    function updateCountdown() {
      const remaining = Math.max(0, targetTime - Date.now());

      setCountdown({
        days: Math.floor(remaining / (1000 * 60 * 60 * 24)),
        hours: Math.floor((remaining / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((remaining / (1000 * 60)) % 60),
        seconds: Math.floor((remaining / 1000) % 60),
      });
    }

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(timer);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError("Sila masukkan nama anda.");
    if (!status) return setError("Sila pilih jawapan kehadiran.");

    setSending(true);
    setError("");

    try {
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          status,
          pax: status === "Hadir" ? Number(pax) : 0,
          note: note.trim(),
        }),
      });

      if (!response.ok) throw new Error();
      setDone(true);
      await loadGuestNotes();
    } catch {
      setError("Jawapan belum dapat disimpan. Sila cuba sekali lagi.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="video-hero" aria-label="Video Ejal dan Hanah">
        <video
          ref={backdropRef}
          className="hero-backdrop"
          muted
          playsInline
          preload="auto"
          tabIndex={-1}
          aria-hidden="true"
          src="/video/video-ejal-hanah.mp4"
        />
        <video
          ref={videoRef}
          className="hero-video"
          muted
          playsInline
          preload="auto"
          src="/video/video-ejal-hanah.mp4"
          onEnded={() => void finishVideo()}
        >
          Pelayar anda tidak menyokong video.
        </video>

        <div className="hero-glow" aria-hidden="true" />
        <div className="petal-rain" aria-hidden="true">
          {Array.from({ length: 7 }).map((_, index) => <span key={index} />)}
        </div>
        <div className="flower-corner flower-corner-left" aria-hidden="true"><i /><b /><span /></div>
        <div className="flower-corner flower-corner-right" aria-hidden="true"><i /><b /><span /></div>

        {!inviteOpened && (
          <div className="opening-actions simple">
            <button
              className={opening ? "play-button opening" : "play-button"}
              type="button"
              onClick={openInvitation}
              disabled={opening}
              aria-label="Play"
            >
              <span aria-hidden="true">▶</span>
              Play
            </button>

            <button className="skip-video primary-skip" type="button" onClick={() => void skipVideo()}>
              Terus ke maklumat majlis
              <small>Alamat, Maps dan RSVP</small>
            </button>
          </div>
        )}

        {inviteOpened && (
          <button className="invitation-control" type="button" onClick={toggleInvitation}>
            {musicPlaying ? "Ⅱ" : "▶"} <span>{musicPlaying ? "Jeda" : "Sambung"}</span>
          </button>
        )}
        <span className="scroll-cue" aria-hidden="true">↓</span>
      </section>

      <section className="invite-zone" id="jemputan">
        <div className="floral floral-top" aria-hidden="true"><i /><b /><span /></div>
        <div className="floral floral-bottom" aria-hidden="true"><i /><b /><span /></div>

        <section className="invite-card" aria-labelledby="page-title">
        <div className="ornament"><span />◆<span /></div>
        <p className="bismillah" lang="ar" dir="rtl">بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ</p>
        <p className="eyebrow">JEMPUTAN MAJLIS PERKAHWINAN</p>
        <h1 id="page-title">Ejal <em>&amp;</em> Hanah</h1>
        <p className="date">Ahad · 10 Januari 2027</p>
        <p className="invitation-copy">
          Dengan penuh kesyukuran ke hadrat Allah SWT, kami menjemput
          Dato’ / Datin / Tuan / Puan / Encik / Cik hadir meraikan hari bahagia kami.
        </p>

        <section className="family-section" aria-label="Keluarga pengantin">
          <div>
            <span>Pihak lelaki</span>
            <strong>Darmiwati bt Malik</strong>
            <small>&amp; Allahyarham Syukir bin Mail</small>
          </div>
          <i aria-hidden="true">◆</i>
          <div>
            <span>Pihak perempuan</span>
            <strong>Karudin bin Kamarulzaman</strong>
            <small>&amp; Ruzawati binti Ramly</small>
          </div>
        </section>

        <section className="countdown-section" aria-label="Kiraan detik majlis">
          <p className="section-kicker">MENUJU HARI BAHAGIA</p>
          <div className="countdown-grid">
            <div><strong>{countdown.days}</strong><span>Hari</span></div>
            <div><strong>{String(countdown.hours).padStart(2, "0")}</strong><span>Jam</span></div>
            <div><strong>{String(countdown.minutes).padStart(2, "0")}</strong><span>Minit</span></div>
            <div><strong>{String(countdown.seconds).padStart(2, "0")}</strong><span>Saat</span></div>
          </div>
        </section>

        <a
          className="save-date-button"
          href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=Majlis%20Perkahwinan%20Ejal%20%26%20Hanah&dates=20270110%2F20270111&details=Dengan%20penuh%20kesyukuran%2C%20anda%20dijemput%20ke%20Majlis%20Perkahwinan%20Ejal%20%26%20Hanah.&location=Lot%20574%2C%20Lorong%20Hj%20Manap%2C%20Jalan%20Selamat%2C%20Sungai%20Udang%2C%20Klang"
          target="_blank"
          rel="noreferrer"
        >
          <span className="calendar-icon" aria-hidden="true" />
          Tambah ke Kalendar
        </a>


        <section className="location-section" aria-labelledby="location-title">
          <p className="section-kicker">LOKASI MAJLIS</p>
          <h2 id="location-title">Sungai Udang, Klang</h2>
          <p className="venue">Lot 574, Lorong Hj Manap, Jalan Selamat<br />Sungai Udang, Klang</p>
          <a className="maps-button" href="https://goo.gl/maps/AsY9q2J9WLzWbX9n8" target="_blank" rel="noreferrer">
            <span className="maps-icon" aria-hidden="true">⌖</span>
            <span><strong>Buka Google Maps</strong><small>Dapatkan arah ke lokasi majlis</small></span>
            <span aria-hidden="true">↗</span>
          </a>
        </section>

        <audio
          ref={audioRef}
          src="/audio/lagu-ejal-hanah.mp3?v=3"
          loop
          preload="auto"
          onPause={() => setMusicPlaying(false)}
          onPlay={() => setMusicPlaying(true)}
        />

        <section className="rsvp-section" id="rsvp" aria-labelledby="rsvp-title">
          <p className="section-kicker">PENGESAHAN KEHADIRAN</p>
          <h2 id="rsvp-title">RSVP</h2>
          <p className="section-intro">Mohon sahkan kehadiran supaya kami dapat membuat persiapan terbaik untuk anda.</p>

          {done ? (
            <div className="success" role="status">
              <div>✓</div>
              <h2>Jawapan diterima</h2>
              <p>Terima kasih, {name}. Maklum balas anda telah disimpan.</p>
              <button onClick={() => { setDone(false); setName(""); setStatus(null); setPax("1"); setNote(""); }}>Isi untuk tetamu lain</button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <label className="field-label" htmlFor="guest-name">Nama tetamu</label>
              <input id="guest-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Contoh: Ahmad bin Ali" autoComplete="name" />

              <fieldset>
                <legend>Kehadiran</legend>
                <div className="choices">
                  {options.map((option) => (
                    <button
                      className={status === option.label ? "choice active" : "choice"}
                      type="button"
                      key={option.label}
                      onClick={() => { setStatus(option.label); setError(""); }}
                      aria-pressed={status === option.label}
                    >
                      <span className="choice-icon">{option.icon}</span>
                      <span><strong>{option.label}</strong><small>{option.detail}</small></span>
                    </button>
                  ))}
                </div>
              </fieldset>

              {status === "Hadir" && (
                <div className="pax-row">
                  <label className="field-label" htmlFor="pax">Jumlah tetamu termasuk anda</label>
                  <select id="pax" value={pax} onChange={(event) => setPax(event.target.value)}>
                    {[1, 2, 3, 4, 5, 6].map((number) => <option key={number} value={number}>{number} orang</option>)}
                  </select>
                </div>
              )}

              <label className="field-label" htmlFor="note">Catatan <span>(pilihan)</span></label>
              <textarea id="note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Tulis pesanan ringkas jika ada" rows={2} />
              {error && <p className="error" role="alert">{error}</p>}
              <button className="submit" type="submit" disabled={sending}>{sending ? "Sedang menyimpan…" : "Hantar jawapan"} <span>→</span></button>
            </form>
          )}
        </section>

        <section className="guestbook" aria-labelledby="guestbook-title">
          <p className="eyebrow">UCAPAN TETAMU</p>
          <h2 id="guestbook-title">Doa &amp; Catatan</h2>
          {guestNotes.length > 0 ? (
            <div className="guest-notes">
              {guestNotes.map((entry) => (
                <blockquote key={entry.id}>
                  <p>“{entry.note}”</p>
                  <footer>— {entry.name}</footer>
                </blockquote>
              ))}
            </div>
          ) : <p className="empty-notes">Belum ada catatan. Jadilah tetamu pertama menitipkan ucapan.</p>}
        </section>

        <p className="closing">Terima kasih atas doa dan kesudian anda meraikan hari bahagia kami.</p>
        <div className="ornament bottom"><span />◆<span /></div>
        </section>
      </section>
    </main>
  );
}

