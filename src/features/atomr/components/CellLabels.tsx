type CellCountProps = {
	count: number;
	capacity: number;
};

/** Bottom-right count/capacity label, e.g. "2/3". JetBrains Mono. */
export function CellCount({ count, capacity }: CellCountProps) {
	return (
		<span
			className="text-white/66 pointer-events-none absolute right-[3px] bottom-[2px] font-mono leading-none"
			style={{
				fontSize: "clamp(7px, 1.3vw, 10px)",
				fontWeight: 600,
			}}
			aria-hidden="true"
		>
			{count}/{capacity}
		</span>
	);
}

type CellCoordinateProps = {
	label: string;
	visible: boolean;
};

/** Top-left coordinate label, e.g. "D3". JetBrains Mono, faint. */
export function CellCoordinate({ label, visible }: CellCoordinateProps) {
	if (!visible) return null;
	return (
		<span
			className="text-white/34 pointer-events-none absolute left-[3px] top-[2px] font-mono leading-none"
			style={{
				fontSize: "clamp(6px, 1.1vw, 9px)",
				fontWeight: 500,
			}}
			aria-hidden="true"
		>
			{label}
		</span>
	);
}
