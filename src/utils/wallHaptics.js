export function wallHaptic() {
  try { navigator.vibrate?.(8); } catch { /* Haptics are optional on this device. */ }
}
