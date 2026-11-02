// YouTube player with a privacy-friendly "click to load" facade.
// - Nothing is requested from YouTube/Google until you tap play (the thumbnail is the only
//   request and it is cached by the service worker).
// - Uses youtube-nocookie.com and the official IFrame API: the footage is never altered.
// - Custom controls (play/pause, restart, loop, slow motion) sit OUTSIDE the video.
// - If the embed fails (owner disabled embedding, offline, blocked) an explicit message and a
//   direct link to the original source are shown: never a permanently stuck player.
import { useEffect, useId, useRef, useState } from 'react';
import { ExternalLink, Pause, Play, RotateCcw, Repeat, WifiOff, AlertTriangle, Gauge, Volume2, VolumeX } from 'lucide-react';
import { youtubeThumb, youtubeWatchUrl } from '../data/videos';

/** Minimal description of a YouTube video to play. */
export interface PlayableVideo {
  youtubeId: string;
  author: string;
  title: string;
  duration?: string;
  language?: 'EN' | 'IT';
  kind?: string;
}

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(s: number, allow: boolean): void;
  setPlaybackRate(r: number): void;
  getAvailablePlaybackRates(): number[];
  getPlayerState(): number;
  mute(): void;
  unMute(): void;
  destroy(): void;
}
interface YTNamespace {
  Player: new (el: HTMLElement, opts: unknown) => YTPlayer;
}
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;
function loadApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (window.YT) resolve(window.YT);
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    s.onerror = () => {
      apiPromise = null;
      reject(new Error('api'));
    };
    document.head.appendChild(s);
  });
  return apiPromise;
}

type Status = 'idle' | 'loading' | 'ready' | 'error' | 'offline' | 'timeout';
const SPEEDS = [0.25, 0.5, 0.75, 1];

export function VideoPlayer({
  video,
  label,
  bleed = false,
  autoLoad = false,
  vertical = false,
  startMuted = false,
}: {
  video?: PlayableVideo;
  label: string;
  bleed?: boolean;
  autoLoad?: boolean;
  /** 9:16 frame for Shorts. */
  vertical?: boolean;
  /** Start without audio (the user can turn it on). */
  startMuted?: boolean;
}) {
  const hostId = useId().replace(/[:]/g, '');
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(video?.kind === 'demo' || vertical);
  const [muted, setMuted] = useState(startMuted);
  const loopRef = useRef(loop);
  loopRef.current = loop;
  const [speed, setSpeed] = useState(1);
  const [rates, setRates] = useState<number[]>(SPEEDS);
  const [errCode, setErrCode] = useState<number | null>(null);

  // Reset when the video changes.
  useEffect(() => {
    setStatus(autoLoad ? 'loading' : 'idle');
    setPlaying(false);
    setSpeed(1);
    setErrCode(null);
    setLoop(video?.kind === 'demo' || vertical);
    setMuted(startMuted);
    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [video?.youtubeId, autoLoad, video?.kind, vertical, startMuted]);

  useEffect(() => {
    if (status !== 'loading' || !video) return;
    if (!navigator.onLine) {
      setStatus('offline');
      return;
    }
    let cancelled = false;
    const timeout = window.setTimeout(() => !cancelled && setStatus((s) => (s === 'loading' ? 'timeout' : s)), 12000);
    loadApi()
      .then((YT) => {
        if (cancelled || !hostRef.current) return;
        const el = document.createElement('div');
        el.className = 'yt-host';
        hostRef.current.replaceChildren(el);
        playerRef.current = new YT.Player(el, {
          host: 'https://www.youtube-nocookie.com',
          videoId: video.youtubeId,
          width: '100%',
          height: '100%',
          playerVars: { playsinline: 1, rel: 0, modestbranding: 1, autoplay: 1, controls: 1, iv_load_policy: 3, mute: startMuted ? 1 : 0, origin: location.origin },
          events: {
            onReady: (e: { target: YTPlayer }) => {
              if (cancelled) return;
              clearTimeout(timeout);
              setStatus('ready');
              try {
                if (startMuted) e.target.mute();
                const r = e.target.getAvailablePlaybackRates();
                if (r?.length) setRates(SPEEDS.filter((x) => r.includes(x)));
                e.target.playVideo();
              } catch {
                /* ignore */
              }
            },
            onStateChange: (e: { data: number; target: YTPlayer }) => {
              // 0 ended, 1 playing, 2 paused
              if (e.data === 1) setPlaying(true);
              if (e.data === 2) setPlaying(false);
              if (e.data === 0) {
                if (loopRef.current) {
                  e.target.seekTo(0, true);
                  e.target.playVideo();
                } else setPlaying(false);
              }
            },
            onError: (e: { data: number }) => {
              clearTimeout(timeout);
              setErrCode(e.data);
              setStatus('error');
            },
          },
        });
      })
      .catch(() => {
        clearTimeout(timeout);
        if (!cancelled) setStatus(navigator.onLine ? 'timeout' : 'offline');
      });
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [status, video]);

  if (!video) {
    return (
      <div className={`player${bleed ? ' bleed' : ''}`}>
        <div className="player-msg">
          <AlertTriangle size={26} color="var(--progress)" />
          <div>
            <b style={{ color: 'var(--text)' }}>Video non disponibile</b>
            <div className="small" style={{ marginTop: 4 }}>
              Non è stato trovato un filmato adatto per questa modalità. Vedi la guida alle riprese originali nella Videoteca.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const url = youtubeWatchUrl(video.youtubeId);
  const p = playerRef.current;

  return (
    <div>
      <div className={`player${bleed ? ' bleed' : ''}${vertical ? ' vertical' : ''}`} aria-label={`Video: ${label}`}>
        <div ref={hostRef} id={`yt-${hostId}`} style={{ position: 'absolute', inset: 0 }} />
        {status === 'idle' && (
          <button className="player-facade" onClick={() => setStatus('loading')} aria-label={`Riproduci video: ${video.title}`}>
            <img src={youtubeThumb(video.youtubeId)} alt="" loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
            <span className="play-orb">
              <Play size={30} fill="currentColor" />
            </span>
            <span className="player-tag">
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{video.author}</span>
              <span>{video.duration ?? ''}</span>
            </span>
          </button>
        )}
        {status === 'loading' && (
          <div className="player-msg" aria-live="polite">
            Caricamento del player YouTube…
          </div>
        )}
        {(status === 'error' || status === 'offline' || status === 'timeout') && (
          <div className="player-msg" role="alert">
            {status === 'offline' ? <WifiOff size={26} /> : <AlertTriangle size={26} color="var(--progress)" />}
            <div>
              <b style={{ color: 'var(--text)' }}>
                {status === 'offline' ? 'Sei offline' : status === 'error' ? 'Il video non può essere riprodotto qui' : 'Il player non si è caricato'}
              </b>
              <div className="small" style={{ marginTop: 4 }}>
                {status === 'offline'
                  ? 'I video sono ospitati su YouTube e richiedono una connessione. Le istruzioni testuali restano disponibili.'
                  : status === 'error'
                    ? `YouTube ha rifiutato la riproduzione incorporata${errCode ? ` (codice ${errCode})` : ''}. Puoi aprirlo sulla fonte originale.`
                    : 'Il contenuto incorporato potrebbe essere bloccato da questo ambiente. Apri la fonte originale.'}
              </div>
            </div>
            <div className="row wrap" style={{ justifyContent: 'center' }}>
              <a className="btn sm primary" href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={16} /> Apri su YouTube
              </a>
              {status !== 'offline' && (
                <button className="btn sm" onClick={() => setStatus('loading')}>
                  Riprova
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="player-controls" role="group" aria-label="Controlli video">
        <button
          className="icon-btn"
          aria-label={playing ? 'Pausa' : 'Riproduci'}
          onClick={() => {
            if (status !== 'ready') return setStatus('loading');
            if (playing) p?.pauseVideo();
            else p?.playVideo();
          }}
        >
          {playing ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button
          className="icon-btn"
          aria-label="Ricomincia"
          onClick={() => {
            if (status !== 'ready') return setStatus('loading');
            p?.seekTo(0, true);
            p?.playVideo();
          }}
        >
          <RotateCcw size={19} />
        </button>
        <button
          className={`icon-btn${muted ? '' : ' on'}`}
          aria-pressed={!muted}
          aria-label={muted ? 'Attiva audio' : 'Disattiva audio'}
          onClick={() => {
            if (status === 'ready') {
              if (muted) p?.unMute();
              else p?.mute();
            }
            setMuted((m) => !m);
          }}
        >
          {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
        </button>
        <button className={`icon-btn${loop ? ' on' : ''}`} aria-pressed={loop} aria-label="Ripeti in loop" onClick={() => setLoop((l) => !l)}>
          <Repeat size={19} />
        </button>
        <div className="speed row" style={{ gap: 4 }}>
          <Gauge size={16} className="muted" aria-hidden />
          <div className="seg" role="group" aria-label="Velocità di riproduzione" style={{ padding: 3 }}>
            {rates.map((r) => (
              <button
                key={r}
                aria-pressed={speed === r}
                style={{ minHeight: 34, padding: '0 8px', fontSize: 12.5 }}
                onClick={() => {
                  setSpeed(r);
                  if (status === 'ready') p?.setPlaybackRate(r);
                }}
                disabled={status !== 'ready'}
                title={status !== 'ready' ? 'Avvia il video per cambiare velocità' : undefined}
              >
                {`${String(r).replace('.', ',')}×`}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="source-line">
        <span>
          Fonte: <b style={{ color: 'var(--text-2)' }}>{video.author}</b> · YouTube{video.language ? ` · ${video.language === 'IT' ? 'italiano' : 'inglese'}` : ''}
        </span>
        <a href={url} target="_blank" rel="noopener noreferrer" className="row" style={{ gap: 4, color: 'var(--text-2)' }}>
          originale <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}
