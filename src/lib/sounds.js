export function playSound(src) {
  try {
    if (localStorage.getItem('fs_sounds_enabled') === 'false') return;
    const audio = new Audio(src);
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch {}
}
