
"use client";

import { useMemo } from "react";
import { Mic2, Sparkles, Star } from "lucide-react";

type Props = {
  singer: string;
  songTitle: string;
};

const reviews: Record<number, string[]> = {
  1: [
    "DÓ... DÓ DE QUEM OUVIU! 😂",
    "O microfone pediu demissão!",
    "Até o silêncio cantaria melhor!"
  ],
  2: [
    "A música entrou em depressão!",
    "O vizinho já chamou a polícia musical!",
    "O tom saiu e não voltou mais!"
  ],
  3: [
    "O importante é participar... eu acho!",
    "A afinação saiu para comprar pão!",
    "Foi uma experiência. Não necessariamente musical!"
  ],
  4: [
    "O microfone sobreviveu. Por pouco!",
    "A coragem foi 10. A afinação, nem tanto!",
    "O cantor original sentiu uma perturbação na força!"
  ],
  5: [
    "Meio artista, meio ameaça sonora!",
    "O público está dividido entre aplaudir e fugir!",
    "Cantou com o coração. Porque com a voz..."
  ],
  6: [
    "Não foi Grammy, mas deu para o gasto!",
    "Quase afinado! Quase mesmo!",
    "O chuveiro aprovaria essa apresentação!"
  ],
  7: [
    "NA PRÓXIMA VOCÊ PODE MELHORAR! 😂",
    "Foi bom! O autotune só precisaria de férias!",
    "Já pode cantar no churrasco da família!"
  ],
  8: [
    "OLHA O TALENTO ESCONDIDO AÍ!",
    "O público pediu bis! Ou foi pizza?",
    "Quase uma estrela! Só falta o contrato!"
  ],
  9: [
    "O THE VOICE ESTÁ TE PROCURANDO!",
    "O microfone acabou de pedir seu autógrafo!",
    "Nasceu uma estrela do karaokê!"
  ],
  10: [
    "LENDA ABSOLUTA DO KAIOKÊ!",
    "O palco é seu! Pode cobrar ingresso!",
    "A plateia enlouqueceu! QUE SHOW!"
  ]
};

export default function KaraokeScore({
  singer,
  songTitle,
}: Props) {
  const result = useMemo(() => {
    const score = Math.floor(Math.random() * 10) + 1;
    const phrases = reviews[score];

    return {
      score,
      phrase: phrases[
        Math.floor(Math.random() * phrases.length)
      ],
    };
  }, []);

  const color =
    result.score >= 9 ? "#34d399" :
    result.score >= 7 ? "#c084fc" :
    result.score >= 5 ? "#fbbf24" :
    "#fb7185";

  return (
    <div className="score-overlay">
      <div className="score-confetti">
        {Array.from({ length: 24 }, (_, i) => (
          <span
            key={i}
            style={{
              left: `${(i * 37) % 100}%`,
              animationDelay: `${(i % 8) * 0.2}s`,
              color: i % 2 ? "#ec4899" : "#a855f7",
            }}
          >
            {i % 3 === 0 ? "♫" : "✦"}
          </span>
        ))}
      </div>

      <div className="score-content">
        <div className="score-label">
          <Sparkles size={18} />
          KAIOKÊ AWARDS
          <Sparkles size={18} />
        </div>

        <Mic2 size={34} color="#e9d5ff" />

        <p className="score-singer">{singer}</p>

        <div
          className="score-number"
          style={{ color }}
        >
          {result.score}
          <small>/10</small>
        </div>

        <div className="score-stars">
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              size={23}
              fill={i < Math.ceil(result.score / 2)
                ? color : "transparent"}
              color={color}
            />
          ))}
        </div>

        <h2>{result.phrase}</h2>

        <p className="score-song">
          {songTitle}
        </p>

        <div className="score-next">
          Próxima atração em instantes...
        </div>

        <p className="score-disclaimer">
          Nota da sorte · Só pela diversão!
        </p>
      </div>

      <style jsx>{`
        .score-overlay {
          position: absolute;
          inset: 0;
          z-index: 50;
          display: grid;
          place-items: center;
          overflow: hidden;
          background:
            radial-gradient(
              circle at center,
              #37145c 0%,
              #150a2e 55%,
              #080513 100%
            );
          color: white;
          text-align: center;
          padding: 24px;
        }

        .score-content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          animation: scoreEnter 0.7s ease-out both;
        }

        .score-label {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #f0abfc;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 0.2em;
        }

        .score-singer {
          font-size: 20px;
          font-weight: 700;
        }

        .score-number {
          font-size: clamp(95px, 15vw, 170px);
          line-height: 1;
          font-weight: 1000;
          text-shadow: 0 0 45px currentColor;
          animation: scorePulse 1.5s ease-in-out infinite;
        }

        .score-number small {
          font-size: 25px;
          color: white;
        }

        .score-stars {
          display: flex;
          gap: 8px;
        }

        .score-content h2 {
          font-size: clamp(18px, 3vw, 30px);
          max-width: 580px;
          font-weight: 900;
          line-height: 1.2;
          color: #fff;
        }

        .score-song {
          max-width: 500px;
          font-size: 13px;
          color: #c4b5d9;
        }

        .score-next {
          margin-top: 14px;
          padding: 11px 22px;
          border-radius: 30px;
          background: rgba(168, 85, 247, 0.2);
          border: 1px solid rgba(216, 180, 254, 0.3);
          font-weight: 700;
          font-size: 13px;
        }

        .score-disclaimer {
          font-size: 11px;
          color: #a99dbd;
        }

        .score-confetti span {
          position: absolute;
          top: -35px;
          font-size: 26px;
          animation: scoreFall 5s linear infinite;
          opacity: 0.65;
        }

        @keyframes scoreEnter {
          from {
            opacity: 0;
            transform: scale(0.7) translateY(30px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes scorePulse {
          50% { transform: scale(1.07); }
        }

        @keyframes scoreFall {
          to {
            transform: translateY(110vh) rotate(360deg);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .score-content,
          .score-number,
          .score-confetti span {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
