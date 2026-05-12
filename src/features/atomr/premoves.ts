import { applyMove, isLegalMove } from "./engine";
import type { GameState, PlayerId } from "./types";

export type QueuedPremove = {
	row: number;
	col: number;
	queuedAtTurn: number;
	queuedAtMs: number;
};

export function createQueuedPremove(
	row: number,
	col: number,
	queuedAtTurn: number,
	queuedAtMs: number,
): QueuedPremove {
	return {
		row,
		col,
		queuedAtTurn,
		queuedAtMs,
	};
}

export type StoredQueuedPremoves = {
	p1?: QueuedPremove | QueuedPremove[];
	p2?: QueuedPremove | QueuedPremove[];
};

function withPlayerTurn(state: GameState, playerId: PlayerId): GameState {
	return {
		...state,
		currentPlayer: playerId,
	};
}

export function getQueuedPremoves(
	queuedPremoves: StoredQueuedPremoves | null | undefined,
	playerId: PlayerId,
): QueuedPremove[] {
	if (playerId !== "p1" && playerId !== "p2") return [];
	const stored = queuedPremoves?.[playerId];
	if (!stored) return [];
	return Array.isArray(stored) ? stored : [stored];
}

export function getQueuedPremove(
	queuedPremoves: StoredQueuedPremoves | null | undefined,
	playerId: PlayerId,
): QueuedPremove | null {
	return getQueuedPremoves(queuedPremoves, playerId)[0] ?? null;
}

export function setQueuedPremove(
	queuedPremoves: StoredQueuedPremoves | null | undefined,
	playerId: PlayerId,
	premove: QueuedPremove,
): StoredQueuedPremoves {
	return setQueuedPremoves(queuedPremoves, playerId, [premove]);
}

export function setQueuedPremoves(
	queuedPremoves: StoredQueuedPremoves | null | undefined,
	playerId: PlayerId,
	premoves: QueuedPremove[],
): StoredQueuedPremoves {
	if (premoves.length === 0) {
		return clearQueuedPremoves(queuedPremoves, playerId);
	}

	const nextValue = premoves.length <= 1 ? premoves[0] : premoves;

	if (playerId === "p1") {
		return {
			...(queuedPremoves ?? {}),
			p1: nextValue,
		};
	}

	if (playerId === "p2") {
		return {
			...(queuedPremoves ?? {}),
			p2: nextValue,
		};
	}

	return queuedPremoves ?? {};
}

export function clearQueuedPremove(
	queuedPremoves: StoredQueuedPremoves | null | undefined,
	playerId: PlayerId,
): StoredQueuedPremoves {
	return clearQueuedPremoves(queuedPremoves, playerId);
}

export function clearQueuedPremoves(
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

export function canAppendQueuedPremove(
	state: GameState,
	playerId: PlayerId,
	queuedPremoves: StoredQueuedPremoves | null | undefined,
	row: number,
	col: number,
): boolean {
	let previewState = withPlayerTurn(state, playerId);

	for (const premove of getQueuedPremoves(queuedPremoves, playerId)) {
		if (!isLegalMove(previewState, premove.row, premove.col)) {
			return false;
		}
		previewState = withPlayerTurn(
			applyMove(previewState, premove.row, premove.col).state,
			playerId,
		);
	}

	return isLegalMove(previewState, row, col);
}

export function appendQueuedPremove(
	queuedPremoves: StoredQueuedPremoves | null | undefined,
	playerId: PlayerId,
	premove: QueuedPremove,
): StoredQueuedPremoves {
	return setQueuedPremoves(queuedPremoves, playerId, [
		...getQueuedPremoves(queuedPremoves, playerId),
		premove,
	]);
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

export function shiftQueuedPremove(
	queuedPremoves: StoredQueuedPremoves | null | undefined,
	playerId: PlayerId,
): StoredQueuedPremoves {
	const remaining = getQueuedPremoves(queuedPremoves, playerId).slice(1);
	if (remaining.length === 0) {
		return clearQueuedPremoves(queuedPremoves, playerId);
	}
	return setQueuedPremoves(queuedPremoves, playerId, remaining);
}

export function popQueuedPremove(
	queuedPremoves: StoredQueuedPremoves | null | undefined,
	playerId: PlayerId,
): StoredQueuedPremoves {
	const remaining = getQueuedPremoves(queuedPremoves, playerId).slice(0, -1);
	if (remaining.length === 0) {
		return clearQueuedPremoves(queuedPremoves, playerId);
	}
	return setQueuedPremoves(queuedPremoves, playerId, remaining);
}

export function removeQueuedPremoveAt(
	queuedPremoves: StoredQueuedPremoves | null | undefined,
	playerId: PlayerId,
	row: number,
	col: number,
): StoredQueuedPremoves {
	const queuedMoves = getQueuedPremoves(queuedPremoves, playerId);
	const removeIndex = queuedMoves.findIndex(
		(move) => move.row === row && move.col === col,
	);
	if (removeIndex === -1) {
		return queuedPremoves ?? {};
	}

	const remaining = queuedMoves.filter((_, index) => index !== removeIndex);
	if (remaining.length === 0) {
		return clearQueuedPremoves(queuedPremoves, playerId);
	}
	return setQueuedPremoves(queuedPremoves, playerId, remaining);
}
