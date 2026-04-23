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
    const audio = new Audio('/FS_CheckIn.mp3');
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch {}
}

export function playTaskCompleteSound() {
  if (!isSoundEnabled()) return;
  try {
    const audio = new Audio('/TaskCompletChime.mp3');
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch {}
}

export function playChoreCompleteSound() {
  if (!isSoundEnabled()) return;
  try {
    const audio = new Audio('/FS_ChoreComplete.mp3');
    audio.volume = 0.7;
    audio.play().catch(() => {});
  } catch {}
}
