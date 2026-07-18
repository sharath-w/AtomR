import { useCallback, useEffect, useState } from "react";
import {
	type GameplayPreferences,
	readGameplayPreferences,
	STORAGE_KEY,
} from "./utils/gameplayPreferences";
import { setVibrationEnabled } from "./utils/vibration";

export function useGameplayPreferences() {
	const [preferences, setPreferences] = useState<GameplayPreferences>(() =>
		readGameplayPreferences(),
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

	const setEnablePremoves = useCallback((enablePremoves: boolean) => {
		setPreferences((current) => ({ ...current, enablePremoves }));
	}, []);

	const setEnableVibration = useCallback((enableVibration: boolean) => {
		setPreferences((current) => ({ ...current, enableVibration }));
	}, []);

	return {
		preferences,
		setEnablePremoves,
		setEnableVibration,
	};
}

export type { GameplayPreferences };
