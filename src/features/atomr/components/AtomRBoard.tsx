import { useRef } from "react";
import { isLegalMove } from "../engine";
import type { GameState, LastMove, PlayerId, Position } from "../types";
import type { ActiveExplosion } from "../useAtomRGame";
import AtomRCell from "./AtomRCell";
import FlyingOrbOverlay from "./FlyingOrbOverlay";
import { useBoardKeyboardNavigation } from "./useBoardKeyboardNavigation";

type AtomRBoardProps = {
	state: GameState;
	legalState?: GameState;
	activeColor: string;
	isAnimating: boolean;
	activeExplosionKeys: string[];
	activeCaptureKeys: string[];
	activeExplosions: ActiveExplosion[];
	cellSize: number;
	lastMove?: LastMove | null;
	suggestedMove?: Position | null;
	suggestedPlayer?: PlayerId | null;
	legalPlayer?: PlayerId | null;
	interactablePlayer?: PlayerId | null;
	allowInteractionWhileAnimating?: boolean;
	queuedMoves?: Position[] | null;
	queuedPlayer?: PlayerId | null;
	keyboardNavigationEnabled?: boolean;
	canPlay?: boolean;
	showCoordinates?: boolean;
	onPlay: (row: number, col: number) => void;
};

function getCellIndex(row: number, col: number, cols: number) {
	return row * cols + col;
}

function getLegalStateForPlayer(
	state: GameState,
	playerId?: PlayerId | null,
): GameState {
	if (!playerId) return state;
	return {
		...state,
		currentPlayer: playerId,
	};
}

export default function AtomRBoard({
	state,
	legalState,
	activeColor,
	isAnimating,
	activeExplosionKeys,
	activeCaptureKeys,
	activeExplosions,
	cellSize,
	lastMove,
	suggestedMove,
	suggestedPlayer,
	legalPlayer,
	interactablePlayer,
	allowInteractionWhileAnimating = false,
	queuedMoves,
	queuedPlayer,
	keyboardNavigationEnabled = false,
	canPlay = true,
	showCoordinates = false,
	onPlay,
}: AtomRBoardProps) {
	const explosionSet = new Set(activeExplosionKeys);
	const captureSet = new Set(activeCaptureKeys);
	const queuedSet = new Set(
		(queuedMoves ?? []).map((position) => `${position.row}:${position.col}`),
	);
	const effectiveLegalState = getLegalStateForPlayer(
		legalState ?? state,
		legalPlayer,
	);
	const boardCanPlay =
		canPlay &&
		(interactablePlayer == null ||
			legalPlayer != null ||
			legalState != null ||
			state.currentPlayer === interactablePlayer);
	const cellRefs = useRef<Array<HTMLButtonElement | null>>([]);
	const {
		focusedPosition,
		blockedCellKey,
		liveMessage,
		handleCellFocus,
		handleCellClick,
		handleCellKeyDown,
		handleBoardFocusCapture,
		handleBoardBlurCapture,
	} = useBoardKeyboardNavigation({
		state: effectiveLegalState,
		lastMove,
		enabled: keyboardNavigationEnabled,
		canPlay: boardCanPlay,
		isAnimating,
		allowInteractionWhileAnimating,
		onPlay,
		cellRefs,
	});
	const cells = [];

	for (let row = 0; row < state.rows; row += 1) {
		for (let col = 0; col < state.cols; col += 1) {
			const positionKey = `${row}:${col}`;
			const isQueued = queuedSet.has(positionKey);
			const isLegal = isLegalMove(effectiveLegalState, row, col);
			const canActivate =
				boardCanPlay &&
				isLegal &&
				(!isAnimating || allowInteractionWhileAnimating);
			cells.push(
				<AtomRCell
					key={`cell-${row}-${col}`}
					state={state}
					cell={state.board[row][col]}
					position={{ row, col }}
					activeColor={activeColor}
					isLegal={isLegal}
					canActivate={canActivate}
					isAnimating={isAnimating}
					isExploding={explosionSet.has(positionKey)}
					isCapturing={captureSet.has(positionKey)}
					isBlockedFeedback={blockedCellKey === positionKey}
					isLastMove={
						lastMove?.row === row &&
						lastMove?.col === col &&
						!lastMove.didExplode &&
						(lastMove.turnNumber === state.turnNumber ||
							lastMove.turnNumber === state.turnNumber + 1)
					}
					isSuggested={suggestedMove?.row === row && suggestedMove?.col === col}
					isQueued={isQueued}
					suggestedPlayer={suggestedPlayer}
					queuedPlayer={queuedPlayer}
					showCoordinates={showCoordinates}
					tabIndex={
						keyboardNavigationEnabled
							? focusedPosition.row === row && focusedPosition.col === col
								? 0
								: -1
							: -1
					}
					buttonRef={(node) => {
						cellRefs.current[getCellIndex(row, col, state.cols)] = node;
					}}
					onFocus={() => handleCellFocus(row, col)}
					onClick={() => handleCellClick(row, col)}
					onKeyDown={handleCellKeyDown}
				/>,
			);
		}
	}

	return (
		/* 1px gradient border via wrapper technique */
		<div
			onFocusCapture={handleBoardFocusCapture}
			onBlurCapture={handleBoardBlurCapture}
			className="w-full h-full overflow-hidden rounded-2xl p-px"
			style={{
				background: `linear-gradient(135deg, ${activeColor}55, ${activeColor}18 50%, ${activeColor}38)`,
				transition: "background 1s ease",
				boxShadow: `0 0 40px ${activeColor}14, 0 8px 60px rgba(0,0,0,0.5)`,
			}}
		>
			<div
				className="relative w-full h-full overflow-hidden rounded-[calc(1rem-1px)]"
				style={{ background: "#07070b" }}
			>
				<div
					className="grid h-full"
					style={{
						gridTemplateColumns: `repeat(${state.cols}, minmax(0, 1fr))`,
						gridTemplateRows: `repeat(${state.rows}, minmax(0, 1fr))`,
						gap: "1px",
						backgroundColor: "rgba(255,255,255,0.10)",
					}}
				>
					{cells}
				</div>
				{keyboardNavigationEnabled ? (
					<div className="sr-only" aria-live="polite" aria-atomic="true">
						{liveMessage}
					</div>
				) : null}
				<FlyingOrbOverlay
					activeExplosions={activeExplosions}
					cellSize={cellSize}
				/>
			</div>
		</div>
	);
}
