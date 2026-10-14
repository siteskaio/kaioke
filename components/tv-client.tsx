"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import {
  ListMusic,
  LoaderCircle,
  Maximize,
  Mic2,
  Music2,
  Pause,
  Play,
  SkipForward,
  Sparkles,
  Trash2,
} from "lucide-react";

import { useRoom, postJson } from "./use-room";
import YoutubePlayer from "./youtube-player";

type Props = {
  code: string;
};

type Particle = {
  id: number;
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
  symbol: string;
};

export default function TvClient({ code }: Props) {
  const { room, songs, error, loading, refresh } = useRoom(code);

  const [adminKey, setAdminKey] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const advancingRef = useRef(false);
  const endedSongRef = useRef<string | null>(null);

  const current = songs.find(
    (song) => song.id === room?.current_song_id
  );

  const currentId = current?.id ?? null;
  const currentVideoId = current?.video_id ?? null;
  const playing = room?.playback_state === "playing";

  const queue = songs
    .filter((song) => song.status === "queued")
    .sort((a, b) => a.position - b.position);

  const finished = songs.filter(
    (song) => song.status === "done"
  ).length;

  const currentIdRef = useRef<string | null>(null);
  const playingRef = useRef(false);

  currentIdRef.current = currentId;
  playingRef.current = playing;

  useEffect(() => {
    const key =
      localStorage.getItem(`kaioke_admin_${code}`) || "";
    setAdminKey(key);
  }, [code]);

  useEffect(() => {
    endedSongRef.current = null;
    console.log("[KAIOKÊ] Música atual:", currentId, currentVideoId);
  }, [currentId, currentVideoId]);

  const particles = useMemo<Particle[]>(() => {
    const symbols = ["♪", "♫", "✦", "•", "🎵"];
    return Array.from({ length: 22 }).map((_, index) => ({
      id: index,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 16 + Math.random() * 24,
      delay: Math.random() * 6,
      duration: 8 + Math.random() * 8,
      opacity: 0.12 + Math.random() * 0.22,
      symbol: symbols[index % symbols.length],
    }));
  }, []);

  const action = useCallback(
    async (command: string, id?: string) => {
      const key =
        localStorage.getItem(`kaioke_admin_${code}`) || "";

      if (!key) {
        setNotice(
          "Você precisa abrir o telão no navegador do anfitrião."
        );
        return false;
      }

      setBusy(true);
      setNotice("");

      try {
        await postJson(
          `/api/rooms/${code}/actions`,
          {
            action: command,
            ...(id ? { id } : {}),
          },
          key
        );

        await refresh();
        return true;
      } catch (err) {
        console.error("[KAIOKÊ] Erro no comando:", command, err);

        setNotice(
          err instanceof Error
            ? err.message
            : "Não foi possível executar o comando."
        );

        return false;
      } finally {
        setBusy(false);
      }
    },
    [code, refresh]
  );

  const nextSong = useCallback(async () => {
    if (advancingRef.current) {
      return false;
    }

    advancingRef.current = true;

    try {
      console.log("[KAIOKÊ] Avançando para a próxima música");
      return await action("next");
    } finally {
      advancingRef.current = false;
    }
  }, [action]);

  const handleEnded = useCallback(async () => {
    const songId = currentIdRef.current;

    if (!songId) return;
    if (!playingRef.current) return;
    if (endedSongRef.current === songId) return;
    if (advancingRef.current) return;

    endedSongRef.current = songId;

    console.log("[KAIOKÊ] Vídeo terminou:", songId);

    const success = await nextSong();

    if (!success) {
      endedSongRef.current = null;
    }
  }, [nextSong]);

  const handleNext = useCallback(async () => {
    if (advancingRef.current) return;

    const success = await nextSong();

    if (success) {
      console.log("[KAIOKÊ] Próxima música solicitada");
    }
  }, [nextSong]);

  const togglePlayback = useCallback(async () => {
    if (!currentId) {
      if (queue.length > 0) {
        await handleNext();
      }
      return;
    }

    if (playing) {
      await action("pause");
    } else {
      await action("resume");
    }
  }, [action, currentId, playing, queue.length, handleNext]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  async function full() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      setNotice("Não foi possível ativar a tela cheia.");
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <LoaderCircle className="spin" />
        Acendendo as luzes...
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="page-loading">
        <p>{error}</p>
        <Link href="/">Voltar ao início</Link>
      </div>
    );
  }

  return (
    <>
      <div className="tv-karaoke-shell">
        {/* FUNDO COM EFEITOS */}
        <div className="tv-background-glow tv-background-glow-1" />
        <div className="tv-background-glow tv-background-glow-2" />
        <div className="tv-background-glow tv-background-glow-3" />

        {particles.map((particle) => (
          <span
            key={particle.id}
            className="floating-particle"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              fontSize: `${particle.size}px`,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
              opacity: particle.opacity,
            }}
          >
            {particle.symbol}
          </span>
        ))}

        {/* LATERAL */}
        <aside className="tv-karaoke-sidebar">
          <div className="tv-sidebar-brand">
            <div className="tv-brand-badge">
              <Mic2 size={18} />
            </div>

            <div>
              <div className="tv-brand-name">
                KAI<span>OKÊ</span>
              </div>
              <div className="tv-brand-subtitle">
                painel do show
              </div>
            </div>
          </div>

          <div className="tv-sidebar-room-code">
            SALA <strong>{code}</strong>
          </div>

          <div className="tv-sidebar-section-title">
            <ListMusic size={16} />
            Fila de músicas
          </div>

          <div className="tv-queue-list">
            {queue.length === 0 ? (
              <div className="tv-queue-empty">
                <Music2 size={34} />
                <p>Nenhuma música na fila.</p>
                <span>
                  Use a tela de pedidos no celular para adicionar.
                </span>
              </div>
            ) : (
              queue.map((song, index) => (
                <div className="tv-queue-item" key={song.id}>
                  <div className="tv-queue-position">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <img
                    className="tv-queue-thumb"
                    src={song.thumbnail}
                    alt={song.title}
                  />

                  <div className="tv-queue-info">
                    <strong title={song.title}>{song.title}</strong>
                    <span>{song.requested_by}</span>
                  </div>

                  {adminKey && (
                    <button
                      className="tv-queue-remove"
                      disabled={busy}
                      title="Remover música"
                      onClick={() => void action("remove", song.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="tv-sidebar-stats">
            <div className="tv-stat-box">
              <span>Na fila</span>
              <strong>{queue.length}</strong>
            </div>

            <div className="tv-stat-box">
              <span>Cantadas</span>
              <strong>{finished}</strong>
            </div>
          </div>
        </aside>

        {/* ÁREA CENTRAL */}
        <main className="tv-karaoke-main">
          <header className="tv-topbar">
            <div className="tv-topbar-left">
              <span className="tv-live-pill">
                <span className="tv-live-dot" />
                {current ? "NO PALCO AGORA" : "PRONTO PARA COMEÇAR"}
              </span>

              <h1 className="tv-party-title">
                {room?.name || "Noite de Karaokê"}
              </h1>
            </div>

            <div className="tv-topbar-actions">
              <button
                className="tv-icon-button"
                onClick={() => void full()}
                title="Tela cheia"
              >
                <Maximize size={18} />
              </button>
            </div>
          </header>

          <section className="tv-stage-card">
            <div className="tv-stage-player">
              <YoutubePlayer
                videoId={currentVideoId}
                songId={currentId}
                playing={playing}
                onEnded={() => {
                  void handleEnded();
                }}
              />

              {!current && (
                <div className="tv-stage-empty-overlay">
                  <div className="tv-stage-empty-icon">
                    <Mic2 size={74} strokeWidth={1.2} />
                  </div>

                  <span className="tv-stage-empty-mini">
                    O PALCO ESTÁ PRONTO
                  </span>

                  <h2>Só falta começar o show.</h2>

                  <p>
                    Adicione músicas pelo celular e clique em
                    começar quando estiver tudo pronto.
                  </p>

                  <button
                    className="tv-main-action-button"
                    disabled={!queue.length || !adminKey || busy}
                    onClick={() => void handleNext()}
                  >
                    <Play size={18} fill="currentColor" />
                    {queue.length ? "Começar show" : "Aguardando músicas"}
                  </button>
                </div>
              )}
            </div>

            <div className="tv-now-playing-bar">
              <div className="tv-now-playing-left">
                <div className="tv-now-thumb">
                  {current ? (
                    <img src={current.thumbnail} alt={current.title} />
                  ) : (
                    <Mic2 size={20} />
                  )}
                </div>

                <div className="tv-now-meta">
                  <span>AGORA TOCANDO</span>
                  <strong>
                    {current?.title || "A próxima atração é você!"}
                  </strong>
                  <small>
                    {current
                      ? `🎤 ${current.requested_by}`
                      : "Adicione músicas para começar"}
                  </small>
                </div>
              </div>

              <div className="tv-player-actions">
                <button
                  disabled={!current || busy || !adminKey}
                  title={playing ? "Pausar" : "Reproduzir"}
                  className="tv-main-play"
                  onClick={() => void togglePlayback()}
                >
                  {playing ? (
                    <Pause size={20} fill="currentColor" />
                  ) : (
                    <Play size={20} fill="currentColor" />
                  )}
                </button>

                <button
                  disabled={busy || (!current && !queue.length) || !adminKey}
                  onClick={() => void handleNext()}
                  className="tv-skip-button"
                  title="Próxima música"
                >
                  <SkipForward size={20} />
                </button>
              </div>
            </div>
          </section>
        </main>

        {notice && (
          <div className="tv-toast">
            <Sparkles size={16} />
            <span>{notice}</span>
            <button onClick={() => setNotice("")}>×</button>
          </div>
        )}

        {!adminKey && (
          <div className="host-warning">
            Modo convidado: os controles estão disponíveis somente
            para o anfitrião.
            <Link href={`/room/${code}`}>Pedir música</Link>
          </div>
        )}
      </div>

      <style jsx>{`
        .tv-karaoke-shell {
          position: relative;
          min-height: 100vh;
          display: grid;
          grid-template-columns: 360px 1fr;
          background:
            radial-gradient(circle at top, rgba(168, 85, 247, 0.18), transparent 30%),
            radial-gradient(circle at bottom right, rgba(236, 72, 153, 0.15), transparent 26%),
            linear-gradient(135deg, #070510 0%, #0c0920 48%, #130a1d 100%);
          overflow: hidden;
          color: #fff;
        }

        .tv-background-glow {
          position: absolute;
          border-radius: 999px;
          filter: blur(70px);
          pointer-events: none;
          z-index: 0;
        }

        .tv-background-glow-1 {
          width: 280px;
          height: 280px;
          top: 40px;
          left: 420px;
          background: rgba(168, 85, 247, 0.2);
        }

        .tv-background-glow-2 {
          width: 260px;
          height: 260px;
          bottom: 60px;
          right: 80px;
          background: rgba(236, 72, 153, 0.18);
        }

        .tv-background-glow-3 {
          width: 180px;
          height: 180px;
          top: 50%;
          left: 50%;
          background: rgba(59, 130, 246, 0.12);
          transform: translate(-50%, -50%);
        }

        .floating-particle {
          position: absolute;
          z-index: 0;
          color: #ffffff;
          user-select: none;
          pointer-events: none;
          animation-name: floatKaraoke;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }

        @keyframes floatKaraoke {
          0% {
            transform: translateY(0px) translateX(0px) rotate(0deg) scale(1);
          }
          25% {
            transform: translateY(-14px) translateX(8px) rotate(6deg) scale(1.04);
          }
          50% {
            transform: translateY(-24px) translateX(-6px) rotate(-5deg) scale(1.08);
          }
          75% {
            transform: translateY(-10px) translateX(10px) rotate(4deg) scale(1.03);
          }
          100% {
            transform: translateY(0px) translateX(0px) rotate(0deg) scale(1);
          }
        }

        .tv-karaoke-sidebar,
        .tv-karaoke-main,
        .tv-toast,
        .host-warning {
          position: relative;
          z-index: 1;
        }

        .tv-karaoke-sidebar {
          display: flex;
          flex-direction: column;
          gap: 18px;
          padding: 26px 20px;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(9, 7, 20, 0.74);
          backdrop-filter: blur(14px);
        }

        .tv-sidebar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .tv-brand-badge {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, #a855f7, #ec4899);
          box-shadow: 0 10px 30px rgba(168, 85, 247, 0.32);
        }

        .tv-brand-name {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: 0.04em;
        }

        .tv-brand-name span {
          color: #f472b6;
        }

        .tv-brand-subtitle {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          color: rgba(255, 255, 255, 0.6);
        }

        .tv-sidebar-room-code {
          padding: 14px 16px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.06);
          font-size: 14px;
          color: rgba(255, 255, 255, 0.78);
        }

        .tv-sidebar-room-code strong {
          color: #fff;
          letter-spacing: 0.12em;
          margin-left: 6px;
        }

        .tv-sidebar-section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #e9d5ff;
        }

        .tv-queue-list {
          flex: 1;
          overflow: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-right: 4px;
        }

        .tv-queue-list::-webkit-scrollbar {
          width: 8px;
        }

        .tv-queue-list::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.12);
          border-radius: 999px;
        }

        .tv-queue-empty {
          border: 1px dashed rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.04);
          border-radius: 20px;
          padding: 28px 18px;
          text-align: center;
          color: rgba(255, 255, 255, 0.72);
          display: flex;
          flex-direction: column;
          gap: 10px;
          align-items: center;
          justify-content: center;
          min-height: 220px;
        }

        .tv-queue-empty span {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.52);
        }

        .tv-queue-item {
          display: grid;
          grid-template-columns: 34px 58px 1fr 34px;
          align-items: center;
          gap: 10px;
          padding: 10px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .tv-queue-position {
          font-size: 13px;
          font-weight: 800;
          color: #e9d5ff;
          text-align: center;
        }

        .tv-queue-thumb {
          width: 58px;
          height: 44px;
          object-fit: cover;
          border-radius: 12px;
        }

        .tv-queue-info {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .tv-queue-info strong {
          font-size: 14px;
          line-height: 1.25;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tv-queue-info span {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.62);
          margin-top: 2px;
        }

        .tv-queue-remove {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          cursor: pointer;
        }

        .tv-sidebar-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .tv-stat-box {
          padding: 16px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .tv-stat-box span {
          display: block;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.65);
          margin-bottom: 8px;
        }

        .tv-stat-box strong {
          font-size: 28px;
          font-weight: 800;
        }

        .tv-karaoke-main {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .tv-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }

        .tv-live-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
        }

        .tv-live-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #f43f5e;
          box-shadow: 0 0 12px rgba(244, 63, 94, 0.9);
        }

        .tv-party-title {
          margin: 12px 0 0;
          font-size: 34px;
          line-height: 1.1;
          font-weight: 800;
        }

        .tv-icon-button {
          width: 46px;
          height: 46px;
          border: none;
          border-radius: 14px;
          display: grid;
          place-items: center;
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          cursor: pointer;
        }

        .tv-stage-card {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .tv-stage-player {
          position: relative;
          flex: 1;
          min-height: 0;
          border-radius: 28px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.35);
        }

        .tv-stage-empty-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 28px;
          background:
            radial-gradient(circle at center, rgba(168, 85, 247, 0.14), transparent 35%),
            rgba(8, 6, 18, 0.82);
        }

        .tv-stage-empty-icon {
          color: #f0abfc;
          margin-bottom: 16px;
          opacity: 0.95;
        }

        .tv-stage-empty-mini {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.18em;
          color: rgba(255, 255, 255, 0.64);
        }

        .tv-stage-empty-overlay h2 {
          margin: 12px 0 10px;
          font-size: 34px;
          font-weight: 800;
        }

        .tv-stage-empty-overlay p {
          max-width: 520px;
          color: rgba(255, 255, 255, 0.72);
          margin-bottom: 24px;
          line-height: 1.55;
        }

        .tv-main-action-button {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          border: none;
          cursor: pointer;
          border-radius: 16px;
          padding: 14px 22px;
          background: linear-gradient(135deg, #a855f7, #ec4899);
          color: #fff;
          font-size: 15px;
          font-weight: 800;
          box-shadow: 0 18px 40px rgba(168, 85, 247, 0.35);
        }

        .tv-main-action-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          box-shadow: none;
        }

        .tv-now-playing-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 16px 18px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(12px);
        }

        .tv-now-playing-left {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .tv-now-thumb {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          overflow: hidden;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          background: rgba(255, 255, 255, 0.08);
        }

        .tv-now-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .tv-now-meta {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .tv-now-meta span {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.16em;
          color: rgba(255, 255, 255, 0.58);
        }

        .tv-now-meta strong {
          margin-top: 6px;
          font-size: 20px;
          line-height: 1.25;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tv-now-meta small {
          margin-top: 5px;
          color: rgba(255, 255, 255, 0.72);
          font-size: 13px;
        }

        .tv-player-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .tv-main-play,
        .tv-skip-button {
          width: 52px;
          height: 52px;
          border: none;
          border-radius: 16px;
          display: grid;
          place-items: center;
          cursor: pointer;
          color: #fff;
        }

        .tv-main-play {
          background: linear-gradient(135deg, #a855f7, #ec4899);
          box-shadow: 0 16px 30px rgba(168, 85, 247, 0.28);
        }

        .tv-skip-button {
          background: rgba(255, 255, 255, 0.08);
        }

        .tv-main-play:disabled,
        .tv-skip-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          box-shadow: none;
        }

        .tv-toast {
          position: fixed;
          left: 50%;
          bottom: 18px;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 14px;
          background: rgba(18, 15, 33, 0.92);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(14px);
          z-index: 20;
        }

        .tv-toast button {
          background: transparent;
          border: none;
          color: #fff;
          font-size: 18px;
          cursor: pointer;
        }

        .host-warning {
          position: fixed;
          right: 18px;
          bottom: 18px;
          max-width: 360px;
          padding: 14px 16px;
          border-radius: 16px;
          background: rgba(127, 29, 29, 0.92);
          color: #fff;
          z-index: 20;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .host-warning a {
          color: #fff;
          font-weight: 700;
          text-decoration: underline;
        }

        @media (max-width: 1200px) {
          .tv-karaoke-shell {
            grid-template-columns: 320px 1fr;
          }

          .tv-party-title {
            font-size: 28px;
          }
        }

        @media (max-width: 980px) {
          .tv-karaoke-shell {
            grid-template-columns: 1fr;
          }

          .tv-karaoke-sidebar {
            order: 2;
          }

          .tv-karaoke-main {
            order: 1;
          }
        }
      `}</style>
    </>
  );
}