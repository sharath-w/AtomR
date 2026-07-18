/**
 * Web Vibration API wrapper. Pleasant subtle haptics only — no sound.
 * Reads enabled flag from gameplay preferences on module load.
 */

const STORAGE_KEY = "atomr:gameplay-preferences";

function readEnabled(): boolean {
	if (typeof window === "undefined") return false;
	try {
		const stored = window.localStorage.getItem(STORAGE_KEY);
		if (!stored) return true;
		const parsed = JSON.parse(stored);
		return parsed.enableVibration !== false;
	} catch {
		return true;
	}
}

let enabled = readEnabled();

export function setVibrationEnabled(value: boolean) {
	enabled = value;
}

export function isVibrationEnabled(): boolean {
	return enabled;
}

function hasVibration(): boolean {
	return (
		typeof navigator !== "undefined" &&
		typeof navigator.vibrate === "function"
	);
}

export function vibrate(pattern: number | number[]): void {
	if (!enabled || !hasVibration()) return;
	try {
		navigator.vibrate(pattern);
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
