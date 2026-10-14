
"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clipboard,
  Headphones,
  Link2,
  ListMusic,
  LoaderCircle,
  Mic2,
  Music2,
  Plus,
  QrCode,
  Search,
  Share2,
  Sparkles,
  Users,
  ExternalLink,
} from "lucide-react";

import { QRCodeSVG } from "qrcode.react";

import { useRoom, postJson } from "./use-room";
import type { SearchItem } from "@/lib/types";

type Props = {
  code: string;
};

type Tab = "search" | "link";

const genres = [
  {
    label: "Sertanejo",
    query: "sertanejo clássico",
  },
  {
    label: "Pagode",
    query: "pagode brasileiro",
  },
  {
    label: "Pop",
    query: "pop brasileiro",
  },
  {
    label: "Rock",
    query: "rock nacional",
  },
  {
    label: "Forró",
    query: "forró brasileiro",
  },
];

export default function RoomClient({ code }: Props) {
  const {
    room,
    songs,
    error,
    loading,
    refresh,
  } = useRoom(code);

  const [person, setPerson] = useState("");
  const [tab, setTab] = useState<Tab>("search");

  const [term, setTerm] = useState("");
  const [link, setLink] = useState("");

  const [results, setResults] = useState<SearchItem[]>([]);

  const [busy, setBusy] = useState(false);
  const [warning, setWarning] = useState("");
  const [notice, setNotice] = useState("");

  const [origin, setOrigin] = useState("");
  const [showQr, setShowQr] = useState(true);

  useEffect(() => {
    setPerson(localStorage.getItem("kaioke_name") || "");
    setOrigin(window.location.origin);
  }, []);

  const roomUrl = origin
    ? `${origin}/room/${code}`
    : "";

  const queue = useMemo(() => {
    return songs
      .filter((song) => song.status === "queued")
      .sort((a, b) => a.position - b.position);
  }, [songs]);

  const current = songs.find(
    (song) => song.id === room?.current_song_id
  );

  const finished = songs.filter(
    (song) =>
      song.status === "done" ||
      song.status === "skipped"
  ).length;

  function updatePerson(value: string) {
    setPerson(value);
    localStorage.setItem("kaioke_name", value);
  }

  function showNotice(message: string) {
    setNotice(message);
    setWarning("");
  }

  // PESQUISAR MÚSICAS NO YOUTUBE
  async function search(query = term) {
    const q = query.trim();

    if (q.length < 2) {
      setWarning(
        "Digite pelo menos duas letras para pesquisar."
      );
      return;
    }

    setBusy(true);
    setWarning("");
    setNotice("");
    setResults([]);

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(q)}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Erro ao pesquisar no YouTube."
        );
      }

      setResults(data.items || []);

      if (!data.items?.length) {
        setWarning(
          "Não encontramos músicas. Tente outro nome."
        );
      }
    } catch (err) {
      setWarning(
        err instanceof Error
          ? err.message
          : "Não foi possível pesquisar músicas."
      );
    } finally {
      setBusy(false);
    }
  }

  // ADICIONAR MÚSICA À FILA
  async function addSong(value: string) {
    if (!person.trim()) {
      setWarning(
        "Digite seu nome antes de adicionar uma música."
      );
      return;
    }

    if (!value.trim()) {
      setWarning(
        "Selecione uma música ou cole o link do YouTube."
      );
      return;
    }

    setBusy(true);
    setWarning("");
    setNotice("");

    try {
      await postJson(
        `/api/rooms/${code}/songs`,
        {
          url: value.trim(),
          requestedBy: person.trim(),
        }
      );

      localStorage.setItem(
        "kaioke_name",
        person.trim()
      );

      setLink("");

      showNotice(
        "Música adicionada! Prepare a voz, sua vez está chegando."
      );

      await refresh();
    } catch (err) {
      setWarning(
        err instanceof Error
          ? err.message
          : "Não foi possível adicionar a música."
      );
    } finally {
      setBusy(false);
    }
  }

  // COPIAR LINK DA SALA
  async function copyRoomLink() {
    if (!roomUrl) return;

    try {
      await navigator.clipboard.writeText(roomUrl);

      showNotice("Link da sala copiado!");
    } catch {
      setWarning(
        "Não foi possível copiar automaticamente. Verifique as permissões do navegador."
      );
    }
  }

  // COMPARTILHAR SALA
  async function shareRoom() {
    if (!roomUrl) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `KAIOKÊ - ${room?.name || "Nossa festa"}`,
          text: "Entre na nossa festa e escolha sua música!",
          url: roomUrl,
        });
      } else {
        await copyRoomLink();
      }
    } catch (err) {
      if (
        err instanceof DOMException &&
        err.name === "AbortError"
      ) {
        return;
      }

      setWarning(
        "Não foi possível compartilhar a sala."
      );
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <LoaderCircle className="spin" />
        Preparando a festa...
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="page-loading">
        <p>{error}</p>

        <Link href="/" className="btn btn-primary">
          Voltar ao início
        </Link>
      </div>
    );
  }

  return (
    <div className="app-shell room-new">

      {/* CABEÇALHO */}
      <header className="inner-header container">

        <Link href="/" className="brand">
          <span className="brand-mark">
            <Mic2 size={21} />
          </span>

          KAI<span>OKÊ</span>
          <span className="brand-dot">.</span>
        </Link>

        <div className="room-chip">
          <span className="green-dot" />

          <span className="room-name">
            {room?.name || "Sua festa"}
          </span>

          <b>#{code}</b>
        </div>

        <button
          className="icon-btn"
          onClick={() => void shareRoom()}
          title="Compartilhar sala"
        >
          <Share2 size={19} />
        </button>

      </header>

      <main className="container mobile-layout">

        {/* APRESENTAÇÃO */}
        <section className="guest-top">

          <div className="eyebrow">
            <Sparkles size={14} />
            A FESTA COMEÇA COM VOCÊ
          </div>

          <h1>
            Escolha o hit.
            <br />
            <em>Solte a voz.</em>
          </h1>

          <p>
            Pesquise seu karaokê favorito,
            coloque na fila e prepare-se para
            brilhar no palco!
          </p>

        </section>

        <div className="guest-grid">

          {/* PAINEL DE PEDIDOS */}
          <section className="panel search-panel">

            <div className="panel-heading">

              <div>
                <span className="label-mini">
                  SEU MOMENTO DE BRILHAR
                </span>

                <h2>
                  <Music2 size={23} />
                  Pedir uma música
                </h2>
              </div>

              <span className="circle-icon">
                <Headphones size={20} />
              </span>

            </div>

            {/* IDENTIFICAÇÃO DO CANTOR */}
            <label
              className="field-label"
              htmlFor="kaioke-person"
            >
              QUEM VAI CANTAR?
            </label>

            <input
              id="kaioke-person"
              className="text-input"
              placeholder="Digite seu nome ou apelido"
              value={person}
              maxLength={32}
              onChange={(e) =>
                updatePerson(e.target.value)
              }
            />

            {/* ABAS */}
            <div className="tab-switch">

              <button
                className={
                  tab === "search" ? "active" : ""
                }
                onClick={() => {
                  setTab("search");
                  setWarning("");
                }}
              >
                <Search size={16} />
                Pesquisar músicas
              </button>

              <button
                className={
                  tab === "link" ? "active" : ""
                }
                onClick={() => {
                  setTab("link");
                  setWarning("");
                }}
              >
                <Link2 size={16} />
                Colar link
              </button>

            </div>

            {tab === "search" ? (
              <>
                {/* CAMPO DE PESQUISA */}
                <div className="search-form">

                  <Search size={19} />

                  <input
                    placeholder="Música, cantor ou artista..."
                    value={term}
                    onChange={(e) =>
                      setTerm(e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        void search();
                      }
                    }}
                  />

                  <button
                    disabled={busy}
                    onClick={() => void search()}
                    aria-label="Pesquisar música"
                  >
                    {busy ? (
                      <LoaderCircle
                        className="spin"
                        size={20}
                      />
                    ) : (
                      <ArrowRight size={20} />
                    )}
                  </button>

                </div>

                {/* GÊNEROS */}
                <div className="genre-tags">
                  {genres.map((genre) => (
                    <button
                      key={genre.label}
                      disabled={busy}
                      onClick={() => {
                        setTerm(genre.query);
                        void search(genre.query);
                      }}
                    >
                      {genre.label}
                    </button>
                  ))}
                </div>

                {/* RESULTADOS */}
                <div className="search-results">

                  {busy && (
                    <div className="soft-message">
                      <LoaderCircle className="spin" />
                      Buscando os melhores karaokês...
                    </div>
                  )}

                  {!busy && results.length === 0 && (
                    <div className="empty-hint">

                      <div className="result-empty-icon">
                        <Mic2 size={30} />
                      </div>

                      <strong>
                        Qual vai ser a próxima?
                      </strong>

                      <span>
                        Digite o nome de uma música
                        ou escolha um gênero para
                        encontrar seu karaokê.
                      </span>

                    </div>
                  )}

                  {!busy &&
                    results.map((song) => (

                      <div
                        className="song-result"
                        key={song.videoId}
                      >

                        <img
                          src={song.thumbnail}
                          alt={song.title}
                        />

                        <div>
                          <strong title={song.title}>
                            {song.title}
                          </strong>

                          <span>{song.channel}</span>
                        </div>

                        <button
                          className="add-icon"
                          onClick={() =>
                            void addSong(song.videoId)
                          }
                          disabled={busy}
                          title="Adicionar música à fila"
                          aria-label={`Adicionar ${song.title}`}
                        >
                          <Plus size={19} />
                        </button>

                      </div>

                    ))}
                </div>
              </>
            ) : (
              // ADICIONAR LINK DIRETO
              <div className="link-area">

                <div className="link-symbol">
                  <Link2 size={26} />
                </div>

                <h3>
                  Encontrou um karaokê no YouTube?
                </h3>

                <p>
                  Cole o link do vídeo aqui e
                  adicione à fila sem gastar
                  pesquisas da API do YouTube.
                </p>

                <input
                  className="text-input"
                  placeholder="https://youtube.com/watch?v=..."
                  value={link}
                  onChange={(e) =>
                    setLink(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void addSong(link);
                    }
                  }}
                />

                <button
                  className="btn btn-primary full"
                  disabled={busy || !link.trim()}
                  onClick={() => void addSong(link)}
                >
                  {busy ? (
                    <LoaderCircle
                      size={17}
                      className="spin"
                    />
                  ) : (
                    <Plus size={17} />
                  )}

                  {busy
                    ? "Adicionando..."
                    : "Adicionar à fila"}
                </button>

                <small>
                  Aceita links do YouTube, YouTube
                  Shorts e youtu.be. O vídeo precisa
                  permitir incorporação.
                </small>

                <a
                  className="youtube-external"
                  href="https://www.youtube.com/results?search_query=karaoke"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={16} />
                  Abrir YouTube para procurar
                </a>

              </div>
            )}

            {/* MENSAGENS */}
            {warning && (
              <div className="alert" role="alert">
                {warning}
              </div>
            )}

            {notice && (
              <div className="success" role="status">
                <Check size={17} />
                {notice}
              </div>
            )}

          </section>

          {/* COLUNA DE FILA E CONVITE */}
          <aside className="room-side-column">

            {/* FILA */}
            <section className="panel queue-panel">

              <div className="panel-heading">

                <div>
                  <span className="label-mini">
                    ACOMPANHE A FESTA
                  </span>

                  <h2>
                    <ListMusic size={22} />
                    Fila de músicas
                  </h2>
                </div>

                <span className="queue-count">
                  {queue.length} na fila
                </span>

              </div>

              {/* AGORA TOCANDO */}
              <div className="now-playing">

                <span className="onair">
                  <span className="live-dot" />
                  AGORA NO PALCO
                </span>

                {current ? (
                  <div className="now-track">

                    <img
                      src={current.thumbnail}
                      alt={current.title}
                    />

                    <div>
                      <strong>
                        {current.title}
                      </strong>

                      <span>
                        🎤 {current.requested_by}
                      </span>
                    </div>

                  </div>
                ) : (
                  <div className="waiting">

                    <Mic2 size={28} />

                    <strong>
                      O palco está livre!
                    </strong>

                    <span>
                      Adicione uma música para
                      começar o show.
                    </span>

                  </div>
                )}

              </div>

              {/* PRÓXIMAS */}
              <div className="queue-title">
                PRÓXIMAS MÚSICAS
                <span>{queue.length}</span>
              </div>

              <div className="queue-list">

                {queue.length === 0 ? (
                  <div className="empty-queue">
                    A fila está vazia.
                    Seja o primeiro a cantar!
                  </div>
                ) : (
                  queue.map((song, index) => (

                    <div
                      className="queue-song"
                      key={song.id}
                    >

                      <span className="queue-pos">
                        {String(index + 1).padStart(
                          2,
                          "0"
                        )}
                      </span>

                      <img
                        src={song.thumbnail}
                        alt={song.title}
                      />

                      <div>
                        <strong>
                          {song.title}
                        </strong>

                        <span>
                          {song.requested_by}
                        </span>
                      </div>

                    </div>
                  ))
                )}

              </div>

              <div className="room-stats">

                <div>
                  <Music2 size={16} />

                  <span>Na fila</span>

                  <strong>{queue.length}</strong>
                </div>

                <div>
                  <Mic2 size={16} />

                  <span>Já passaram</span>

                  <strong>{finished}</strong>
                </div>

              </div>

            </section>

            {/* QR CODE NO ROOM */}
            <section className="room-qr-card">

              <div className="room-qr-header">

                <span className="room-qr-icon">
                  <QrCode size={21} />
                </span>

                <div>
                  <span className="room-qr-eyebrow">
                    CHAME A GALERA
                  </span>

                  <h3>
                    Todo mundo no KAIOKÊ!
                  </h3>
                </div>

              </div>

              <p className="room-qr-description">
                Seus amigos podem escanear
                este QR Code para entrar
                na sala e pedir músicas
                pelo próprio celular.
              </p>

              <button
                className="room-qr-toggle"
                onClick={() =>
                  setShowQr((previous) => !previous)
                }
              >
                <QrCode size={16} />

                {showQr
                  ? "Ocultar QR Code"
                  : "Mostrar QR Code"}
              </button>

              {showQr && (
                <div className="room-qr-box">

                  {roomUrl && (
                    <QRCodeSVG
                      value={roomUrl}
                      size={180}
                      bgColor="#ffffff"
                      fgColor="#170c29"
                      marginSize={1}
                    />
                  )}

                </div>
              )}

              <div className="room-qr-code-label">
                CÓDIGO DA FESTA
              </div>

              <div className="room-qr-code">
                {code}
              </div>

              <div className="room-share-actions">

                <button
                  onClick={() =>
                    void copyRoomLink()
                  }
                >
                  <Clipboard size={16} />
                  Copiar link
                </button>

                <button
                  onClick={() =>
                    void shareRoom()
                  }
                >
                  <Share2 size={16} />
                  Compartilhar
                </button>

              </div>

            </section>

          </aside>

        </div>
      </main>

      <footer className="inner-footer">
        KAIOKÊ · SEU PALCO, SUA FESTA.
      </footer>

      {/* ESTILOS ADICIONAIS DA SALA */}
      <style jsx>{`
        .room-side-column {
          display: flex;
          flex-direction: column;
          gap: 22px;
          min-width: 0;
        }

        .room-qr-card {
          position: relative;
          overflow: hidden;
          padding: 26px;
          border-radius: 25px;
          border: 1px solid rgba(192, 132, 252, 0.18);
          background:
            radial-gradient(
              circle at 100% 0%,
              rgba(168, 85, 247, 0.17),
              transparent 56%
            ),
            linear-gradient(
              145deg,
              #171026,
              #100b1c
            );
          box-shadow: 0 20px 55px rgba(0, 0, 0, 0.18);
          color: #ffffff;
        }

        .room-qr-header {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .room-qr-icon {
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 15px;
          color: #ffffff;
          background: linear-gradient(
            135deg,
            #a855f7,
            #ec4899
          );
        }

        .room-qr-eyebrow {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.16em;
          color: #c4b5fd;
        }

        .room-qr-header h3 {
          margin-top: 4px;
          font-size: 19px;
          font-weight: 800;
          line-height: 1.2;
        }

        .room-qr-description {
          margin-top: 16px;
          font-size: 13px;
          color: #bdb5cb;
          line-height: 1.7;
        }

        .room-qr-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          margin-top: 18px;
          padding: 11px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #e9d5ff;
          background: rgba(255, 255, 255, 0.04);
          cursor: pointer;
          font-weight: 700;
          font-size: 13px;
        }

        .room-qr-box {
          display: flex;
          justify-content: center;
          align-items: center;
          width: fit-content;
          margin: 18px auto;
          padding: 17px;
          border-radius: 19px;
          background: #ffffff;
          box-shadow: 0 0 35px rgba(168, 85, 247, 0.14);
        }

        .room-qr-code-label {
          margin-top: 18px;
          text-align: center;
          color: #a99dbd;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.17em;
        }

        .room-qr-code {
          text-align: center;
          font-size: 33px;
          font-weight: 900;
          letter-spacing: 0.17em;
          color: #f5d0fe;
          margin: 9px 0 20px;
        }

        .room-share-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .room-share-actions button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 13px 10px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          color: #ffffff;
          background: rgba(255, 255, 255, 0.07);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s, transform 0.2s;
        }

        .room-share-actions button:hover {
          background: rgba(168, 85, 247, 0.23);
          transform: translateY(-2px);
        }

        .room-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 18px;
        }

        .room-stats > div {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          padding: 13px;
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.04);
          color: #e9d5ff;
        }

        .room-stats span {
          flex: 1;
          min-width: 55px;
          font-size: 12px;
          color: #b6acc6;
        }

        .room-stats strong {
          font-size: 20px;
          color: #ffffff;
        }

        .result-empty-icon {
          display: grid;
          place-items: center;
          margin: 0 auto 10px;
          width: 58px;
          height: 58px;
          border-radius: 18px;
          color: #d8b4fe;
          background: rgba(168, 85, 247, 0.1);
        }

        .youtube-external {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 16px;
          color: #d8b4fe;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
        }

        .room-new .search-panel,
        .room-new .queue-panel {
          min-width: 0;
        }

        @media (max-width: 900px) {
          .room-side-column {
            width: 100%;
          }

          .room-qr-card {
            padding: 22px;
          }
        }

        @media (max-width: 480px) {
          .room-qr-card {
            padding: 18px;
            border-radius: 20px;
          }

          .room-qr-header h3 {
            font-size: 17px;
          }

          .room-share-actions {
            gap: 8px;
          }

          .room-share-actions button {
            padding: 11px 7px;
            font-size: 11px;
          }

          .room-qr-code {
            font-size: 28px;
          }
        }
      `}</style>
    </div>
  );
}
