
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
import KaraokeScore from "./karaoke-score";

type Props = {
  code: string;
};

type ScoreSong = {
  id: string;
  singer: string;
  title: string;
};

const SCORE_DURATION = 6500;

const particles = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  symbol: ["♪", "♫", "✦", "★"][i % 4],
  left: (i * 37 + 11) % 100,
  top: (i * 29 + 7) % 100,
  delay: (i % 8) * -1.1,
  duration: 7 + (i % 7),
  size: 14 + (i % 5) * 6,
}));

export default function TvClient({ code }: Props) {
  const {
    room,
    songs,
    error,
    loading,
    refresh,
  } = useRoom(code);

  const [adminKey, setAdminKey] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  // Sistema de avaliação.
  const [showScore, setShowScore] = useState(false);
  const [scoreSong, setScoreSong] =
    useState<ScoreSong | null>(null);

  const scoreTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const scoreSongIdRef = useRef<string | null>(null);
  const advancingRef = useRef(false);
  const endedSongRef = useRef<string | null>(null);

  const current = songs.find(
    (song) => song.id === room?.current_song_id
  );

  const currentId = current?.id ?? null;
  const currentVideoId = current?.video_id ?? null;
  const playing = room?.playback_state === "playing";

  const queue = useMemo(
    () =>
      songs
        .filter((song) => song.status === "queued")
        .sort((a, b) => a.position - b.position),
    [songs]
  );

  const finished = songs.filter(
    (song) =>
      song.status === "done" ||
      song.status === "skipped"
  ).length;

  const currentIdRef = useRef<string | null>(null);
  const playingRef = useRef(false);
  const songsRef = useRef(songs);

  currentIdRef.current = currentId;
  playingRef.current = playing;
  songsRef.current = songs;

  // Recupera a autorização do anfitrião.
  useEffect(() => {
    const key =
      localStorage.getItem(`kaioke_admin_${code}`) || "";

    setAdminKey(key);
  }, [code]);

  // Limpa o temporizador quando a página for fechada.
  useEffect(() => {
    return () => {
      if (scoreTimerRef.current) {
        clearTimeout(scoreTimerRef.current);
      }
    };
  }, []);

  function cancelScore() {
    if (scoreTimerRef.current) {
      clearTimeout(scoreTimerRef.current);
      scoreTimerRef.current = null;
    }

    scoreSongIdRef.current = null;
    setShowScore(false);
    setScoreSong(null);
  }

  // Quando a música atual muda, libera a nova avaliação.
  useEffect(() => {
    if (
      scoreSongIdRef.current &&
      currentId !== scoreSongIdRef.current
    ) {
      if (scoreTimerRef.current) {
        clearTimeout(scoreTimerRef.current);
        scoreTimerRef.current = null;
      }

      scoreSongIdRef.current = null;
      setShowScore(false);
      setScoreSong(null);
    }

    endedSongRef.current = null;
  }, [currentId]);

  // Comandos administrativos do Supabase.
  const action = useCallback(
    async (command: string, id?: string) => {
      const key =
        localStorage.getItem(
          `kaioke_admin_${code}`
        ) || "";

      if (!key) {
        setNotice(
          "Abra o telão no navegador do anfitrião."
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
        console.error(
          "[KAIOKÊ] Erro no comando:",
          err
        );

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

  // Próxima música: proteção contra chamadas simultâneas.
  const nextSong = useCallback(async () => {
    if (advancingRef.current) return false;

    advancingRef.current = true;

    try {
      return await action("next");
    } finally {
      advancingRef.current = false;
    }
  }, [action]);

  // Avanço manual: cancela a avaliação, se estiver aberta.
  const handleNext = useCallback(async () => {
    if (advancingRef.current) return;

    if (scoreTimerRef.current) {
      clearTimeout(scoreTimerRef.current);
      scoreTimerRef.current = null;
    }

    scoreSongIdRef.current = null;
    setShowScore(false);
    setScoreSong(null);

    await nextSong();
  }, [nextSong]);

  // Executado quando o vídeo termina naturalmente.
  const handleEnded = useCallback(() => {
    const songId = currentIdRef.current;

    if (!songId || !playingRef.current) return;
    if (endedSongRef.current === songId) return;
    if (advancingRef.current) return;

    const finishedSong = songsRef.current.find(
      (song) => song.id === songId
    );

    if (!finishedSong) return;

    endedSongRef.current = songId;
    scoreSongIdRef.current = songId;

    // Exibe a avaliação por cima do player.
    setScoreSong({
      id: songId,
      singer: finishedSong.requested_by,
      title: finishedSong.title,
    });

    setShowScore(true);

    if (scoreTimerRef.current) {
      clearTimeout(scoreTimerRef.current);
    }

    scoreTimerRef.current = setTimeout(async () => {
      scoreTimerRef.current = null;

      // Não avança se outra música já assumiu o palco.
      if (scoreSongIdRef.current !== songId) return;
      if (currentIdRef.current !== songId) return;

      const success = await nextSong();

      if (!success) {
        endedSongRef.current = null;
        setNotice(
          "Não foi possível avançar. Use o botão Próxima."
        );
      }

      scoreSongIdRef.current = null;
      setShowScore(false);
      setScoreSong(null);
    }, SCORE_DURATION);
  }, [nextSong]);

  // Play e pause.
  const togglePlayback = useCallback(async () => {
    if (showScore) return;

    if (!currentId) {
      if (queue.length) {
        await handleNext();
      }
      return;
    }

    await action(playing ? "pause" : "resume");
  }, [
    action,
    currentId,
    playing,
    queue.length,
    handleNext,
    showScore,
  ]);

  // Atualiza quando o navegador volta ao primeiro plano.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    document.addEventListener(
      "visibilitychange",
      onVisible
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        onVisible
      );
    };
  }, [refresh]);

  // Modo tela cheia.
  async function full() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      setNotice(
        "Não foi possível ativar a tela cheia."
      );
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <LoaderCircle className="spin" />
        Preparando o palco...
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
    <div className="kaioke-tv">

      {/* FUNDO ANIMADO */}
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <div className="floating-effects" aria-hidden="true">
        {particles.map((p) => (
          <span
            key={p.id}
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              fontSize: p.size,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          >
            {p.symbol}
          </span>
        ))}
      </div>

      {/* LATERAL: FILA */}
      <aside className="tv-side">

        <div className="tv-logo">
          <div className="logo-icon">
            <Mic2 size={23} />
          </div>

          <div>
            <strong>
              KAI<span>OKÊ</span>
            </strong>
            <small>SEU PALCO, SUA FESTA</small>
          </div>
        </div>

        <div className="room-code">
          SALA <strong>{code}</strong>
        </div>

        <div className="queue-heading">
          <ListMusic size={19} />
          <span>PRÓXIMAS MÚSICAS</span>
          <b>{queue.length}</b>
        </div>

        <div className="tv-list">
          {queue.length === 0 ? (
            <div className="empty-queue">
              <Music2 size={38} />
              <strong>A fila está vazia</strong>
              <p>
                Peça aos convidados para
                adicionarem músicas pelo celular.
              </p>
            </div>
          ) : (
            queue.map((song, index) => (
              <div className="queue-track" key={song.id}>
                <span className="track-position">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <img
                  src={song.thumbnail}
                  alt={song.title}
                />

                <div className="queue-info">
                  <strong title={song.title}>
                    {song.title}
                  </strong>
                  <small>
                    🎤 {song.requested_by}
                  </small>
                </div>

                {adminKey && (
                  <button
                    className="remove-track"
                    title="Remover música"
                    disabled={busy}
                    onClick={() =>
                      void action("remove", song.id)
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="tv-stats">
          <div>
            <span>NA FILA</span>
            <strong>{queue.length}</strong>
          </div>

          <div>
            <span>APRESENTAÇÕES</span>
            <strong>{finished}</strong>
          </div>
        </div>
      </aside>

      {/* PALCO CENTRAL */}
      <main className="tv-content-new">

        <header className="tv-top">
          <div>
            <div className="live-label">
              <span className="live-dot" />
              {showScore
                ? "AVALIAÇÃO DO SHOW"
                : current
                  ? "NO PALCO AGORA"
                  : "PALCO PRONTO"}
            </div>

            <h1>
              {room?.name || "Noite de Karaokê"}
              <span> ✦</span>
            </h1>
          </div>

          <button
            className="fullscreen-button"
            onClick={() => void full()}
            title="Tela cheia"
          >
            <Maximize size={20} />
          </button>
        </header>

        <section className="main-stage">

          {/* ÁREA DO PLAYER */}
          <div className="stage-screen">

            <YoutubePlayer
              videoId={currentVideoId}
              songId={currentId}
              playing={playing}
              onEnded={handleEnded}
            />

            {/* TELA VAZIA */}
            {!current && !showScore && (
              <div className="stage-waiting">
                <div className="waiting-icon">
                  <Mic2 size={76} strokeWidth={1.2} />
                </div>

                <span>AS LUZES ESTÃO ACESAS</span>

                <h2>Seu palco está pronto!</h2>

                <p>
                  Prepare o microfone.
                  O próximo show começa aqui.
                </p>

                <button
                  className="start-show"
                  disabled={
                    !queue.length ||
                    !adminKey ||
                    busy
                  }
                  onClick={() => void handleNext()}
                >
                  <Play
                    size={19}
                    fill="currentColor"
                  />
                  {queue.length
                    ? "Começar show"
                    : "Aguardando músicas"}
                </button>
              </div>
            )}

            {/* AVALIAÇÃO NO FINAL DA MÚSICA */}
            {showScore && scoreSong && (
              <KaraokeScore
                key={scoreSong.id}
                singer={scoreSong.singer}
                songTitle={scoreSong.title}
              />
            )}

          </div>

          {/* CONTROLES ABAIXO DO VÍDEO */}
          <div className="playing-bar">

            <div className="song-meta">
              <div className="current-cover">
                {current ? (
                  <img
                    src={current.thumbnail}
                    alt={current.title}
                  />
                ) : (
                  <Mic2 size={24} />
                )}
              </div>

              <div className="current-info">
                <small>
                  {showScore
                    ? "APRESENTAÇÃO FINALIZADA"
                    : "AGORA TOCANDO"}
                </small>

                <strong>
                  {current?.title ||
                    "A próxima atração é você!"}
                </strong>

                <span>
                  {current
                    ? `🎤 ${current.requested_by}`
                    : "Prepare a voz!"}
                </span>
              </div>
            </div>

            <div className="play-controls">

              <button
                className="control-play"
                disabled={
                  !current ||
                  busy ||
                  !adminKey ||
                  showScore
                }
                onClick={() =>
                  void togglePlayback()
                }
                title={
                  playing
                    ? "Pausar"
                    : "Reproduzir"
                }
              >
                {playing ? (
                  <Pause
                    size={21}
                    fill="currentColor"
                  />
                ) : (
                  <Play
                    size={21}
                    fill="currentColor"
                  />
                )}
              </button>

              <button
                className="control-next"
                disabled={
                  busy ||
                  !adminKey ||
                  (!current && !queue.length)
                }
                onClick={() => void handleNext()}
                title="Próxima música"
              >
                <SkipForward size={22} />
              </button>

            </div>
          </div>

        </section>

        {/* MENSAGENS */}
        {notice && (
          <div className="tv-message">
            <Sparkles size={18} />
            <span>{notice}</span>
            <button
              onClick={() => setNotice("")}
            >
              ×
            </button>
          </div>
        )}

        {!adminKey && (
          <div className="tv-warning">
            Controles disponíveis apenas
            para o anfitrião.
            <Link href={`/room/${code}`}>
              Pedir música
            </Link>
          </div>
        )}

      </main>

      <style jsx>{`
        .kaioke-tv {
          position: relative;
          isolation: isolate;
          display: grid;
          grid-template-columns: 330px minmax(0, 1fr);
          min-height: 100vh;
          background: linear-gradient(
            125deg,
            #080511,
            #100824 55%,
            #170a22
          );
          color: white;
          overflow: hidden;
        }

        .ambient {
          position: absolute;
          z-index: -1;
          pointer-events: none;
          border-radius: 50%;
          filter: blur(90px);
        }

        .ambient-one {
          width: 380px;
          height: 380px;
          background: #6b21a844;
          top: -100px;
          left: 40%;
        }

        .ambient-two {
          width: 350px;
          height: 350px;
          background: #db277744;
          right: -100px;
          bottom: -100px;
        }

        .floating-effects {
          position: absolute;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .floating-effects span {
          position: absolute;
          color: #d8b4fe;
          opacity: 0.19;
          animation: float-note 9s
            ease-in-out infinite;
        }

        @keyframes float-note {
          0%, 100% {
            transform: translate(0, 0)
              rotate(0deg);
          }

          50% {
            transform: translate(
              25px,
              -45px
            ) rotate(18deg);
          }
        }

        .tv-side,
        .tv-content-new {
          position: relative;
          z-index: 1;
        }

        .tv-side {
          display: flex;
          flex-direction: column;
          height: 100vh;
          min-height: 650px;
          padding: 26px 18px;
          background: #0c091bd9;
          border-right:
            1px solid #ffffff15;
          backdrop-filter: blur(14px);
        }

        .tv-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .logo-icon {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border-radius: 15px;
          background: linear-gradient(
            135deg,
            #9333ea,
            #ec4899
          );
          box-shadow:
            0 0 30px #9333ea55;
        }

        .tv-logo strong {
          display: block;
          font-size: 27px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .tv-logo strong span {
          color: #f472b6;
        }

        .tv-logo small {
          display: block;
          margin-top: 3px;
          font-size: 9px;
          letter-spacing: 2px;
          color: #aaa0c2;
        }

        .room-code {
          padding: 14px;
          border-radius: 14px;
          background: #ffffff0c;
          color: #bdb2d3;
          font-size: 13px;
          margin-bottom: 25px;
        }

        .room-code strong {
          color: white;
          letter-spacing: 3px;
          margin-left: 9px;
        }

        .queue-heading {
          display: flex;
          align-items: center;
          gap: 9px;
          color: #e9d5ff;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1px;
          margin-bottom: 15px;
        }

        .queue-heading b {
          margin-left: auto;
          background: #a855f722;
          padding: 5px 9px;
          border-radius: 9px;
        }

        .tv-list {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding-right: 3px;
        }

        .empty-queue {
          padding: 32px 18px;
          border-radius: 18px;
          background: #ffffff08;
          border: 1px dashed #ffffff25;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 11px;
          color: #c4b5fd;
        }

        .empty-queue p {
          font-size: 12px;
          line-height: 1.5;
          color: #a99bbf;
        }

        .queue-track {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 9px;
          border-radius: 13px;
          background: #ffffff0c;
          border: 1px solid #ffffff0a;
        }

        .track-position {
          font-size: 12px;
          color: #c4b5fd;
          font-weight: 900;
        }

        .queue-track img {
          width: 52px;
          height: 42px;
          object-fit: cover;
          border-radius: 9px;
          flex-shrink: 0;
        }

        .queue-info {
          flex: 1;
          min-width: 0;
        }

        .queue-info strong {
          display: block;
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .queue-info small {
          display: block;
          margin-top: 5px;
          color: #b2a5c7;
          font-size: 11px;
        }

        .remove-track {
          border: none;
          color: #cbbddd;
          background: transparent;
          cursor: pointer;
          padding: 7px;
        }

        .tv-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 15px;
        }

        .tv-stats div {
          padding: 16px;
          border-radius: 15px;
          background: #ffffff0b;
        }

        .tv-stats span {
          display: block;
          font-size: 10px;
          letter-spacing: 1px;
          color: #aaa0bc;
        }

        .tv-stats strong {
          display: block;
          font-size: 28px;
          margin-top: 7px;
        }

        .tv-content-new {
          display: flex;
          flex-direction: column;
          padding: 24px;
          min-width: 0;
          height: 100vh;
          min-height: 650px;
          gap: 20px;
        }

        .tv-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }

        .live-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: #d8b4fe;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        .live-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #fb7185;
          box-shadow: 0 0 12px #fb7185;
        }

        .tv-top h1 {
          margin: 8px 0 0;
          font-size: clamp(
            22px,
            2.6vw,
            36px
          );
          font-weight: 900;
        }

        .tv-top h1 span {
          color: #f472b6;
        }

        .fullscreen-button {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          color: white;
          background: #ffffff12;
          border: none;
          border-radius: 14px;
          cursor: pointer;
        }

        .main-stage {
          display: flex;
          flex: 1;
          min-height: 0;
          flex-direction: column;
          gap: 15px;
        }

        .stage-screen {
          position: relative;
          flex: 1;
          min-height: 300px;
          border-radius: 22px;
          overflow: hidden;
          background: #090612;
          border: 1px solid #ffffff1d;
          box-shadow:
            0 25px 80px #00000055;
        }

        .stage-waiting {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          padding: 25px;
          text-align: center;
          background:
            radial-gradient(
              circle,
              #52217940,
              transparent 65%
            ),
            #0e0920;
          z-index: 5;
        }

        .waiting-icon {
          color: #e879f9;
        }

        .stage-waiting > span {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2px;
          color: #c4b5fd;
        }

        .stage-waiting h2 {
          font-size: clamp(
            22px,
            3vw,
            38px
          );
          font-weight: 900;
        }

        .stage-waiting p {
          max-width: 400px;
          color: #b8accb;
          line-height: 1.5;
          font-size: 14px;
        }

        .start-show {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 25px;
          margin-top: 8px;
          border: none;
          border-radius: 13px;
          color: white;
          background: linear-gradient(
            135deg,
            #9333ea,
            #ec4899
          );
          font-weight: 800;
          cursor: pointer;
        }

        .start-show:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .playing-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          padding: 15px;
          background: #ffffff0c;
          border: 1px solid #ffffff13;
          border-radius: 19px;
        }

        .song-meta {
          display: flex;
          align-items: center;
          gap: 13px;
          flex: 1;
          min-width: 0;
        }

        .current-cover {
          display: grid;
          place-items: center;
          width: 59px;
          height: 59px;
          background: #ffffff12;
          border-radius: 13px;
          overflow: hidden;
          flex-shrink: 0;
        }

        .current-cover img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .current-info {
          display: flex;
          flex-direction: column;
          gap: 5px;
          min-width: 0;
        }

        .current-info small {
          font-size: 10px;
          color: #c4b5fd;
          letter-spacing: 1.5px;
          font-weight: 700;
        }

        .current-info strong {
          font-size: 16px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .current-info span {
          font-size: 12px;
          color: #b5a7c8;
        }

        .play-controls {
          display: flex;
          gap: 9px;
          flex-shrink: 0;
        }

        .control-play,
        .control-next {
          width: 50px;
          height: 50px;
          display: grid;
          place-items: center;
          border: none;
          border-radius: 14px;
          color: white;
          cursor: pointer;
        }

        .control-play {
          background: linear-gradient(
            135deg,
            #9333ea,
            #ec4899
          );
        }

        .control-next {
          background: #ffffff17;
        }

        .control-play:disabled,
        .control-next:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .tv-message,
        .tv-warning {
          position: fixed;
          z-index: 100;
          right: 20px;
          bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 18px;
          border-radius: 14px;
          background: #221335;
          color: white;
          box-shadow: 0 15px 40px #0008;
          max-width: 420px;
        }

        .tv-message button {
          background: transparent;
          color: white;
          font-size: 20px;
          border: none;
          cursor: pointer;
        }

        .tv-warning {
          left: 350px;
          right: auto;
          background: #7f1d1d;
        }

        .tv-warning a {
          text-decoration: underline;
          font-weight: 700;
        }

        @media (max-width: 1050px) {
          .kaioke-tv {
            grid-template-columns: 275px
              minmax(0, 1fr);
          }

          .tv-side {
            padding: 18px 12px;
          }

          .tv-content-new {
            padding: 16px;
          }
        }

        @media (max-width: 750px) {
          .kaioke-tv {
            grid-template-columns: 1fr;
          }

          .tv-content-new {
            height: auto;
            min-height: 75vh;
            order: 1;
          }

          .tv-side {
            height: 450px;
            min-height: 0;
            order: 2;
          }

          .stage-screen {
            aspect-ratio: 16 / 9;
            flex: auto;
            min-height: 250px;
          }

          .tv-warning {
            left: 15px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .floating-effects span {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
