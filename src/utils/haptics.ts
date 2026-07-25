import * as Haptics from 'expo-haptics';

/** Light tap feedback — use for button presses */
export async function tapLight() {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (_) {}
}

/** Medium tap feedback — use for moves/actions */
export async function tapMedium() {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (_) {}
}

/** Heavy impact — use for collisions/drops */
export async function tapHeavy() {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch (_) {}
}

/** Success notification — use for scoring/winning */
export async function notifySuccess() {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (_) {}
}

/** Warning notification — use for near-loss states */
export async function notifyWarning() {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch (_) {}
}

/** Error/Game Over notification */
export async function notifyError() {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch (_) {}
}

/** Selection tick — use for menu items */
export async function selectionTick() {
  try {
    await Haptics.selectionAsync();
  } catch (_) {}
}
