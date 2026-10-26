import { player, attachDevice } from '../lib/player';
import { QUEUE } from '../data/mock';
import { isNative, nowPlaying, onNowPlaying, mediaControl, type NowPlaying } from './bridge';

/** Mirrors the tablet's active media session into the player store. Falls back to the mock queue when nothing is playing. */
export async function startNowPlaying() {
  if (!isNative) return;
  attachDevice((action, position) => void mediaControl(action, position));
  let lastTitle = '';
  const apply = (s: NowPlaying | null) => {
    if (!s || !s.active || !s.title) {
      if (player.get().source === 'device') player.set({ source: 'mock', track: QUEUE[player.get().index], playing: false, position: 0 });
      return;
    }
    const art = s.artBase64 ? `data:image/jpeg;base64,${s.artBase64}` : undefined;
    const prev = player.get().track;
    const track = { title: s.title, artist: s.artist || s.app, length: Math.max(1, s.duration || 1), art: art ?? (s.title === lastTitle ? prev.art : 'smoke') };
    lastTitle = s.title;
    player.set({ source: 'device', track, playing: s.playing, position: s.position });
  };
  await onNowPlaying(apply);
  const poll = async () => { try { apply(await nowPlaying()); } catch { /* plugin not ready */ } };
  void poll();
  setInterval(poll, 2000);
}
