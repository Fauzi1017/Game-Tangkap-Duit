import { useState } from 'react';
import { useNavigate } from 'react-router';

const DURATION_OPTIONS = [30, 45, 60, 90, 120];

export default function SetupPage() {
  const navigate = useNavigate();
  const [numPlayers, setNumPlayers] = useState(2);
  const [totalPrize, setTotalPrize] = useState(500000);
  const [duration, setDuration] = useState(60);
  const [prizeInput, setPrizeInput] = useState('500000');

  const handlePrizeChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    setPrizeInput(cleaned);
    setTotalPrize(Number(cleaned) || 0);
  };

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  const handleStart = () => {
    if (numPlayers < 1 || totalPrize < 1000) return;
    navigate('/game', { state: { numPlayers, totalPrize, duration } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center p-4">
      {/* Floating coins background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {['💰', '🪙', '💵', '💎', '🤑', '💰', '🪙', '💵'].map((emoji, i) => (
          <div
            key={i}
            className="absolute text-4xl opacity-10 animate-bounce"
            style={{
              left: `${10 + i * 12}%`,
              top: `${5 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.4}s`,
              animationDuration: `${2 + i * 0.3}s`,
            }}
          >
            {emoji}
          </div>
        ))}
      </div>

      <div className="relative w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-7xl mb-3">🎮</div>
          <h1 className="text-white text-5xl mb-2" style={{ textShadow: '0 0 30px rgba(255,215,0,0.8)' }}>
            Tangkap Duit!
          </h1>
          <p className="text-yellow-300/80 text-lg">Tangkap uang sebanyak mungkin sebelum waktu habis!</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
          {/* Number of Players */}
          <div className="mb-7">
            <label className="text-white/90 text-sm uppercase tracking-wider mb-3 block">
              👥 Jumlah Pemain
            </label>
            <div className="flex items-center justify-between bg-white/10 rounded-2xl p-3">
              <button
                onClick={() => setNumPlayers(p => Math.max(1, p - 1))}
                className="w-12 h-12 rounded-xl bg-white/20 hover:bg-white/30 text-white text-2xl transition-all flex items-center justify-center"
              >
                −
              </button>
              <div className="text-center">
                <div className="text-white text-5xl font-bold">{numPlayers}</div>
                <div className="text-white/50 text-xs">pemain</div>
              </div>
              <button
                onClick={() => setNumPlayers(p => Math.min(10, p + 1))}
                className="w-12 h-12 rounded-xl bg-white/20 hover:bg-white/30 text-white text-2xl transition-all flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>

          {/* Total Prize */}
          <div className="mb-7">
            <label className="text-white/90 text-sm uppercase tracking-wider mb-3 block">
              💰 Total Hadiah
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-400 font-bold">Rp</span>
              <input
                type="text"
                value={prizeInput}
                onChange={e => handlePrizeChange(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-2xl pl-12 pr-4 py-4 text-white text-xl focus:outline-none focus:border-yellow-400/60 focus:bg-white/15 transition-all"
                placeholder="500000"
              />
            </div>
            {totalPrize > 0 && (
              <p className="text-yellow-300/70 text-sm mt-2 text-center">{formatRupiah(totalPrize)}</p>
            )}
          </div>

          {/* Duration */}
          <div className="mb-8">
            <label className="text-white/90 text-sm uppercase tracking-wider mb-3 block">
              ⏱️ Durasi per Pemain
            </label>
            <div className="grid grid-cols-5 gap-2">
              {DURATION_OPTIONS.map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`py-3 rounded-xl text-sm transition-all ${
                    duration === d
                      ? 'bg-yellow-400 text-gray-900 shadow-lg shadow-yellow-400/30'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white/5 rounded-2xl p-4 mb-6 grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-white/50 text-xs">Pemain</div>
              <div className="text-white text-xl font-bold">{numPlayers}</div>
            </div>
            <div>
              <div className="text-white/50 text-xs">Durasi Total</div>
              <div className="text-white text-xl font-bold">{numPlayers * duration}s</div>
            </div>
            <div>
              <div className="text-white/50 text-xs">Per Pemain</div>
              <div className="text-white text-xl font-bold">{duration}s</div>
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStart}
            disabled={numPlayers < 1 || totalPrize < 1000}
            className="w-full py-5 rounded-2xl text-gray-900 text-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #FFD700, #FFA500)',
              boxShadow: '0 0 30px rgba(255, 215, 0, 0.4)',
              fontWeight: 'bold',
            }}
          >
            🎮 Mulai Game!
          </button>

          {totalPrize < 1000 && (
            <p className="text-red-400 text-xs text-center mt-2">Total hadiah minimal Rp 1.000</p>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          {[
            { icon: '🪙', label: 'Rp 1.000', desc: 'Koin Perunggu', color: '#CD853F' },
            { icon: '🥈', label: 'Rp 2.000', desc: 'Koin Perak', color: '#C0C0C0' },
            { icon: '🥇', label: 'Rp 5.000', desc: 'Koin Emas', color: '#FFD700' },
          ].map(item => (
            <div key={item.label} className="bg-white/5 rounded-2xl p-3">
              <div className="text-2xl mb-1">{item.icon}</div>
              <div className="text-sm" style={{ color: item.color }}>{item.label}</div>
              <div className="text-white/40 text-xs">{item.desc}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-center">
          <div className="bg-red-500/20 rounded-2xl p-3 inline-block">
            <span className="text-red-400">💣 Bom</span>
            <span className="text-white/60 text-sm ml-2">— Kena bom, skor jadi 0!</span>
          </div>
        </div>
      </div>
    </div>
  );
}
