// src/utils/video.ts
// Turns a product's video link into something safe to render.
// Only https URLs are accepted, and iframe addresses are rebuilt from the parsed
// video ID — the raw URL is never put into an iframe.

export type VideoInfo =
  | { kind: 'embed'; provider: 'youtube' | 'tiktok' | 'facebook'; embedUrl: string; thumb: string | null; vertical: boolean }
  | { kind: 'file'; src: string }
  | { kind: 'link'; url: string };

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

export function parseVideo(raw: string | null | undefined): VideoInfo | null {
  if (!raw) return null;
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'https:') return null;

  const host = u.hostname.replace(/^(www|m)\./, '').toLowerCase();
  const path = u.pathname;

  // YouTube
  if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'youtu.be') {
    let id: string | null = null;
    let vertical = false;
    if (host === 'youtu.be') {
      id = path.split('/')[1] ?? null;
    } else if (path === '/watch') {
      id = u.searchParams.get('v');
    } else {
      const m = path.match(/^\/(embed|shorts|live)\/([^/?]+)/);
      if (m) {
        id = m[2];
        vertical = m[1] === 'shorts';
      }
    }
    if (id && YT_ID.test(id)) {
      return {
        kind: 'embed',
        provider: 'youtube',
        embedUrl: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`,
        thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        vertical,
      };
    }
    return { kind: 'link', url: u.toString() };
  }

  // TikTok (full video URLs only; short links like vm.tiktok.com can't be resolved offline)
  if (host === 'tiktok.com') {
    const m = path.match(/^\/@[^/]+\/video\/(\d+)/);
    if (m) {
      return {
        kind: 'embed',
        provider: 'tiktok',
        embedUrl: `https://www.tiktok.com/embed/v2/${m[1]}`,
        thumb: null,
        vertical: true,
      };
    }
    return { kind: 'link', url: u.toString() };
  }

  // Facebook
  if (host === 'facebook.com' || host === 'fb.watch') {
    return {
      kind: 'embed',
      provider: 'facebook',
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(u.toString())}&show_text=false&autoplay=true`,
      thumb: null,
      vertical: /\/reel\//.test(path),
    };
  }

  // Direct file
  if (/\.(mp4|webm|ogg)$/i.test(path)) {
    return { kind: 'file', src: u.toString() };
  }

  return { kind: 'link', url: u.toString() };
}
