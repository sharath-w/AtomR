import { describe, expect, it } from "vitest";
import { createInitialGameState } from "./engine";
import {
	canQueuePremove,
	clearQueuedPremove,
	getExecutablePremove,
	getQueuedPremove,
	setQueuedPremove,
} from "./premoves";

describe("premoves", () => {
	it("allows queueing on empty or owned cells for the given player", () => {
		const state = createInitialGameState(2, 2);
		state.board[0][0] = { owner: "p1", count: 1 };
		state.board[0][1] = { owner: "p2", count: 1 };

		expect(canQueuePremove(state, "p1", 1, 1)).toBe(true);
		expect(canQueuePremove(state, "p1", 0, 0)).toBe(true);
		expect(canQueuePremove(state, "p1", 0, 1)).toBe(false);
	});

	it("stores and clears one queued premove per player", () => {
		const queued = setQueuedPremove(undefined, "p1", {
			row: 1,
			col: 2,
			queuedAtTurn: 4,
			queuedAtMs: 100,
		});

		expect(getQueuedPremove(queued, "p1")).toMatchObject({ row: 1, col: 2 });
		expect(getQueuedPremove(queued, "p2")).toBeNull();
		expect(getQueuedPremove(clearQueuedPremove(queued, "p1"), "p1")).toBeNull();
	});

	it("only returns an executable premove when it is that player's turn and the move stays legal", () => {
		const state = createInitialGameState(2, 2);
		state.currentPlayer = "p2";
		state.board[0][0] = { owner: "p1", count: 1 };
		state.board[0][1] = { owner: "p2", count: 1 };

		const queued = setQueuedPremove(undefined, "p2", {
			row: 1,
			col: 1,
			queuedAtTurn: 0,
			queuedAtMs: 10,
		});

		expect(getExecutablePremove(state, "p2", queued)).toMatchObject({
			row: 1,
			col: 1,
		});
		expect(getExecutablePremove(state, "p1", queued)).toBeNull();

		const illegalQueued = setQueuedPremove(undefined, "p2", {
			row: 0,
			col: 0,
			queuedAtTurn: 0,
			queuedAtMs: 10,
		});
		expect(getExecutablePremove(state, "p2", illegalQueued)).toBeNull();
	});
});
