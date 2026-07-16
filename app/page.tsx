"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type Status = "Hadir" | "Tidak hadir" | "Belum pasti";
type GuestNote = { id: number; name: string; note: string; createdAt: string };

const options: { label: Status; icon: string; detail: string }[] = [
  { label: "Hadir", icon: "✓", detail: "Insya-Allah saya datang" },
  { label: "Tidak hadir", icon: "×", detail: "Maaf, saya tidak dapat hadir" },
  { label: "Belum pasti", icon: "?", detail: "Saya akan sahkan kemudian" },
];

export default function Home() {
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
  const [shareMessage, setShareMessage] = useState("");
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

  function saveDate() {
    const calendar = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Ejal & Hanah//Jemputan Perkahwinan//MS",
      "BEGIN:VEVENT",
      "UID:ejal-hanah-20270110@jemputan",
      "DTSTART;VALUE=DATE:20270110",
      "DTEND;VALUE=DATE:20270111",
      "SUMMARY:Majlis Perkahwinan Ejal & Hanah",
      "LOCATION:Lot 574, Lorong Hj Manap, Jalan Selamat, Sungai Udang, Klang",
      "DESCRIPTION:Jemputan Majlis Perkahwinan Ejal & Hanah",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([calendar], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Ejal-Hanah-10-Januari-2027.ics";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function shareInvitation() {
    const data = {
      title: "Jemputan Perkahwinan Ejal & Hanah",
      text: "Dengan penuh kesyukuran, kami menjemput anda ke Majlis Perkahwinan Ejal & Hanah pada 10 Januari 2027.",
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(data);
        setShareMessage("Jemputan sedia dikongsi.");
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShareMessage("Pautan telah disalin.");
      }
    } catch {
      // Pengguna mungkin menutup menu kongsi.
    }
  }

  const loadGuestNotes = useCallback(async () => {
    try {
      const response = await fetch("/api/rsvp?public=1", { cache: "no-store" });
      if (response.ok) setGuestNotes((await response.json()).entries ?? []);
    } catch {
      // Ucapan tidak menghalang borang RSVP.
    }
  }, []);

  useEffect(() => {
    void loadGuestNotes();
  }, [loadGuestNotes]);

  useEffect(() => {
    const target = new Date("2027-01-10T00:00:00+08:00").getTime();

    function updateCountdown() {
      const remaining = Math.max(0, target - Date.now());
      setCountdown({
        days: Math.floor(remaining / 86400000),
        hours: Math.floor((remaining / 3600000) % 24),
        minutes: Math.floor((remaining / 60000) % 60),
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
        body: JSON.stringify({ name, status, pax: Number(pax), note }),
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
          <button
            className={opening ? "open-invitation opening" : "open-invitation"}
            type="button"
            onClick={openInvitation}
            disabled={opening}
          >
            <span className="envelope-icon" aria-hidden="true" />
            <strong>Buka Jemputan</strong>
            <small>Video dan lagu akan bermula</small>
          </button>
        )}

        {inviteOpened && (
          <button className="invitation-control" type="button" onClick={toggleInvitation}>
            {musicPlaying ? "Ⅱ" : "▶"} <span>{musicPlaying ? "Jeda" : "Sambung"}</span>
          </button>
        )}
        <a className="scroll-cue" href="#jemputan" aria-label="Lihat maklumat jemputan">↓</a>
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

        <nav className="quick-actions" aria-label="Tindakan pantas">
          <a href="https://goo.gl/maps/AsY9q2J9WLzWbX9n8" target="_blank" rel="noreferrer">
            <span aria-hidden="true">⌖</span><small>Maps</small>
          </a>
          <a href="#rsvp">
            <span aria-hidden="true">✓</span><small>RSVP</small>
          </a>
          <button type="button" onClick={saveDate}>
            <span aria-hidden="true">□</span><small>Simpan Tarikh</small>
          </button>
          <button type="button" onClick={() => void shareInvitation()}>
            <span aria-hidden="true">↗</span><small>Kongsi</small>
          </button>
        </nav>
        {shareMessage && <p className="share-message" role="status">{shareMessage}</p>}

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
              <p className="privacy">Jawapan disimpan secara terus. WhatsApp tidak akan dibuka.</p>
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
