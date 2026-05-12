import { isLegalMove } from "../engine";
import type { GameState, LastMove, PlayerId, Position } from "../types";
import type { ActiveExplosion } from "../useAtomRGame";
import AtomRCell from "./AtomRCell";
import FlyingOrbOverlay from "./FlyingOrbOverlay";

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
	queuedMove?: Position | null;
	queuedPlayer?: PlayerId | null;
	onPlay: (row: number, col: number) => void;
};

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
	queuedMove,
	queuedPlayer,
	onPlay,
}: AtomRBoardProps) {
	const explosionSet = new Set(activeExplosionKeys);
	const captureSet = new Set(activeCaptureKeys);
	const effectiveLegalState =
		legalState ?? getLegalStateForPlayer(state, legalPlayer);
	const cells = [];

	for (let row = 0; row < state.rows; row += 1) {
		for (let col = 0; col < state.cols; col += 1) {
			const positionKey = `${row}:${col}`;
			const isQueued = queuedMove?.row === row && queuedMove.col === col;
			cells.push(
				<AtomRCell
					key={`cell-${row}-${col}`}
					state={state}
					cell={state.board[row][col]}
					position={{ row, col }}
					activeColor={activeColor}
					isLegal={isLegalMove(effectiveLegalState, row, col)}
					canInteract={
						interactablePlayer == null ||
						legalPlayer != null ||
						legalState != null ||
						state.currentPlayer === interactablePlayer
					}
					canInteractWhileAnimating={allowInteractionWhileAnimating}
					isAnimating={isAnimating}
					isExploding={explosionSet.has(positionKey)}
					isCapturing={captureSet.has(positionKey)}
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
					onPlay={() => onPlay(row, col)}
				/>,
			);
		}
	}

	return (
		/* 1px gradient border via wrapper technique */
		<div
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
				<FlyingOrbOverlay
					activeExplosions={activeExplosions}
					cellSize={cellSize}
				/>
			</div>
		</div>
	);
}
