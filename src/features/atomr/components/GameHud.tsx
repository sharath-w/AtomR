import { Link } from "@tanstack/react-router";
import { HelpCircle, Home, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
	getActivePlayerOrder,
	PLAYER_COLORS,
	PLAYER_NAMES,
} from "../constants";
import { countPlayerOrbsInState } from "../selectors";
import { ONLINE_TURN_TIME_LIMIT_MS } from "../shared";
import type { GameState, PlayerId } from "../types";
import { vibrate, vibrationPatterns } from "../utils/vibration";
import PlayerBadge from "./PlayerBadge";

const HUD_BUTTON_CLASS_NAME =
	"flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07070b] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100 min-[480px]:w-auto min-[480px]:gap-2 min-[480px]:px-3";
const HUD_BUTTON_STYLE: React.CSSProperties = {
	background: "rgba(255,255,255,0.02)",
	color: "rgba(255,255,255,0.66)",
	fontFamily: "'Oxanium', sans-serif",
	fontSize: "10px",
	fontWeight: 700,
	letterSpacing: "0.22em",
	textTransform: "uppercase",
};

type GameHudProps = {
	state: GameState;
	onSettingsOpen: () => void;
	onUndo?: () => void;
	undoDisabled?: boolean;
	/** Absolute deadline (ms epoch) for current turn. Drives timer bar. */
	turnDeadlineMs?: number | null;
	/** Tick source for timer; defaults to Date.now(). */
	nowMs?: number;
	/** Optional names override (e.g. "CPU", "Player"). */
	playerNames?: Partial<Record<PlayerId, string>>;
	/** Open the rules / how-to-play overlay. */
	onShowRules?: () => void;
};

function getPlayersInRotation(state: GameState): PlayerId[] {
	const activePlayers = getActivePlayerOrder(state.playerCount).filter(
		(playerId) => !(state.eliminated[playerId] ?? false),
	);
	if (activePlayers.length > 0) return activePlayers;
	if (state.winner) return [state.winner];
	return [state.currentPlayer];
}

function useNowTicker(enabled: boolean): number {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		if (!enabled) return;
		const id = window.setInterval(() => setNow(Date.now()), 250);
		return () => window.clearInterval(id);
	}, [enabled]);
	return now;
}

function TurnTimerBar({
	deadlineMs,
	nowMs,
	isResolving,
}: {
	deadlineMs: number | null;
	nowMs: number;
	isResolving: boolean;
}) {
	if (isResolving) {
		return (
			<div
				className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full"
				style={{ background: "rgba(255,255,255,0.05)" }}
			>
				<div
					className="h-full w-1/3 rounded-full"
					style={{
						background: "rgba(255,255,255,0.4)",
						animation: "cr-timer-pulse 1.2s ease-in-out infinite",
					}}
				/>
			</div>
		);
	}
	if (deadlineMs == null) {
		// No timer (local hot-seat) — thin neutral bar
		return (
			<div
				className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full"
				style={{ background: "rgba(255,255,255,0.05)" }}
			>
				<div className="h-full w-full rounded-full bg-white/10" />
			</div>
		);
	}
	const remaining = Math.max(0, deadlineMs - nowMs);
	const pct = Math.max(0, Math.min(1, remaining / ONLINE_TURN_TIME_LIMIT_MS));
	const color =
		pct > 0.5
			? "oklch(0.78 0.17 145)"
			: pct > 0.2
				? "oklch(0.82 0.18 85)"
				: "oklch(0.72 0.24 25)";
	return (
		<div
			className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full"
			style={{ background: "rgba(255,255,255,0.05)" }}
		>
			<div
				className="h-full rounded-full"
				style={{
					width: `${pct * 100}%`,
					background: color,
					transition: "width 0.25s linear, background 0.4s ease",
				}}
			/>
		</div>
	);
}

function PlayerChipsStrip({
	state,
	players,
}: {
	state: GameState;
	players: PlayerId[];
}) {
	if (players.length <= 1) return null;
	return (
		<div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1">
			{players.map((playerId) => {
				const orbs = countPlayerOrbsInState(state, playerId);
				const eliminated = state.eliminated[playerId] ?? false;
				const isCurrent = !state.winner && playerId === state.currentPlayer;
				const color = PLAYER_COLORS[playerId];
				return (
					<div
						key={playerId}
						className="flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1"
						style={{
							background: isCurrent
								? `color-mix(in srgb, ${color} 14%, transparent)`
								: "rgba(255,255,255,0.02)",
							boxShadow: `inset 0 0 0 1px ${isCurrent ? color + "66" : "rgba(255,255,255,0.04)"}`,
							opacity: eliminated ? 0.35 : 1,
							transition: "opacity 0.2s ease",
						}}
					>
						<PlayerBadge player={playerId} size="sm" dimmed={eliminated} />
						<span
							className="font-mono text-[10px] tabular-nums"
							style={{
								color: eliminated
									? "rgba(255,255,255,0.4)"
									: "rgba(255,255,255,0.82)",
								textDecoration: eliminated ? "line-through" : "none",
							}}
						>
							{orbs}
						</span>
					</div>
				);
			})}
		</div>
	);
}

export default function GameHud({
	state,
	onSettingsOpen,
	onUndo,
	undoDisabled = false,
	turnDeadlineMs = null,
	nowMs,
	playerNames,
	onShowRules,
}: GameHudProps) {
	const playersInRotation = getPlayersInRotation(state);
	const isResolving = state.phase === "resolving";
	const isWinnerLocked = Boolean(state.winner || state.isDraw);
	const now = useNowTicker(turnDeadlineMs != null && !isWinnerLocked);
	const effectiveNow = nowMs ?? now;

	// Turn change haptic
	const prevPlayerRef = useRef<PlayerId | null>(null);
	useEffect(() => {
		const prev = prevPlayerRef.current;
		if (prev != null && prev !== state.currentPlayer && !state.winner) {
			vibrate(vibrationPatterns.turnChange);
		}
		prevPlayerRef.current = state.currentPlayer;
	}, [state.currentPlayer, state.winner]);

	const displayPlayer = state.winner ?? state.currentPlayer;
	const playerName =
		playerNames?.[displayPlayer] ?? PLAYER_NAMES[displayPlayer];
	const color = PLAYER_COLORS[displayPlayer];

	let statusText: string;
	if (state.winner) statusText = `${playerName} wins`;
	else if (state.isDraw) statusText = "unstable loop";
	else if (isResolving) statusText = "resolving…";
	else statusText = `${playerName}'s turn`;

	const secondsLeft =
		turnDeadlineMs != null && !isWinnerLocked
			? Math.max(0, Math.ceil((turnDeadlineMs - effectiveNow) / 1000))
			: null;

	return (
		<div
			className="w-full rounded-[22px] px-2 py-2 sm:rounded-[24px] sm:px-3 sm:py-2.5"
			style={{
				background:
					"linear-gradient(180deg, rgba(10,10,16,0.92), rgba(7,7,11,0.82))",
				boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
			}}
		>
			<div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-3">
				<Link
					to="/play"
					aria-label="Home"
					className={`${HUD_BUTTON_CLASS_NAME} no-underline`}
					style={HUD_BUTTON_STYLE}
				>
					<Home size={14} strokeWidth={2} />
					<span className="hidden min-[480px]:inline">home</span>
				</Link>

				<div className="flex min-w-0 flex-col">
					<div
						key={statusText}
						className="cr-turn-fade flex items-center gap-2"
						aria-live="polite"
						aria-atomic="true"
					>
						<PlayerBadge
							player={displayPlayer}
							size="md"
							dimmed={isWinnerLocked && !state.winner}
						/>
						<span
							className="truncate font-semibold uppercase"
							style={{
								color: state.winner ? color : "rgba(255,255,255,0.92)",
								fontFamily: "'Oxanium', sans-serif",
								fontSize: "0.95rem",
								letterSpacing: "0.14em",
							}}
						>
							{statusText}
						</span>
						{secondsLeft != null && (
							<span
								className="ml-auto font-mono text-[12px] tabular-nums"
								style={{
									color:
										secondsLeft > 15
											? "rgba(255,255,255,0.66)"
											: secondsLeft > 5
												? "oklch(0.82 0.18 85)"
												: "oklch(0.72 0.24 25)",
								}}
							>
								{String(Math.floor(secondsLeft / 60)).padStart(1, "0")}:
								{String(secondsLeft % 60).padStart(2, "0")}
							</span>
						)}
					</div>
					<TurnTimerBar
						deadlineMs={turnDeadlineMs}
						nowMs={effectiveNow}
						isResolving={isResolving}
					/>
					<PlayerChipsStrip state={state} players={playersInRotation} />
				</div>

				<div className="flex items-center gap-2">
					{onUndo ? (
						<button
							type="button"
							onClick={onUndo}
							disabled={undoDisabled}
							aria-label="Undo previous turn"
							className={HUD_BUTTON_CLASS_NAME}
							style={HUD_BUTTON_STYLE}
						>
							<RotateCcw size={14} strokeWidth={2} />
							<span className="hidden min-[480px]:inline">undo</span>
						</button>
					) : null}
					{onShowRules ? (
						<button
							type="button"
							onClick={onShowRules}
							aria-label="How to play"
							className={HUD_BUTTON_CLASS_NAME}
							style={HUD_BUTTON_STYLE}
						>
							<HelpCircle size={14} strokeWidth={2} />
							<span className="hidden min-[480px]:inline">rules</span>
						</button>
					) : null}
					<button
						type="button"
						onClick={onSettingsOpen}
						aria-label="Board settings"
						className={HUD_BUTTON_CLASS_NAME}
						style={HUD_BUTTON_STYLE}
					>
						<SlidersHorizontal size={14} strokeWidth={2} />
						<span className="hidden min-[480px]:inline">board</span>
					</button>
				</div>
			</div>
		</div>
	);
}
