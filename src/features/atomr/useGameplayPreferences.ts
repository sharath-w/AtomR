import { useEffect, useState } from "react";

type GameplayPreferences = {
	enablePremoves: boolean;
};

const STORAGE_KEY = "atomr:gameplay-preferences";

const DEFAULT_PREFERENCES: GameplayPreferences = {
	enablePremoves: false,
};

function readPreferences(): GameplayPreferences {
	if (typeof window === "undefined") return DEFAULT_PREFERENCES;

	try {
		const stored = window.localStorage.getItem(STORAGE_KEY);
		if (!stored) return DEFAULT_PREFERENCES;
		const parsed = JSON.parse(stored);
		return {
			enablePremoves: parsed.enablePremoves === true,
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
		try {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
		} catch {
			// Preference persistence should not block gameplay.
		}
	}, [preferences]);

	return {
		preferences,
		setEnablePremoves(enablePremoves: boolean) {
			setPreferences((current) => ({
				...current,
				enablePremoves,
			}));
		},
	};
}

export type { GameplayPreferences };
