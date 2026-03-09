import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as poseDetection from '@tensorflow-models/pose-detection';

// ─── Types ────────────────────────────────────────────────────────────────────
interface FallingObject {
  id: number;
  x: number;
  y: number;
  type: 'coin' | 'bomb';
  value: number;
  vy: number;
  rotation: number;
  dRotation: number;
  size: number;
}

interface ScorePopup {
  id: number;
  x: number;
  y: number;
  value: number;
  alpha: number;
  vy: number;
}

type Phase = 'loading' | 'intro' | 'countdown' | 'playing' | 'transition' | 'done';

// ─── Canvas drawing helpers (module-level, no closure issues) ─────────────────
function drawCoin(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  value: number,
  rotation: number,
  size: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  const cfgs: Record<number, { bg: string; border: string; textColor: string; label: string }> = {
    1000: { bg: '#CD853F', border: '#8B4513', textColor: '#5C2A0A', label: 'Rp1K' },
    2000: { bg: '#B8B8B8', border: '#808080', textColor: '#333', label: 'Rp2K' },
    5000: { bg: '#FFD700', border: '#B8860B', textColor: '#7A5500', label: 'Rp5K' },
  };
  const c = cfgs[value] ?? cfgs[1000];

  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 5;

  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fillStyle = c.bg;
  ctx.fill();

  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = c.border;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, size * 0.82, 0, Math.PI * 2);
  ctx.strokeStyle = c.border + '44';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Shine
  const grad = ctx.createRadialGradient(-size * 0.25, -size * 0.3, 0, -size * 0.25, -size * 0.3, size * 0.65);
  grad.addColorStop(0, 'rgba(255,255,255,0.65)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.fillStyle = c.textColor;
  ctx.font = `bold ${Math.floor(size * 0.42)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(c.label, 0, 0);

  ctx.restore();
}

function drawBomb(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  ctx.translate(x, y);

  ctx.shadowColor = '#FF3300';
  ctx.shadowBlur = 25;

  ctx.beginPath();
  ctx.arc(0, size * 0.1, size, 0, Math.PI * 2);
  ctx.fillStyle = '#222';
  ctx.fill();
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.shadowBlur = 0;

  ctx.save();
  ctx.strokeStyle = '#A07840';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(size * 0.25, -size * 0.85);
  ctx.bezierCurveTo(size * 0.55, -size * 1.3, size * 0.75, -size * 1.0, size * 0.65, -size * 0.6);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#FFD700';
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(size * 0.65, -size * 0.6, size * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.font = `${Math.floor(size * 1.3)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('💣', 0, size * 0.1);

  ctx.restore();
}

function drawBowl(ctx: CanvasRenderingContext2D, x: number, y: number, bw: number, playerIdx: number) {
  const colors = [
    { fill: 'rgba(80,180,255,0.18)', stroke: 'rgba(100,210,255,0.9)', rim: 'rgba(160,235,255,1.0)' },
    { fill: 'rgba(255,100,100,0.18)', stroke: 'rgba(255,100,100,0.9)', rim: 'rgba(255,160,160,1.0)' },
    { fill: 'rgba(100,255,100,0.18)', stroke: 'rgba(80,220,80,0.9)', rim: 'rgba(160,255,160,1.0)' },
    { fill: 'rgba(255,200,80,0.18)', stroke: 'rgba(255,180,50,0.9)', rim: 'rgba(255,220,100,1.0)' },
    { fill: 'rgba(200,100,255,0.18)', stroke: 'rgba(180,80,255,0.9)', rim: 'rgba(220,160,255,1.0)' },
  ];
  const c = colors[playerIdx % colors.length];

  const bh = bw * 0.33;
  ctx.save();

  ctx.shadowColor = c.stroke;
  ctx.shadowBlur = 22;

  ctx.beginPath();
  ctx.ellipse(x, y + bh * 0.15, bw / 2, bh / 2, 0, 0, Math.PI);
  ctx.fillStyle = c.fill;
  ctx.fill();
  ctx.strokeStyle = c.stroke;
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.moveTo(x - bw / 2, y);
  ctx.lineTo(x + bw / 2, y);
  ctx.strokeStyle = c.rim;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.fillStyle = c.rim;
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`P${playerIdx + 1}`, x, y + bh + 15);

  ctx.restore();
}

// ─── GamePage ─────────────────────────────────────────────────────────────────
export default function GamePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as any) || {};
  const numPlayers: number = state.numPlayers ?? 2;
  const totalPrize: number = state.totalPrize ?? 100000;
  const duration: number = state.duration ?? 60;

  const [phase, setPhase] = useState<Phase>('loading');
  const [displayScores, setDisplayScores] = useState<number[]>(new Array(numPlayers).fill(0));
  const [timeLeft, setTimeLeft] = useState(duration);
  const [countdownNum, setCountdownNum] = useState(3);
  const [bombFlash, setBombFlash] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Meminta akses kamera...');
  const [cameraError, setCameraError] = useState('');
  // 'camera' = full head tracking, 'mouse' = mouse/touch fallback
  const [controlMode, setControlMode] = useState<'camera' | 'mouse'>('camera');

  // ── Game refs (used in animation loop — no stale closures)
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<any>(null);
  const isPlayingRef = useRef(false);
  const isDetectingRef = useRef(false);
  const animFrameRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallingObjsRef = useRef<FallingObject[]>([]);
  const popupsRef = useRef<ScorePopup[]>([]);
  const bowlsRef = useRef<Array<{ x: number; y: number } | null>>(new Array(numPlayers).fill(null));
  const scoresRef = useRef<number[]>(new Array(numPlayers).fill(0));
  const nextSpawnTimeRef = useRef(0);
  const objIdRef = useRef(0);
  const popupIdRef = useRef(0);
  const controlModeRef = useRef<'camera' | 'mouse'>('camera');

  // Stable setter refs (avoid stale closures in game loop)
  const setDisplayScoresStable = useRef(setDisplayScores);
  const setBombFlashStable = useRef(setBombFlash);
  setDisplayScoresStable.current = setDisplayScores;
  setBombFlashStable.current = setBombFlash;

  // ── Refs for cross-callback calls (avoids hook ordering dependency issues)
  const finishTurnRef = useRef<() => void>(() => { });
  const startPlayingRef = useRef<() => void>(() => { });

  // ── Resize canvas
  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current;
      if (c) { c.width = window.innerWidth; c.height = window.innerHeight; }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // ── Mouse / touch fallback controls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!isPlayingRef.current || controlModeRef.current !== 'mouse') return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      const newBowls = [...bowlsRef.current];
      newBowls[0] = { x, y };
      bowlsRef.current = newBowls;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isPlayingRef.current || controlModeRef.current !== 'mouse') return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
      const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
      const newBowls = [...bowlsRef.current];
      newBowls[0] = { x, y };
      bowlsRef.current = newBowls;
    };

    window.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  // ── Camera setup — never blocks game start; falls back to mouse on failure
  const setupCamera = async (): Promise<'camera' | 'mouse'> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      const video = videoRef.current;
      if (!video) return 'mouse';
      video.srcObject = stream;
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => video.play().then(() => resolve()).catch(reject);
        video.onerror = reject;
      });
      return 'camera';
    } catch (e) {
      console.warn('Camera not available, switching to mouse control:', e);
      return 'mouse';
    }
  };

  // ── Detector setup
  const setupDetector = async (): Promise<boolean> => {
    try {
      setLoadingMsg('Memuat model AI pengenal wajah... (butuh beberapa detik)');
      await tf.setBackend('webgl');
      await tf.ready();
      detectorRef.current = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        { modelType: poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING }
      );
      return true;
    } catch (e) {
      console.error('Detector error:', e);
      setCameraError(String(e));
      return false;
    }
  };

  // ── Head detection loop
  const runDetection = useCallback(async () => {
    if (!isDetectingRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const detector = detectorRef.current;

    if (video && canvas && detector && video.readyState >= 2) {
      try {
        const poses = await detector.estimatePoses(video);
        if (poses.length > 0) {
          const vw = video.videoWidth || 640;
          const vh = video.videoHeight || 480;
          const cw = canvas.width;
          const ch = canvas.height;

          const mappedNoses = poses
            .map((p: any) => p.keypoints.find((k: any) => k.name === 'nose'))
            .filter((n: any) => n && n.score && n.score > 0.3)
            .map((n: any) => ({
              x: cw - ((n.x / vw) * cw),
              y: (n.y / vh) * ch + 150, // offset below nose
            }))
            .sort((a: { x: number; y: number }, b: { x: number; y: number }) => a.x - b.x); // sort left-to-right on canvas

          const newBowls = new Array(numPlayers).fill(null);
          for (let i = 0; i < Math.min(numPlayers, mappedNoses.length); i++) {
            newBowls[i] = mappedNoses[i];
          }
          bowlsRef.current = newBowls;
        }
      } catch (_) { /* ignore */ }
    }

    if (isDetectingRef.current) {
      setTimeout(runDetection, 50);
    }
  }, []);

  // ── Main game loop
  const gameLoop = useCallback((timestamp: number) => {
    if (!isPlayingRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;

    // Draw mirrored video
    if (video && video.readyState >= 2) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -W, 0, W, H);
      ctx.restore();
    } else {
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, W, H);
    }

    ctx.fillStyle = 'rgba(0,0,10,0.06)';
    ctx.fillRect(0, 0, W, H);

    // Spawn
    if (timestamp >= nextSpawnTimeRef.current) {
      nextSpawnTimeRef.current = timestamp + 700 + Math.random() * 1300;
      const isBomb = Math.random() < 0.15;
      const x = 70 + Math.random() * (W - 140);
      const baseSpeed = H / 220;
      let value = 1000, size = Math.floor(W * 0.027);
      if (!isBomb) {
        const r = Math.random();
        if (r < 0.1) { value = 5000; size = Math.floor(W * 0.043); }
        else if (r < 0.35) { value = 2000; size = Math.floor(W * 0.034); }
        else { value = 1000; size = Math.floor(W * 0.026); }
      } else {
        size = Math.floor(W * 0.032);
      }
      fallingObjsRef.current.push({
        id: objIdRef.current++, x, y: -size - 20,
        type: isBomb ? 'bomb' : 'coin', value,
        vy: baseSpeed * (1.5 + Math.random() * 2.5),
        rotation: Math.random() * Math.PI * 2,
        dRotation: (Math.random() - 0.5) * 0.08, size,
      });
    }

    // Update + collide + draw objects
    const BOWL_W = Math.max(140, Math.floor(W * 0.17));
    const survived: FallingObject[] = [];

    for (const obj of fallingObjsRef.current) {
      obj.y += obj.vy;
      obj.rotation += obj.dRotation;
      if (obj.y > H + 100) continue;

      let caughtBy = -1;

      for (let i = 0; i < numPlayers; i++) {
        const bowl = bowlsRef.current[i];
        if (bowl) {
          const inX = obj.x > bowl.x - BOWL_W / 1.5 - obj.size * 0.8
            && obj.x < bowl.x + BOWL_W / 1.5 + obj.size * 0.8;
          const inY = obj.y + obj.size * 0.5 > bowl.y - 50
            && obj.y - obj.size * 0.5 < bowl.y + 80;

          if (inX && inY) {
            caughtBy = i;
            break;
          }
        }
      }

      if (caughtBy !== -1) {
        if (obj.type === 'coin') {
          if (scoresRef.current[caughtBy] < totalPrize) {
            scoresRef.current[caughtBy] += obj.value;
            if (scoresRef.current[caughtBy] > totalPrize) {
              scoresRef.current[caughtBy] = totalPrize;
            }
            setDisplayScoresStable.current([...scoresRef.current]);
            popupsRef.current.push({
              id: popupIdRef.current++, x: obj.x, y: obj.y - 30,
              value: obj.value, alpha: 1.0, vy: -2.5,
            });
          }
        } else {
          scoresRef.current[caughtBy] = 0;
          setDisplayScoresStable.current([...scoresRef.current]);
          setBombFlashStable.current(true);
          setTimeout(() => setBombFlashStable.current(false), 600);
        }
      }

      if (caughtBy === -1) {
        survived.push(obj);
        if (obj.type === 'coin') drawCoin(ctx, obj.x, obj.y, obj.value, obj.rotation, obj.size);
        else drawBomb(ctx, obj.x, obj.y, obj.size);
      }
    }

    fallingObjsRef.current = survived;

    // Draw bowls
    for (let i = 0; i < numPlayers; i++) {
      const bowl = bowlsRef.current[i];
      if (bowl) {
        drawBowl(ctx, bowl.x, bowl.y, BOWL_W, i);
      }
    }

    // Score popups
    const alivePopups: ScorePopup[] = [];
    for (const p of popupsRef.current) {
      p.y += p.vy; p.alpha -= 0.022;
      if (p.alpha <= 0) continue;
      alivePopups.push(p);
      ctx.save();
      ctx.globalAlpha = p.alpha;
      const popColor = p.value === 5000 ? '#FFD700' : p.value === 2000 ? '#E0E0E0' : '#F4A460';
      ctx.font = `bold ${Math.floor(W * 0.022)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      ctx.strokeText(`+Rp${p.value.toLocaleString('id-ID')}`, p.x, p.y);
      ctx.fillStyle = popColor;
      ctx.fillText(`+Rp${p.value.toLocaleString('id-ID')}`, p.x, p.y);
      ctx.restore();
    }
    popupsRef.current = alivePopups;

    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, []);

  // ── Finish game
  const finishTurn = useCallback(() => {
    isPlayingRef.current = false;
    isDetectingRef.current = false;
    cancelAnimationFrame(animFrameRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    setPhase('done');
    setTimeout(() => {
      navigate('/results', {
        state: { scores: [...scoresRef.current], numPlayers, totalPrize },
      });
    }, 2500);
  }, [numPlayers, navigate, totalPrize]);

  // Keep finishTurn in a ref so startPlaying can call it without dep issues
  finishTurnRef.current = finishTurn;

  // ── Start playing
  const startPlaying = useCallback(() => {
    scoresRef.current = new Array(numPlayers).fill(0);
    setDisplayScores([...scoresRef.current]);
    fallingObjsRef.current = [];
    popupsRef.current = [];
    nextSpawnTimeRef.current = 0;

    // Start bowls spread out at the bottom
    const initialBowls = new Array(numPlayers).fill(null);
    for (let i = 0; i < numPlayers; i++) {
      initialBowls[i] = {
        x: (window.innerWidth / (numPlayers + 1)) * (i + 1),
        y: window.innerHeight - 150
      };
    }
    bowlsRef.current = initialBowls;

    isPlayingRef.current = true;
    isDetectingRef.current = true;
    setTimeLeft(duration);
    setPhase('playing');

    animFrameRef.current = requestAnimationFrame(gameLoop);
    runDetection();

    let t = duration;
    timerRef.current = setInterval(() => {
      t--;
      setTimeLeft(t);
      if (t <= 0) {
        clearInterval(timerRef.current!);
        finishTurnRef.current(); // use ref to avoid ordering issues
      }
    }, 1000);
  }, [duration, gameLoop, runDetection]);

  // Keep startPlaying in a ref so startCountdown's setTimeout can call it
  startPlayingRef.current = startPlaying;

  // ── Countdown then start
  const startCountdown = useCallback(() => {
    setPhase('countdown');
    let count = 3;
    setCountdownNum(3);
    const tick = () => {
      count--;
      setCountdownNum(count);
      if (count > 0) {
        setTimeout(tick, 1000);
      } else {
        // count == 0 → "GO!"
        setTimeout(() => startPlayingRef.current(), 750);
      }
    };
    setTimeout(tick, 1000);
  }, []);

  // Removing goToNextPlayer as we play simultaneously
  // ── Initialization
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const camMode = await setupCamera();
      if (cancelled) return;

      if (camMode === 'camera') {
        // Camera available — load hand detector
        const detOk = await setupDetector();
        if (cancelled) return;
        if (!detOk) {
          // Detector failed — fall back to mouse control but still show camera
          controlModeRef.current = 'mouse';
          setControlMode('mouse');
        } else {
          controlModeRef.current = 'camera';
          setControlMode('camera');
        }
      } else {
        // Camera not available — skip TF.js entirely, use mouse/touch
        controlModeRef.current = 'mouse';
        setControlMode('mouse');
        setLoadingMsg('Kamera tidak tersedia. Beralih ke mode mouse/touch...');
        await new Promise(r => setTimeout(r, 800)); // brief pause to show message
      }

      if (!cancelled) setPhase('intro');
    };

    init();

    return () => {
      cancelled = true;
      isPlayingRef.current = false;
      isDetectingRef.current = false;
      cancelAnimationFrame(animFrameRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      const video = videoRef.current;
      if (video?.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // ── Helpers
  const formatRp = (v: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);
  const timerColor = timeLeft <= 10 ? '#FF4444' : timeLeft <= 20 ? '#FFAA00' : '#00FF88';

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <video ref={videoRef} className="absolute opacity-[0.01] pointer-events-none w-[1px] h-[1px] -z-10" muted playsInline />
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Bomb flash */}
      {bombFlash && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'rgba(255,0,0,0.45)', animation: 'pulse 0.3s ease-out' }} />
      )}

      {/* ── LOADING ── */}
      {phase === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]">
          <div className="text-8xl mb-6 animate-bounce">🎮</div>
          <h1 className="text-white text-4xl mb-3">Tangkap Duit!</h1>
          {cameraError ? (
            <div className="text-center max-w-sm px-4">
              <div className="text-red-400 text-base mb-6">❌ {cameraError}</div>
              <button
                onClick={() => navigate('/')}
                className="bg-yellow-400 text-gray-900 px-8 py-3 rounded-2xl"
                style={{ fontWeight: 'bold' }}
              >
                Kembali ke Setup
              </button>
            </div>
          ) : (
            <>
              <p className="text-white/70 text-base mb-8 text-center max-w-xs px-4">{loadingMsg}</p>
              <div className="flex gap-2">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-4 h-4 rounded-full bg-yellow-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── INTRO ── */}
      {phase === 'intro' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
          <div
            className="bg-white/10 border border-white/20 rounded-3xl p-8 text-center w-full max-w-md mx-4"
            style={{ boxShadow: '0 0 60px rgba(255,215,0,0.2)' }}
          >
            <div className="text-5xl mb-3">🏆</div>
            <div className="text-yellow-400/80 text-sm uppercase tracking-widest mb-1">Cara Bermain</div>
            <div className="text-white text-4xl mb-2" style={{ fontWeight: 'bold' }}>
              {numPlayers} Pemain Sekaligus!
            </div>
            <div className="text-white/60 mb-6">
              Durasi: <span className="text-yellow-300">{duration} detik</span><br />
              Target Maksimal: <span className="text-yellow-300">{formatRp(totalPrize)}</span>
            </div>

            <div className="bg-white/5 rounded-2xl p-4 mb-6 text-left text-sm space-y-2">
              <div className="text-white/80">🪙 Tangkap koin dengan mangkok — ikuti gerakan kepalamu!</div>
              <div className="text-white/80">🏃 Posisi kiri ke kanan berdasar posisi kalian di layar!</div>
              <div className="text-white/80">💣 Hindari <strong>bom</strong> — murni jadi 0!</div>
            </div>

            <button
              onClick={startCountdown}
              className="w-full py-5 rounded-2xl text-gray-900 text-xl transition-transform hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                boxShadow: '0 0 30px rgba(255,200,0,0.5)',
                fontWeight: 'bold',
              }}
            >
              🎮 SIAP!
            </button>
          </div>
        </div>
      )}

      {/* ── COUNTDOWN ── */}
      {phase === 'countdown' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/65 backdrop-blur-sm">
          <div
            style={{
              fontSize: 'min(35vw, 40vh)',
              lineHeight: 1,
              fontWeight: '900',
              color: countdownNum === 0 ? '#00FF88' : '#FFD700',
              textShadow: `0 0 60px ${countdownNum === 0 ? 'rgba(0,255,100,0.8)' : 'rgba(255,200,0,0.8)'}`,
            }}
          >
            {countdownNum === 0 ? 'GO!' : countdownNum}
          </div>
        </div>
      )}

      {/* ── PLAYING HUD ── */}
      {phase === 'playing' && (
        <>
          <div className="absolute top-0 left-0 right-0 flex justify-between items-start p-4 pointer-events-none flex-wrap gap-4">
            <div className="flex flex-wrap gap-3">
              {displayScores.map((score, i) => {
                const isMax = score >= totalPrize;
                return (
                  <div
                    key={i}
                    className="rounded-xl px-4 py-2"
                    style={{
                      background: isMax ? 'rgba(0,180,100,0.8)' : 'rgba(0,0,0,0.65)',
                      backdropFilter: 'blur(12px)',
                      border: isMax ? '2px solid #00FF88' : '1px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    <div className="text-white/50 text-xs uppercase tracking-wider">Pemain {i + 1}</div>
                    <div className="text-yellow-300 text-xl" style={{ fontWeight: 'bold' }}>
                      {formatRp(score)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              className="ml-auto rounded-2xl px-5 py-3 text-center min-w-[90px]"
              style={{
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(12px)',
                border: `1px solid ${timerColor}44`,
              }}
            >
              <div className="text-white/50 text-xs uppercase tracking-wider">Waktu</div>
              <div className="text-3xl" style={{ color: timerColor, fontWeight: 'bold', transition: 'color 0.4s' }}>
                {timeLeft}s
              </div>
            </div>
          </div>

          {/* Hand hint */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none">
            <div
              className="rounded-2xl px-5 py-2"
              style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,0,0.25)' }}
            >
              <div className="text-yellow-300/80 text-sm">
                {controlMode === 'camera'
                  ? '👤 Gerakkan kepalamu untuk menggeser mangkok!'
                  : '🖱️ Gerakkan mouse / sentuh layar untuk menangkap koin!'}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── DONE ── */}
      {phase === 'done' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-8xl mb-4 animate-bounce">🏆</div>
          <div className="text-white text-4xl mb-2" style={{ fontWeight: 'bold' }}>Semua Selesai!</div>
          <div className="text-white/60 text-lg mb-6">Menghitung hasil...</div>
          <div className="flex gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-3 h-3 rounded-full bg-yellow-400 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}