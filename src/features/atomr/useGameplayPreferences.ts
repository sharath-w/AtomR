import { useEffect, useState } from "react";
import { setVibrationEnabled } from "./utils/vibration";

type GameplayPreferences = {
	enablePremoves: boolean;
	enableVibration: boolean;
};

const STORAGE_KEY = "atomr:gameplay-preferences";

const DEFAULT_PREFERENCES: GameplayPreferences = {
	enablePremoves: true,
	enableVibration: true,
};

function readPreferences(): GameplayPreferences {
	if (typeof window === "undefined") return DEFAULT_PREFERENCES;

	try {
		const stored = window.localStorage.getItem(STORAGE_KEY);
		if (!stored) return DEFAULT_PREFERENCES;
		const parsed = JSON.parse(stored);
		return {
			enablePremoves: parsed.enablePremoves === true,
			enableVibration: parsed.enableVibration !== false,
		};
	} catch {
		return DEFAULT_PREFERENCES;
	}
}

export function useGameplayPreferences() {
	const [preferences, setPreferences] = useState<GameplayPreferences>(() =>
		readPreferences(),
	);

	useEffect(() => {
		setVibrationEnabled(preferences.enableVibration);
	}, [preferences.enableVibration]);

	useEffect(() => {
		try {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
		} catch {
			// Preference persistence should not block gameplay.
		}
	}, [preferences]);

	return {
		preferences,
		setEnablePremoves(enablePremoves: boolean) {
			setPreferences((current) => ({ ...current, enablePremoves }));
		},
		setEnableVibration(enableVibration: boolean) {
			setPreferences((current) => ({ ...current, enableVibration }));
		},
	};
}

export type { GameplayPreferences };
