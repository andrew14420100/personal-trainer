// FORMA LAB 4.0 video player for real-athlete YouTube Shorts.
// Official IFrame player with the minimum interface YouTube allows: controls=0, playsinline=1,
// muted autoplay, loop (playlist=id). App controls sit BELOW the video: nothing is overlaid on
// YouTube's own branding or links. YouTube may still briefly show its title/logo: that is
// required by the platform and is not hidden.
import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Maximize2, Minimize2, Pause, Play, RotateCcw, Volume2, VolumeX, WifiOff, AlertTriangle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { youtubeThumb, youtubeWatchUrl } from '../data/videos';

interface YTP {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(s: number, a: boolean): void;
  setPlaybackRate(r: number): void;
  mute(): void;
  unMute(): void;
  destroy(): void;
}
interface YTNS {
  Player: new (el: HTMLElement, o: unknown) => YTP;
}
declare global {
  interface Window {
    YT?: YTNS;
    onYouTubeIframeAPIReady?: () => void;
  }
}
let api: Promise<YTNS> | null = null;
function loadApi(): Promise<YTNS> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (api) return api;
  api = new Promise((res, rej) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (window.YT) res(window.YT);
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    s.onerror = () => {
      api = null;
      rej(new Error('api'));
    };
    document.head.appendChild(s);
  });
  return api;
}

type St = 'idle' | 'loading' | 'ready' | 'error' | 'offline' | 'blocked';

export function Player({ youtubeId, title, autoPlay, compact = false }: { youtubeId: string; title: string; autoPlay: boolean; compact?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const p = useRef<YTP | null>(null);
  const [st, setSt] = useState<St>(autoPlay ? 'loading' : 'idle');
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [slow, setSlow] = useState(false);
  const [full, setFull] = useState(false);
  // the iframe lives in a different DOM node in full screen: re-create it when toggling
  const [nonce, setNonce] = useState(0);
  const [errCode, setErrCode] = useState<number | null>(null);

  useEffect(() => {
    setSt(autoPlay ? 'loading' : 'idle');
    setPlaying(false);
    setMuted(true);
    setSlow(false);
    return () => {
      p.current?.destroy();
      p.current = null;
    };
  }, [youtubeId, autoPlay]);

  useEffect(() => {
    if (st !== 'loading') return;
    if (!navigator.onLine) return setSt('offline');
    let dead = false;
    const to = window.setTimeout(() => !dead && setSt((s) => (s === 'loading' ? 'blocked' : s)), 12000);
    loadApi()
      .then((YT) => {
        if (dead || !host.current) return;
        // Build the iframe ourselves so it always carries a referrer policy YouTube accepts
        // (embeds without a referrer fail with error 153), then attach the official API to it.
        const params = new URLSearchParams({
          enablejsapi: '1', controls: '0', playsinline: '1', mute: '1', autoplay: '1', loop: '1', playlist: youtubeId,
          rel: '0', iv_load_policy: '3', disablekb: '1', fs: '0', modestbranding: '1', origin: location.origin,
        });
        const el = document.createElement('iframe');
        el.className = 'yt';
        el.title = title;
        el.src = `https://www.youtube-nocookie.com/embed/${youtubeId}?${params}`;
        el.allow = 'autoplay; encrypted-media; picture-in-picture';
        el.referrerPolicy = 'strict-origin-when-cross-origin';
        el.setAttribute('playsinline', '');
        host.current.replaceChildren(el);
        p.current = new YT.Player(el, {
          events: {
            onReady: (e: { target: YTP }) => {
              if (dead) return;
              clearTimeout(to);
              setSt('ready');
              e.target.mute();
              e.target.playVideo();
            },
            onStateChange: (e: { data: number; target: YTP }) => {
              if (e.data === 1) setPlaying(true);
              if (e.data === 2) setPlaying(false);
              if (e.data === 0) {
                e.target.seekTo(0, true);
                e.target.playVideo();
              }
            },
            onError: (e: { data: number }) => {
              clearTimeout(to);
              setErrCode(e.data);
              setSt('error');
            },
          },
        });
      })
      .catch(() => {
        clearTimeout(to);
        if (!dead) setSt(navigator.onLine ? 'blocked' : 'offline');
      });
    return () => {
      dead = true;
      clearTimeout(to);
    };
  }, [st, youtubeId, nonce]);

  const ready = st === 'ready';
  const url = youtubeWatchUrl(youtubeId);
  const box = (
    <div className={`vplayer${compact && !full ? ' compact' : ''}`} aria-label={`Video: ${title}`}>
      <div ref={host} style={{ position: 'absolute', inset: 0 }} />
      {st === 'idle' && (
        <button className="vfacade" onClick={() => setSt('loading')} aria-label={`Riproduci ${title}`}>
          <img src={youtubeThumb(youtubeId)} alt="" loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
          <span className="play">
            <Play size={28} fill="currentColor" />
          </span>
        </button>
      )}
      {st === 'loading' && <div className="vmsg">Caricamento video…</div>}
      {(st === 'error' || st === 'offline' || st === 'blocked') && (
        <div className="vmsg" role="alert">
          {st === 'offline' ? <WifiOff size={24} /> : <AlertTriangle size={24} color="var(--warn)" />}
          <div>
            <b style={{ color: 'var(--t1)' }}>{st === 'offline' ? 'Sei offline' : st === 'error' ? `Il video non può essere riprodotto qui${errCode ? ` (errore YouTube ${errCode})` : ''}` : 'Il player non si è caricato'}</b>
            <div className="t-sm" style={{ marginTop: 4 }}>
              {st === 'offline' ? 'I video richiedono la connessione. La guida tecnica resta disponibile qui sotto.' : 'Puoi guardarlo sulla fonte originale.'}
            </div>
          </div>
          <a className="btn sm primary" href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={15} /> Apri su YouTube
          </a>
        </div>
      )}
    </div>
  );

  const bar = (
    <div className={`vbar${compact && !full ? ' compact' : ''}`} role="group" aria-label="Controlli video">
      <button className="icon-btn" aria-label={playing ? 'Pausa' : 'Riproduci'} onClick={() => (ready ? (playing ? p.current?.pauseVideo() : p.current?.playVideo()) : setSt('loading'))}>
        {playing ? <Pause size={18} /> : <Play size={18} />}
      </button>
      <button className="icon-btn" aria-label="Ricomincia" disabled={!ready} onClick={() => (p.current?.seekTo(0, true), p.current?.playVideo())}>
        <RotateCcw size={17} />
      </button>
      <button
        className={`icon-btn${slow ? ' on' : ''}`}
        aria-pressed={slow}
        aria-label={slow ? 'Velocità normale' : 'Rallenta a metà velocità'}
        disabled={!ready}
        onClick={() => {
          p.current?.setPlaybackRate(slow ? 1 : 0.5);
          setSlow(!slow);
        }}
      >
        <span style={{ fontWeight: 800, fontSize: 12 }}>½×</span>
      </button>
      <button
        className={`icon-btn${muted ? '' : ' on'}`}
        aria-label={muted ? 'Attiva audio' : 'Disattiva audio'}
        disabled={!ready}
        onClick={() => {
          if (muted) p.current?.unMute();
          else p.current?.mute();
          setMuted(!muted);
        }}
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
      <button
        className="icon-btn"
        aria-label={full ? 'Riduci' : 'Schermo intero'}
        onClick={() => {
          setFull((f) => !f);
          if (st === 'ready' || st === 'loading') {
            p.current?.destroy();
            p.current = null;
            setPlaying(false);
            setSt('loading');
            setNonce((n) => n + 1);
          }
        }}
      >
        {full ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
      </button>
      <a className="icon-btn" href={url} target="_blank" rel="noopener noreferrer" aria-label="Apri la fonte originale" style={{ marginLeft: 'auto' }}>
        <ExternalLink size={17} />
      </a>
    </div>
  );

  if (full)
    return createPortal(
      <div className="vfull">
        <div>
          {box}
          {bar}
        </div>
      </div>,
      document.body,
    );
  return (
    <div>
      {box}
      {bar}
    </div>
  );
}
