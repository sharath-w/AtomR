import { isLegalMove } from "./engine";
import type { GameState, PlayerId } from "./types";

export type QueuedPremove = {
	row: number;
	col: number;
	queuedAtTurn: number;
	queuedAtMs: number;
};

export type StoredQueuedPremoves = {
	p1?: QueuedPremove;
	p2?: QueuedPremove;
};

function withPlayerTurn(state: GameState, playerId: PlayerId): GameState {
	return {
		...state,
		currentPlayer: playerId,
	};
}

export function getQueuedPremove(
	queuedPremoves: StoredQueuedPremoves | null | undefined,
	playerId: PlayerId,
): QueuedPremove | null {
	if (playerId !== "p1" && playerId !== "p2") return null;
	return queuedPremoves?.[playerId] ?? null;
}

export function setQueuedPremove(
	queuedPremoves: StoredQueuedPremoves | null | undefined,
	playerId: PlayerId,
	premove: QueuedPremove,
): StoredQueuedPremoves {
	if (playerId === "p1") {
		return {
			...(queuedPremoves ?? {}),
			p1: premove,
		};
	}

	if (playerId === "p2") {
		return {
			...(queuedPremoves ?? {}),
			p2: premove,
		};
	}

	return queuedPremoves ?? {};
}

export function clearQueuedPremove(
	queuedPremoves: StoredQueuedPremoves | null | undefined,
	playerId: PlayerId,
): StoredQueuedPremoves {
	if (playerId === "p1") {
		const { p1: _removed, ...rest } = queuedPremoves ?? {};
		void _removed;
		return rest;
	}

	if (playerId === "p2") {
		const { p2: _removed, ...rest } = queuedPremoves ?? {};
		void _removed;
		return rest;
	}

	return queuedPremoves ?? {};
}

export function canQueuePremove(
	state: GameState,
	playerId: PlayerId,
	row: number,
	col: number,
): boolean {
	return isLegalMove(withPlayerTurn(state, playerId), row, col);
}

export function getExecutablePremove(
	state: GameState,
	playerId: PlayerId,
	queuedPremoves: StoredQueuedPremoves | null | undefined,
): QueuedPremove | null {
	if (state.phase === "gameOver" || state.winner) return null;
	if (state.currentPlayer !== playerId) return null;

	const premove = getQueuedPremove(queuedPremoves, playerId);
	if (!premove) return null;

	return canQueuePremove(state, playerId, premove.row, premove.col)
		? premove
		: null;
}
