import { PLAYER_COLORS } from "../constants";
import type { PlayerId } from "../types";

type Size = "sm" | "md" | "lg" | "xl";

const DIMS: Record<Size, string> = {
	sm: "h-5 w-5 text-[9px]",
	md: "h-6 w-6 text-[10px]",
	lg: "h-8 w-8 text-[11px]",
	xl: "h-10 w-10 text-[12px]",
};

type PlayerBadgeProps = {
	player: PlayerId;
	size?: Size;
	dimmed?: boolean;
	outlined?: boolean;
};

export default function PlayerBadge({
	player,
	size = "md",
	dimmed = false,
	outlined = false,
}: PlayerBadgeProps) {
	const color = PLAYER_COLORS[player];
	return (
		<span
			className={`inline-flex items-center justify-center rounded-full font-mono font-semibold tracking-[0.04em] ${DIMS[size]}`}
			style={{
				backgroundColor: outlined
					? "transparent"
					: `color-mix(in srgb, ${color} 18%, transparent)`,
				color: color,
				boxShadow: `inset 0 0 0 1px ${color}${outlined ? "aa" : "55"}, 0 0 8px ${color}33`,
				opacity: dimmed ? 0.35 : 1,
				transition: "opacity 0.18s ease",
			}}
			aria-hidden="true"
		>
			{player.toUpperCase()}
		</span>
	);
}
