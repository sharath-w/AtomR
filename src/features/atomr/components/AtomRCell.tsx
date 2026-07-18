import type { KeyboardEventHandler, Ref } from "react";
import { PLAYER_COLORS } from "../constants";
import {
	getCellCapacity,
	isCellCritical,
	isCellThreatened,
} from "../selectors";
import { formatBoardCoordinate } from "../shared";
import type { Cell, GameState, PlayerId, Position } from "../types";
import { CellCoordinate, CellCount } from "./CellLabels";

type AtomRCellProps = {
	state: GameState;
	cell: Cell;
	position: Position;
	activeColor: string;
	isLegal: boolean;
	canActivate: boolean;
	isAnimating: boolean;
	isExploding: boolean;
	isCapturing: boolean;
	isBlockedFeedback: boolean;
	isLastMove: boolean;
	isSuggested: boolean;
	isQueued?: boolean;
	suggestedPlayer?: PlayerId | null;
	queuedPlayer?: PlayerId | null;
	showCoordinates?: boolean;
	tabIndex?: number;
	buttonRef?: Ref<HTMLButtonElement>;
	onFocus?: () => void;
	onClick: () => void;
	onKeyDown?: KeyboardEventHandler<HTMLButtonElement>;
};

// Orb positions as percentages of cell dimensions
const ORB_LAYOUTS: Record<number, Array<{ x: number; y: number }>> = {
	1: [{ x: 50, y: 50 }],
	2: [
		{ x: 33, y: 50 },
		{ x: 67, y: 50 },
	],
	3: [
		{ x: 50, y: 30 },
		{ x: 27, y: 67 },
		{ x: 73, y: 67 },
	],
	4: [
		{ x: 35, y: 35 },
		{ x: 65, y: 35 },
		{ x: 35, y: 65 },
		{ x: 65, y: 65 },
	],
};

function OrbDisplay({
	count,
	color,
	isExploding,
	isCritical,
}: {
	count: number;
	color: string;
	isExploding: boolean;
	isCritical: boolean;
}) {
	const positions = ORB_LAYOUTS[Math.min(count, 4)] ?? ORB_LAYOUTS[4];
	return (
		<>
			{positions.map((pos, i) => {
				const delayMs = isExploding ? 0 : i * 18;
				let animation: string;
				if (isExploding) {
					animation =
						"cr-orb-burst 0.16s cubic-bezier(0.22, 1, 0.36, 1) forwards";
				} else if (isCritical) {
					animation = `cr-orb-pop 0.22s ${delayMs}ms cubic-bezier(0.22, 1, 0.36, 1) both, cr-orb-critical 0.78s ${220 + delayMs}ms ease-in-out infinite`;
				} else {
					animation = `cr-orb-pop 0.22s ${delayMs}ms cubic-bezier(0.22, 1, 0.36, 1) both`;
				}
				return (
					<span
						// biome-ignore lint/suspicious/noArrayIndexKey: intentional — positional, see above
						key={`${i}-${count}-${isExploding ? "ex" : "idle"}`}
						className="cr-orb-plasma absolute rounded-full"
						style={
							{
								"--orb-color": color,
								left: `${pos.x}%`,
								top: `${pos.y}%`,
								width: count >= 4 ? "25%" : "30%",
								aspectRatio: "1 / 1",
								boxShadow: isCritical
									? `0 0 8px color-mix(in srgb, ${color} 80%, transparent), 0 0 20px color-mix(in srgb, ${color} 53%, transparent)`
									: `0 0 5px color-mix(in srgb, ${color} 73%, transparent), 0 0 12px color-mix(in srgb, ${color} 40%, transparent)`,
								animation,
								willChange: "transform, opacity",
							} as React.CSSProperties
						}
					/>
				);
			})}
		</>
	);
}

export default function AtomRCell({
	state,
	cell,
	position,
	activeColor,
	isLegal,
	canActivate,
	isAnimating,
	isExploding,
	isCapturing,
	isBlockedFeedback,
	isLastMove,
	isSuggested,
	isQueued = false,
	suggestedPlayer,
	queuedPlayer,
	showCoordinates = false,
	tabIndex = -1,
	buttonRef,
	onFocus,
	onClick,
	onKeyDown,
}: AtomRCellProps) {
	const ownerColor = cell.owner ? PLAYER_COLORS[cell.owner] : null;
	const suggestionColor = suggestedPlayer
		? PLAYER_COLORS[suggestedPlayer]
		: null;
	const queuedColor = queuedPlayer ? PLAYER_COLORS[queuedPlayer] : "#8df0ff";
	const critical = isCellCritical(state, cell, position.row, position.col);
	const isEnemyCritical =
		critical && cell.owner !== null && cell.owner !== state.currentPlayer;
	const isThreatened =
		cell.owner === state.currentPlayer &&
		cell.count > 0 &&
		isCellThreatened(state, position.row, position.col, state.currentPlayer);

	const cellCoordinate = formatBoardCoordinate(position.row, position.col);
	const capacity = getCellCapacity(state, position.row, position.col);
	const availability = canActivate
		? "legal"
		: isLegal
			? isAnimating
				? "resolving"
				: "unavailable right now"
			: "illegal";
	const queuedSuffix = isQueued ? ", premove queued" : "";

	// Background tint
	let bgColor = "#0c0d14";
	if (isExploding && ownerColor)
		bgColor = `color-mix(in srgb, ${ownerColor} 20%, #07070b)`;
	else if (isCapturing && ownerColor)
		bgColor = `color-mix(in srgb, ${ownerColor} 12%, #07070b)`;
	else if (ownerColor && cell.count > 0)
		bgColor = `color-mix(in srgb, ${ownerColor} 10%, #11121a)`;
	else if (canActivate) bgColor = "color-mix(in srgb, #78d28a 6%, #0c0d14)";

	return (
		<button
			ref={buttonRef}
			type="button"
			onClick={onClick}
			onFocus={onFocus}
			onKeyDown={onKeyDown}
			tabIndex={tabIndex}
			className="group relative cursor-pointer focus-visible:outline-none"
			aria-disabled={!canActivate}
			aria-label={
				cell.owner
					? `${cellCoordinate}, ${cell.owner} cell with ${cell.count} orb${cell.count === 1 ? "" : "s"}, ${critical ? "critical, " : ""}${availability}${queuedSuffix}`
					: `${cellCoordinate}, empty cell, ${availability}${queuedSuffix}`
			}
		>
			{/* Main cell face */}
			<span
				className="absolute inset-0 transition-colors duration-200"
				style={{
					backgroundColor: bgColor,
					boxShadow:
						!cell.owner || cell.count === 0
							? canActivate
								? "inset 0 0 0 1px rgba(120,210,138,0.22)"
								: "inset 0 0 0 1px rgba(255,255,255,0.04)"
							: "none",
				}}
			>
				{/* Critical border — danger stripes (self=warn, enemy=danger) */}
				{critical && ownerColor && (
					<span
						className="cr-danger-stripes absolute inset-0 rounded-[2px] pointer-events-none"
						style={
							{
								"--danger-color": isEnemyCritical
									? "oklch(0.72 0.24 25 / 0.28)"
									: "oklch(0.82 0.18 85 / 0.24)",
							} as React.CSSProperties
						}
					/>
				)}

				{/* Inner ring — critical pulse */}
				<span
					className={[
						"absolute inset-[2px] rounded-[2px] pointer-events-none",
						critical && ownerColor ? "cr-critical-ring" : "",
					].join(" ")}
					style={
						{
							"--cr-critical-shadow-lo": `inset 0 0 0 1px ${ownerColor ?? "transparent"}, 0 0 8px color-mix(in srgb, ${ownerColor ?? "transparent"} 40%, transparent)`,
							"--cr-critical-shadow-hi": `inset 0 0 0 2px ${ownerColor ?? "transparent"}, 0 0 22px color-mix(in srgb, ${ownerColor ?? "transparent"} 67%, transparent)`,
							boxShadow:
								critical && ownerColor
									? `inset 0 0 0 1px ${ownerColor}, 0 0 10px color-mix(in srgb, ${ownerColor} 47%, transparent)`
									: isCapturing
										? `inset 0 0 0 1px color-mix(in srgb, ${activeColor} 53%, transparent)`
										: "none",
						} as React.CSSProperties
					}
				/>

				{/* Threatened notch — small warn mark on bottom edge */}
				{isThreatened && (
					<span
						className="pointer-events-none absolute bottom-0 left-1/2 h-[2px] w-6 -translate-x-1/2 rounded-full"
						style={{
							backgroundColor: "oklch(0.82 0.18 85 / 0.7)",
							boxShadow: "0 0 6px oklch(0.82 0.18 85 / 0.5)",
						}}
					/>
				)}

				<span
					className="pointer-events-none absolute inset-[1px] rounded-[3px] opacity-0 transition-opacity duration-100 group-focus-visible:opacity-100"
					style={{
						boxShadow:
							"inset 0 0 0 2px rgba(255,255,255,0.92), 0 0 0 1px rgba(255,255,255,0.12), 0 0 18px rgba(255,255,255,0.24)",
					}}
				/>

				{isBlockedFeedback ? (
					<span
						className="pointer-events-none absolute inset-[3px] rounded-[2px]"
						style={{
							boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.9)",
							animation:
								"cr-capture-ripple 0.18s cubic-bezier(0.22, 1, 0.36, 1)",
						}}
					/>
				) : null}

				{isLastMove && (
					<span
						className="absolute inset-[5px] rounded-[4px] pointer-events-none"
						style={{
							boxShadow:
								"inset 0 0 0 1px rgba(255,255,255,0.72), 0 0 0 1px rgba(255,255,255,0.1)",
						}}
					/>
				)}

				{isSuggested && suggestionColor && (
					<span
						className="absolute inset-[6px] rounded-[4px] border border-dashed pointer-events-none"
						style={{
							borderColor: `color-mix(in srgb, ${suggestionColor} 60%, transparent)`,
							boxShadow: `0 0 0 1px color-mix(in srgb, ${suggestionColor} 13%, transparent), inset 0 0 14px color-mix(in srgb, ${suggestionColor} 7%, transparent)`,
						}}
					/>
				)}

				{isQueued ? (
					<span
						className="absolute inset-[8px] rounded-[4px] pointer-events-none"
						style={{
							boxShadow: `inset 0 0 0 2px color-mix(in srgb, ${queuedColor} 80%, transparent), 0 0 0 1px color-mix(in srgb, ${queuedColor} 20%, transparent)`,
							outline: `1px dashed color-mix(in srgb, ${queuedColor} 67%, transparent)`,
							outlineOffset: "-3px",
						}}
					/>
				) : null}

				{/* Pre-burst flash — white-hot before explosion */}
				{isExploding && ownerColor && (
					<span
						className="cr-pre-burst-flash pointer-events-none absolute inset-0 rounded-[2px]"
						style={{ backgroundColor: ownerColor as string }}
					/>
				)}

				{/* Capture ripple — expanding ring when orb lands */}
				{isCapturing && ownerColor && (
					<span
						className="cr-capture-ripple absolute inset-[3px] rounded-[1px] pointer-events-none"
						style={{
							border: `1.5px solid color-mix(in srgb, ${ownerColor} 80%, transparent)`,
							backgroundColor: "transparent",
						}}
					/>
				)}

				{/* Orbs */}
				{cell.owner && cell.count > 0 && ownerColor && (
					<OrbDisplay
						count={cell.count}
						color={ownerColor}
						isExploding={isExploding}
						isCritical={critical}
					/>
				)}

				{/* Count / capacity label */}
				{cell.count > 0 && <CellCount count={cell.count} capacity={capacity} />}

				{/* Coordinate label */}
				<CellCoordinate label={cellCoordinate} visible={showCoordinates} />

				{/* Hover glow overlay — legal, non-animating only */}
				{canActivate && (
					<span
						className="absolute inset-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100 pointer-events-none"
						style={{
							backgroundColor: `color-mix(in srgb, ${activeColor} 10%, transparent)`,
							boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${activeColor} 33%, transparent)`,
						}}
					/>
				)}
			</span>
		</button>
	);
}
