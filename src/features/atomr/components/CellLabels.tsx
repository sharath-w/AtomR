type CellCountProps = {
	count: number;
	capacity: number;
	dimmed?: boolean;
};

/** Bottom-right count/capacity label, e.g. "2/3". JetBrains Mono. */
export function CellCount({ count, capacity, dimmed = false }: CellCountProps) {
	if (count === 0) return null;
	return (
		<span
			className="pointer-events-none absolute right-[3px] bottom-[2px] font-mono leading-none"
			style={{
				fontSize: "clamp(7px, 1.3vw, 10px)",
				fontWeight: 600,
				color: dimmed ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.66)",
			}}
			aria-hidden="true"
		>
			{count}/{capacity}
		</span>
	);
}

type CellCoordinateProps = {
	label: string;
	visible?: boolean;
};

/** Top-left coordinate label, e.g. "D3". JetBrains Mono, faint. */
export function CellCoordinate({
	label,
	visible = false,
}: CellCoordinateProps) {
	if (!visible) return null;
	return (
		<span
			className="pointer-events-none absolute left-[3px] top-[2px] font-mono leading-none"
			style={{
				fontSize: "clamp(6px, 1.1vw, 9px)",
				fontWeight: 500,
				color: "rgba(255,255,255,0.34)",
			}}
			aria-hidden="true"
		>
			{label}
		</span>
	);
}
