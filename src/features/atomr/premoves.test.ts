import { describe, expect, it } from "vitest";
import { createInitialGameState } from "./engine";
import {
	appendQueuedPremove,
	canAppendQueuedPremove,
	canQueuePremove,
	clearQueuedPremove,
	createQueuedPremove,
	getExecutablePremove,
	getQueuedPremove,
	getQueuedPremoves,
	popQueuedPremove,
	removeQueuedPremoveAt,
	setQueuedPremove,
	shiftQueuedPremove,
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

	it("stores and clears queued premoves per player", () => {
		const queued = setQueuedPremove(undefined, "p1", {
			row: 1,
			col: 2,
			queuedAtTurn: 4,
			queuedAtMs: 100,
		});

		expect(getQueuedPremove(queued, "p1")).toMatchObject({ row: 1, col: 2 });
		expect(getQueuedPremoves(queued, "p1")).toHaveLength(1);
		expect(getQueuedPremove(queued, "p2")).toBeNull();
		expect(getQueuedPremove(clearQueuedPremove(queued, "p1"), "p1")).toBeNull();
	});

	it("appends, shifts, and pops queued premoves in order", () => {
		let queued = appendQueuedPremove(
			undefined,
			"p1",
			createQueuedPremove(0, 0, 1, 10),
		);
		queued = appendQueuedPremove(
			queued,
			"p1",
			createQueuedPremove(1, 1, 1, 20),
		);

		expect(
			getQueuedPremoves(queued, "p1").map((move) => `${move.row}:${move.col}`),
		).toEqual(["0:0", "1:1"]);

		queued = shiftQueuedPremove(queued, "p1");
		expect(
			getQueuedPremoves(queued, "p1").map((move) => `${move.row}:${move.col}`),
		).toEqual(["1:1"]);

		queued = appendQueuedPremove(
			queued,
			"p1",
			createQueuedPremove(1, 0, 2, 30),
		);
		queued = popQueuedPremove(queued, "p1");
		expect(
			getQueuedPremoves(queued, "p1").map((move) => `${move.row}:${move.col}`),
		).toEqual(["1:1"]);
	});

	it("removes only the first matching queued premove", () => {
		let queued = appendQueuedPremove(
			undefined,
			"p1",
			createQueuedPremove(0, 0, 1, 10),
		);
		queued = appendQueuedPremove(
			queued,
			"p1",
			createQueuedPremove(1, 1, 2, 20),
		);
		queued = appendQueuedPremove(
			queued,
			"p1",
			createQueuedPremove(1, 1, 3, 30),
		);

		queued = removeQueuedPremoveAt(queued, "p1", 1, 1);

		expect(
			getQueuedPremoves(queued, "p1").map((move) => `${move.row}:${move.col}`),
		).toEqual(["0:0", "1:1"]);
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

	it("evaluates queue legality for the queuing player, not the current turn owner", () => {
		const state = createInitialGameState(2, 2);
		state.currentPlayer = "p1";
		state.board[0][0] = { owner: "p2", count: 1 };

		expect(canQueuePremove(state, "p2", 0, 0)).toBe(true);
		expect(canQueuePremove(state, "p1", 0, 0)).toBe(false);
	});

	it("validates appended premoves against the simulated queued sequence", () => {
		const state = createInitialGameState(2, 2);
		state.currentPlayer = "p2";
		state.board[0][0] = { owner: "p1", count: 1 };
		state.board[0][1] = { owner: "p2", count: 1 };

		const queued = appendQueuedPremove(undefined, "p1", {
			row: 0,
			col: 0,
			queuedAtTurn: 0,
			queuedAtMs: 10,
		});

		expect(canQueuePremove(state, "p1", 0, 1)).toBe(false);
		expect(canAppendQueuedPremove(state, "p1", queued, 0, 1)).toBe(true);
	});
});
