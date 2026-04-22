const isSoundEnabled = () => {
  try {
    return localStorage.getItem('fs_sound_effects') !== 'false';
  } catch {
    return true;
  }
};

export function playCheckInSound() {
  if (!isSoundEnabled()) return;
  try {
    const audio = new Audio('/checkinchime.mp3');
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch {}
}

export function playTaskCompleteSound() {
  if (!isSoundEnabled()) return;
  try {
    const audio = new Audio('/chorecomplete.mp3');
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch {}
}

export function playChoreCompleteSound() {
  if (!isSoundEnabled()) return;
  try {
    const audio = new Audio('/chorecomplete.mp3');
    audio.volume = 0.7;
    audio.play().catch(() => {});
  } catch {}
}
