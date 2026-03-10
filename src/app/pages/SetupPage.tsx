import { useState } from 'react';
import { useNavigate } from 'react-router';

const DURATION_OPTIONS = [30, 45, 60, 90, 120];

// The realistic Indonesian paper money denominations
const PECAHAN_OPTIONS = [
  { value: 1000, label: 'Rp 1K', color: '#B3C2B1', border: '#70836D', icon: '💸' },
  { value: 2000, label: 'Rp 2K', color: '#D4C7BA', border: '#9E8D7D', icon: '💸' },
  { value: 5000, label: 'Rp 5K', color: '#D2B980', border: '#9E823E', icon: '💸' },
  { value: 10000, label: 'Rp 10K', color: '#A08BBF', border: '#604A81', icon: '💜' },
  { value: 20000, label: 'Rp 20K', color: '#88B89C', border: '#4E7C62', icon: '💚' },
  { value: 50000, label: 'Rp 50K', color: '#5B90C9', border: '#335A85', icon: '💙' },
  { value: 100000, label: 'Rp 100K', color: '#C66C6A', border: '#8A3B39', icon: '❤️' },
];

export default function SetupPage() {
  const navigate = useNavigate();
  const [numPlayers, setNumPlayers] = useState(2);
  const [totalPrize, setTotalPrize] = useState(500000);
  const [duration, setDuration] = useState(60);
  const [prizeInput, setPrizeInput] = useState('500000');
  
  // Default to all checked initially
  const [selectedPecahan, setSelectedPecahan] = useState<number[]>(PECAHAN_OPTIONS.map(p => p.value));

  const handlePrizeChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    setPrizeInput(cleaned);
    setTotalPrize(Number(cleaned) || 0);
  };

  const togglePecahan = (val: number) => {
    setSelectedPecahan(prev => {
      if (prev.includes(val)) {
        // Prevent deselecting everything
        if (prev.length <= 1) return prev;
        return prev.filter(p => p !== val);
      } else {
        return [...prev, val].sort((a, b) => a - b);
      }
    });
  };

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  const handleStart = () => {
    if (numPlayers < 1 || totalPrize < 1000 || selectedPecahan.length === 0) return;
    navigate('/game', { state: { numPlayers, totalPrize, duration, selectedPecahan } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex flex-col items-center justify-center p-4 py-10 overflow-y-auto">
      {/* Floating coins background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {['💸', '💵', '💴', '💶', '💷', '💸', '💵', '💰'].map((emoji, i) => (
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

      <div className="relative w-full max-w-xl z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-7xl mb-3">🎮</div>
          <h1 className="text-white text-5xl mb-2" style={{ textShadow: '0 0 30px rgba(255,215,0,0.8)' }}>
            Tangkap Duit!
          </h1>
          <p className="text-yellow-300/80 text-lg">Tangkap uang sebanyak mungkin tanpa terkena bom!</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            {/* Number of Players */}
            <div>
              <label className="text-white/90 text-sm uppercase tracking-wider mb-3 block">
                👥 Jumlah Pemain
              </label>
              <div className="flex items-center justify-between bg-white/10 rounded-2xl p-3 h-[88px]">
                <button
                  onClick={() => setNumPlayers(p => Math.max(1, p - 1))}
                  className="w-12 h-12 rounded-xl bg-white/20 hover:bg-white/30 text-white text-2xl transition-all flex items-center justify-center"
                >
                  −
                </button>
                <div className="text-center">
                  <div className="text-white text-4xl font-bold">{numPlayers}</div>
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
            <div>
              <label className="text-white/90 text-sm uppercase tracking-wider mb-3 block">
                💰 Total Hadiah
              </label>
              <div className="relative h-[88px] flex flex-col justify-center">
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
                  <p className="text-yellow-300/70 text-xs mt-1 text-center absolute -bottom-5 left-0 right-0">{formatRupiah(totalPrize)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Pecahan */}
          <div className="mb-7">
            <label className="text-white/90 text-sm uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>💷 Pecahan Uang</span>
              <span className="text-xs text-white/50 lowercase normal-case">(Pilih minimal 1)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {PECAHAN_OPTIONS.map(pecahan => {
                const isSelected = selectedPecahan.includes(pecahan.value);
                return (
                  <button
                    key={pecahan.value}
                    onClick={() => togglePecahan(pecahan.value)}
                    className={`flex-1 min-w-[30%] py-2 px-1 rounded-xl text-xs sm:text-sm font-bold transition-all border-2`}
                    style={{
                      background: isSelected ? pecahan.color : 'rgba(255,255,255,0.05)',
                      color: isSelected ? '#fff' : 'rgba(255,255,255,0.4)',
                      borderColor: isSelected ? pecahan.border : 'rgba(255,255,255,0.1)',
                      boxShadow: isSelected ? `0 0 10px ${pecahan.color}80` : 'none',
                      textShadow: isSelected ? '1px 1px 2px rgba(0,0,0,0.5)' : 'none'
                    }}
                  >
                    {pecahan.label}
                  </button>
                );
              })}
            </div>
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
          <div className="bg-white/5 rounded-2xl p-4 mb-6 flex justify-between gap-3 text-center">
            <div className="flex-1">
              <div className="text-white/50 text-[10px] sm:text-xs">Pemain</div>
              <div className="text-white text-lg sm:text-xl font-bold">{numPlayers}</div>
            </div>
            <div className="flex-1 border-l border-white/10">
              <div className="text-white/50 text-[10px] sm:text-xs">Uang</div>
              <div className="text-yellow-300 text-sm sm:text-base font-bold mt-1 max-w-[80px] mx-auto truncate" title={selectedPecahan.length + ' dipilih'}>
                {selectedPecahan.length} jenis
              </div>
            </div>
            <div className="flex-1 border-l border-white/10">
              <div className="text-white/50 text-[10px] sm:text-xs">Waktu</div>
              <div className="text-white text-lg sm:text-xl font-bold">{duration}s</div>
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStart}
            disabled={numPlayers < 1 || totalPrize < 1000 || selectedPecahan.length === 0}
            className="w-full py-5 rounded-2xl text-gray-900 text-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #FFD700, #FFA500)',
              boxShadow: '0 0 30px rgba(255, 215, 0, 0.4)',
              fontWeight: 'bold',
            }}
          >
            🎮 Mulai Game!
          </button>

          {totalPrize < 1000 && (
            <p className="text-red-400 text-xs text-center mt-3">Total hadiah minimal Rp 1.000</p>
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 text-center">
          <div className="bg-red-500/20 rounded-2xl p-3 inline-flex items-center">
            <span className="text-red-400 text-2xl mr-2">💣</span>
            <div className="text-left leading-tight">
              <div className="text-red-300 font-bold">Awas Bom!</div>
              <div className="text-white/60 text-xs">Kena bom, skormu hangus jadi 0!</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
