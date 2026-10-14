
"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

type Props = {
  videoId: string | null;
  playing: boolean;
  onEnded: () => void;
  songId?: string | null;
};

// Carrega a API apenas uma vez, mesmo quando o React
// monta e desmonta o componente.
let youtubeApiPromise: Promise<void> | null = null;

function loadYoutubeApi(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Navegador indisponível"));
  }

  if (window.YT?.Player) {
    return Promise.resolve();
  }

  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise<void>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };

    const existing = document.getElementById(
      "youtube-iframe-api"
    );

    if (!existing) {
      const script = document.createElement("script");

      script.id = "youtube-iframe-api";
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;

      script.onerror = () => {
        youtubeApiPromise = null;
        reject(new Error("Falha ao carregar API do YouTube"));
      };

      document.head.appendChild(script);
    }
  });

  return youtubeApiPromise;
}

export default function YoutubePlayer({
  videoId,
  playing,
  onEnded,
  songId,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const onEndedRef = useRef(onEnded);
  const playingRef = useRef(playing);
  const videoRef = useRef(videoId);

  const currentSongRef = useRef<string | null>(null);
  const endedRef = useRef(false);
  const readyRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Preparando player...");
  const [error, setError] = useState("");

  const identity = songId ?? videoId;

  onEndedRef.current = onEnded;
  playingRef.current = playing;
  videoRef.current = videoId;

  // Monta o player uma única vez.
  useEffect(() => {
    let cancelled = false;
    let instance: any = null;

    const initialize = async () => {
      try {
        await loadYoutubeApi();

        if (
          cancelled ||
          !containerRef.current ||
          !window.YT?.Player
        ) {
          return;
        }

        const target = document.createElement("div");

        target.style.width = "100%";
        target.style.height = "100%";

        containerRef.current.appendChild(target);

        instance = new window.YT.Player(target, {
          width: "100%",
          height: "100%",
          playerVars: {
            controls: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (event: any) => {
              if (cancelled) return;

              playerRef.current = event.target;
              readyRef.current = true;
              setReady(true);
              setStatus("Player pronto");
            },

            onStateChange: (event: any) => {
              if (cancelled) return;

              switch (event.data) {
                case window.YT.PlayerState.PLAYING:
                  setStatus("Reproduzindo");
                  setError("");
                  break;

                case window.YT.PlayerState.PAUSED:
                  setStatus("Pausado");
                  break;

                case window.YT.PlayerState.BUFFERING:
                  setStatus("Carregando vídeo...");
                  break;

                case window.YT.PlayerState.ENDED:
                  if (!endedRef.current) {
                    endedRef.current = true;
                    setStatus("Música finalizada");

                    onEndedRef.current();
                  }
                  break;
              }
            },

            onError: (event: any) => {
              if (cancelled) return;

              const code = event.data;

              if (code === 100) {
                setError("Vídeo indisponível ou removido.");
              } else if (code === 101 || code === 150) {
                setError(
                  "Este vídeo não permite reprodução incorporada."
                );
              } else {
                setError(`Erro do YouTube: ${code}`);
              }
            },
          },
        });
      } catch (err) {
        if (!cancelled) {
          console.error("[KAIOKÊ] Player:", err);
          setError("Não foi possível iniciar o player.");
        }
      }
    };

    initialize();

    return () => {
      cancelled = true;
      readyRef.current = false;

      try {
        instance?.destroy();
      } catch {
        // O navegador pode já ter removido o iframe.
      }

      playerRef.current = null;
    };
  }, []);

  // Troca o vídeo sem desmontar o iframe.
  useEffect(() => {
    if (!ready || !playerRef.current) return;

    const player = playerRef.current;
    const selected = identity ?? null;

    try {
      if (!videoId) {
        player.stopVideo();
        currentSongRef.current = null;
        endedRef.current = false;
        setStatus("Aguardando música...");
        return;
      }

      if (currentSongRef.current !== selected) {
        currentSongRef.current = selected;
        endedRef.current = false;

        setError("");
        setStatus("Carregando nova música...");

        console.log("[KAIOKÊ] Trocando vídeo:", videoId);

        if (playing) {
          player.loadVideoById(videoId);
        } else {
          player.cueVideoById(videoId);
        }

        return;
      }

      if (playing) {
        player.playVideo();
      } else {
        player.pauseVideo();
      }
    } catch (err) {
      console.error("[KAIOKÊ] Erro ao trocar vídeo:", err);
      setError("Erro ao carregar a próxima música.");
    }
  }, [identity, videoId, playing, ready]);

  const playManually = () => {
    try {
      if (!playerRef.current || !videoId) return;

      const player = playerRef.current;

      if (currentSongRef.current !== identity) {
        currentSongRef.current = identity ?? null;
        endedRef.current = false;
        player.loadVideoById(videoId);
      } else {
        player.playVideo();
      }

      setError("");
    } catch (err) {
      console.error(err);
      setError("Não foi possível reproduzir o vídeo.");
    }
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 300,
        background: "#090612",
        overflow: "hidden",
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          inset: 0,
        }}
      />

      {!videoId && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#100b1e",
            color: "#d8b4fe",
            pointerEvents: "none",
          }}
        >
          🎤 Aguardando a próxima música...
        </div>
      )}

      {videoId && (
        <div
          style={{
            position: "absolute",
            left: 12,
            top: 12,
            padding: "6px 12px",
            borderRadius: 8,
            background: "rgba(0,0,0,0.72)",
            color: "white",
            fontSize: 12,
            pointerEvents: "none",
            zIndex: 2,
          }}
        >
          {status}
        </div>
      )}

      {error && (
        <div
          style={{
            position: "absolute",
            bottom: 70,
            left: 12,
            right: 12,
            background: "#7f1d1d",
            color: "white",
            borderRadius: 10,
            padding: 14,
            zIndex: 5,
          }}
        >
          {error}
        </div>
      )}

      {videoId && ready && (
        <button
          type="button"
          onClick={playManually}
          style={{
            position: "absolute",
            bottom: 14,
            right: 14,
            background: "#9333ea",
            color: "white",
            padding: "11px 18px",
            border: "none",
            borderRadius: 10,
            fontWeight: 700,
            cursor: "pointer",
            zIndex: 5,
          }}
        >
          ▶ Iniciar vídeo
        </button>
      )}
    </div>
  );
}
