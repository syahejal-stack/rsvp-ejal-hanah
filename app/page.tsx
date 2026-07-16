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
  const [videoMuted, setVideoMuted] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  async function toggleMusic() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      videoRef.current?.pause();
      await audio.play();
    } else {
      audio.pause();
    }
  }

  function toggleVideoSound() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setVideoMuted(video.muted);
    void video.play();
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
          ref={videoRef}
          autoPlay
          muted={videoMuted}
          loop
          playsInline
          preload="auto"
          src="/video/video-ejal-hanah.mp4"
          onPlay={() => audioRef.current?.pause()}
        >
          Pelayar anda tidak menyokong video.
        </video>
        <div className="hero-glow" aria-hidden="true" />
        <div className="petal-rain" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, index) => (
            <span key={index} />
          ))}
        </div>
        <div className="flower-corner flower-corner-left" aria-hidden="true"><i /><b /><span /></div>
        <div className="flower-corner flower-corner-right" aria-hidden="true"><i /><b /><span /></div>

        <button className="video-sound" type="button" onClick={toggleVideoSound}>
          {videoMuted ? "Buka suara" : "Tutup suara"}
        </button>
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
          src="/audio/lagu-ejal-hanah.mp3?v=2"
          loop
          preload="metadata"
          onPause={() => setMusicPlaying(false)}
          onPlay={() => setMusicPlaying(true)}
        />
        <button className={musicPlaying ? "music playing" : "music"} type="button" onClick={toggleMusic} aria-label={musicPlaying ? "Hentikan lagu" : "Mainkan lagu"}>
          <span>{musicPlaying ? "Ⅱ" : "♪"}</span>{musicPlaying ? "Hentikan lagu" : "Mainkan lagu"}
        </button>

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
