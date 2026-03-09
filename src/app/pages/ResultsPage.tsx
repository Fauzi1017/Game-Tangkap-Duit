import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';

interface ResultEntry {
  player: number;
  score: number;
  prize: number;
  rank: number;
}

const RANK_STYLE: Record<number, { emoji: string; color: string; bg: string; glow: string }> = {
  1: { emoji: '🥇', color: '#FFD700', bg: 'rgba(255,215,0,0.15)', glow: 'rgba(255,215,0,0.4)' },
  2: { emoji: '🥈', color: '#C0C0C0', bg: 'rgba(192,192,192,0.1)', glow: 'rgba(192,192,192,0.3)' },
  3: { emoji: '🥉', color: '#CD853F', bg: 'rgba(205,133,63,0.1)', glow: 'rgba(205,133,63,0.3)' },
};

// Confetti particle canvas
function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];

    const particles = Array.from({ length: 120 }, (_, i) => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height,
      w: 8 + Math.random() * 12,
      h: 4 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 2,
      vy: 2 + Math.random() * 4,
      rot: Math.random() * Math.PI * 2,
      dRot: (Math.random() - 0.5) * 0.15,
      shape: Math.random() < 0.4 ? 'circle' : 'rect',
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.dRot;
        if (p.y > canvas.height + 20) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

export default function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as any) || {};
  const scores: number[] = state.scores || [0];
  const numPlayers: number = state.numPlayers || scores.length;
  const totalPrize: number = state.totalPrize || 0;

  const totalScore = scores.reduce((a: number, b: number) => a + b, 0);

  // Build results in two steps to avoid TypeScript type issues in chaining
  type PartialResult = { player: number; score: number; prize: number };
  const partialResults: PartialResult[] = (scores as number[]).map((score, i) => ({
    player: i + 1,
    score,
    prize: Math.round(
      totalScore === 0
        ? totalPrize / numPlayers
        : (score / totalScore) * totalPrize
    ),
  }));
  partialResults.sort((a, b) => b.score - a.score);
  const results: ResultEntry[] = partialResults.map((r, i) => ({ ...r, rank: i + 1 }));

  const formatRp = (v: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

  const winner = results[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] relative">
      <ConfettiCanvas />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-8xl mb-3 animate-bounce">🏆</div>
          <h1 className="text-white text-5xl mb-2" style={{ textShadow: '0 0 40px rgba(255,215,0,0.6)' }}>
            Hasil Akhir!
          </h1>
          <p className="text-yellow-300/70 text-lg">
            Total Hadiah: <span className="text-yellow-300">{formatRp(totalPrize)}</span>
          </p>
        </div>

        {/* Winner spotlight */}
        {winner && (
          <div
            className="rounded-3xl p-8 text-center mb-6"
            style={{
              background: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,165,0,0.1))',
              border: '2px solid rgba(255,215,0,0.4)',
              boxShadow: '0 0 60px rgba(255,215,0,0.3)',
            }}
          >
            <div className="text-6xl mb-3">🥇</div>
            <div className="text-yellow-300/70 text-sm uppercase tracking-widest mb-1">Pemenang</div>
            <div className="text-white text-4xl mb-1" style={{ fontWeight: 'bold' }}>
              Pemain {winner.player}
            </div>
            <div className="text-yellow-300 text-3xl mb-4" style={{ fontWeight: 'bold' }}>
              {formatRp(winner.score)}
            </div>
            <div
              className="inline-block rounded-2xl px-6 py-3"
              style={{ background: 'rgba(255,215,0,0.2)', border: '1px solid rgba(255,215,0,0.4)' }}
            >
              <div className="text-yellow-300/70 text-xs uppercase tracking-wider mb-1">Hadiah</div>
              <div className="text-yellow-300 text-2xl" style={{ fontWeight: 'bold' }}>
                {formatRp(winner.prize)}
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div
          className="rounded-3xl overflow-hidden mb-6"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-white text-xl" style={{ fontWeight: 'bold' }}>📊 Papan Skor</h2>
          </div>

          {results.map((r, idx) => {
            const rs = RANK_STYLE[r.rank] || { emoji: `${r.rank}`, color: '#aaa', bg: 'rgba(255,255,255,0.02)', glow: 'transparent' };
            const scorePercent = totalScore > 0 ? (r.score / totalScore) * 100 : 0;

            return (
              <div
                key={r.player}
                className="px-6 py-5 border-b border-white/5 last:border-0"
                style={{ background: idx === 0 ? rs.bg : undefined }}
              >
                <div className="flex items-center gap-4 mb-3">
                  {/* Rank */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0"
                    style={{ background: rs.bg, border: `2px solid ${rs.color}44` }}
                  >
                    {r.rank <= 3 ? rs.emoji : <span style={{ color: rs.color }}>{r.rank}</span>}
                  </div>

                  {/* Player info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <div style={{ color: r.rank === 1 ? '#FFD700' : '#fff' }}>
                        Pemain {r.player}
                      </div>
                      <div style={{ color: rs.color, fontWeight: 'bold' }}>
                        {formatRp(r.score)}
                      </div>
                    </div>

                    {/* Score bar */}
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${scorePercent}%`,
                          background: r.rank === 1
                            ? 'linear-gradient(90deg, #FFD700, #FFA500)'
                            : r.rank === 2
                              ? 'linear-gradient(90deg, #C0C0C0, #A0A0A0)'
                              : r.rank === 3
                                ? 'linear-gradient(90deg, #CD853F, #8B4513)'
                                : 'linear-gradient(90deg, #6080FF, #4060CC)',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Prize */}
                <div className="ml-16 flex items-center gap-2">
                  <span className="text-white/40 text-sm">Hadiah:</span>
                  <span className="text-green-400 text-sm" style={{ fontWeight: 'bold' }}>
                    {formatRp(r.prize)}
                  </span>
                  {totalScore > 0 && (
                    <span className="text-white/30 text-xs">
                      ({scorePercent.toFixed(1)}% skor)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Total summary */}
        <div
          className="rounded-2xl p-5 mb-6"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-white/40 text-xs uppercase mb-1">Total Koin</div>
              <div className="text-white text-xl" style={{ fontWeight: 'bold' }}>
                {formatRp(totalScore)}
              </div>
            </div>
            <div>
              <div className="text-white/40 text-xs uppercase mb-1">Total Hadiah</div>
              <div className="text-yellow-300 text-xl" style={{ fontWeight: 'bold' }}>
                {formatRp(totalPrize)}
              </div>
            </div>
            <div>
              <div className="text-white/40 text-xs uppercase mb-1">Pemain</div>
              <div className="text-white text-xl" style={{ fontWeight: 'bold' }}>{numPlayers}</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-4 rounded-2xl text-white text-lg transition-all"
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              fontWeight: 'bold',
            }}
          >
            🔧 Setup Baru
          </button>
          <button
            onClick={() => navigate('/game', { state: state })}
            className="flex-1 py-4 rounded-2xl text-gray-900 text-lg transition-all"
            style={{
              background: 'linear-gradient(135deg, #FFD700, #FFA500)',
              boxShadow: '0 0 20px rgba(255,200,0,0.3)',
              fontWeight: 'bold',
            }}
          >
            🎮 Main Lagi!
          </button>
        </div>
      </div>
    </div>
  );
}