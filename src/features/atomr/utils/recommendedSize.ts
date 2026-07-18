export type BoardPreset = {
	id: string;
	label: string;
	rows: number;
	cols: number;
	description?: string;
};

export const LANDSCAPE_PRESETS: readonly BoardPreset[] = [
	{ id: "classic", label: "9×6", rows: 6, cols: 9, description: "classic" },
	{ id: "large", label: "12×8", rows: 8, cols: 12 },
	{ id: "huge", label: "14×10", rows: 10, cols: 14 },
	{ id: "max", label: "16×10", rows: 10, cols: 16, description: "max" },
];

export const PORTRAIT_PRESETS: readonly BoardPreset[] = [
	{ id: "classic", label: "6×9", rows: 9, cols: 6, description: "classic" },
	{ id: "large", label: "8×12", rows: 12, cols: 8 },
	{ id: "huge", label: "10×14", rows: 14, cols: 10 },
	{ id: "max", label: "10×16", rows: 16, cols: 10, description: "max" },
];

const MIN_CELL_PX = 56;

export function getBoardPresets(): readonly BoardPreset[] {
	if (typeof window === "undefined") return LANDSCAPE_PRESETS;
	return window.innerHeight > window.innerWidth
		? PORTRAIT_PRESETS
		: LANDSCAPE_PRESETS;
}

/**
 * Pick the largest preset that fits the viewport at >=56px cells in the
 * current orientation. Falls back to the classic preset for the orientation.
 * Called only on the client (requires window).
 */
export function getRecommendedSize(): { rows: number; cols: number } {
	const presets = getBoardPresets();

	if (typeof window === "undefined") {
		const fallback = presets[0];
		return { rows: fallback.rows, cols: fallback.cols };
	}

	const availW = window.innerWidth - 24;
	const availH = window.innerHeight - 160;

	for (let i = presets.length - 1; i >= 0; i--) {
		const preset = presets[i];
		const cellW = availW / preset.cols;
		const cellH = availH / preset.rows;
		if (cellW >= MIN_CELL_PX && cellH >= MIN_CELL_PX) {
			return { rows: preset.rows, cols: preset.cols };
		}
	}

	const fallback = presets[0];
	return { rows: fallback.rows, cols: fallback.cols };
}
