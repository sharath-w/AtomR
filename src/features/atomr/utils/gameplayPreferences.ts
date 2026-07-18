/**
 * Shared gameplay preferences: storage key, defaults, and a single reader
 * used by both the `useGameplayPreferences` hook and the vibration module.
 */

export type GameplayPreferences = {
	enablePremoves: boolean;
	enableVibration: boolean;
};

export const STORAGE_KEY = "atomr:gameplay-preferences";

const DEFAULT_PREFERENCES: GameplayPreferences = {
	enablePremoves: true,
	enableVibration: true,
};

/**
 * Read gameplay preferences from localStorage. Returns defaults when storage
 * is unavailable, missing, malformed, or null. Both flags default to `true`
 * (only an explicit `false` disables them).
 */
export function readGameplayPreferences(): GameplayPreferences {
	if (typeof window === "undefined") return DEFAULT_PREFERENCES;

	try {
		const stored = window.localStorage.getItem(STORAGE_KEY);
		if (!stored) return DEFAULT_PREFERENCES;
		const parsed: unknown = JSON.parse(stored);
		if (!parsed || typeof parsed !== "object") return DEFAULT_PREFERENCES;
		const candidate = parsed as Record<string, unknown>;
		return {
			enablePremoves: candidate.enablePremoves !== false,
			enableVibration: candidate.enableVibration !== false,
		};
	} catch {
		return DEFAULT_PREFERENCES;
	}
}
