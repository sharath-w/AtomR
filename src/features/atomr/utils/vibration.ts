/**
 * Web Vibration API wrapper. Pleasant subtle haptics only — no sound.
 * Reads enabled flag from gameplay preferences on module load.
 */
import { readGameplayPreferences } from "./gameplayPreferences";

let enabled =
	typeof window !== "undefined" && readGameplayPreferences().enableVibration;

export function setVibrationEnabled(value: boolean) {
	enabled = value;
}

function hasVibration(): boolean {
	return (
		typeof navigator !== "undefined" && typeof navigator.vibrate === "function"
	);
}

export function vibrate(pattern: number | readonly number[]): void {
	if (!enabled || !hasVibration()) return;
	try {
		navigator.vibrate(typeof pattern === "number" ? pattern : [...pattern]);
	} catch {
		// Vibration failures must never break gameplay.
	}
}

/** Pleasant patterns — subtle, short, never annoying. */
export const vibrationPatterns = {
	placement: 12,
	capture: [15, 25, 15],
	cascade: 25,
	illegal: 8,
	winner: [25, 40, 25, 40, 60],
	turnChange: 6,
} as const;
