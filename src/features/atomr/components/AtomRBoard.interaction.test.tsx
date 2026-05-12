// @vitest-environment jsdom

import { fireEvent, render, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createInitialGameState } from "../engine";
import AtomRBoard from "./AtomRBoard";

describe("AtomRBoard interaction", () => {
	it("allows clicks on cells legal for the designated premove player even when it is not their turn", () => {
		const state = createInitialGameState(2, 2);
		state.currentPlayer = "p1";
		state.board[0][0] = { owner: "p2", count: 1 };

		const onPlay = vi.fn();

		const view = render(
			<AtomRBoard
				state={state}
				activeColor="#ff00aa"
				isAnimating={false}
				activeExplosionKeys={[]}
				activeCaptureKeys={[]}
				activeExplosions={[]}
				cellSize={48}
				legalPlayer="p2"
				interactablePlayer="p2"
				onPlay={onPlay}
			/>,
		);

		const cell = within(view.container).getByRole("button", {
			name: /p2 cell with 1 orb/i,
		});

		expect(cell.hasAttribute("disabled")).toBe(false);
		fireEvent.click(cell);
		expect(onPlay).toHaveBeenCalledWith(0, 0);
	});

	it("can render a playback board while using a separate legal state for interactions", () => {
		const renderedState = createInitialGameState(2, 2);
		renderedState.currentPlayer = "p1";
		const legalState = {
			...renderedState,
			currentPlayer: "p2" as const,
		};
		legalState.board[0][0] = { owner: "p2", count: 1 };

		const onPlay = vi.fn();

		const view = render(
			<AtomRBoard
				state={renderedState}
				legalState={legalState}
				activeColor="#ff00aa"
				isAnimating
				activeExplosionKeys={[]}
				activeCaptureKeys={[]}
				activeExplosions={[]}
				cellSize={48}
				interactablePlayer="p2"
				allowInteractionWhileAnimating
				onPlay={onPlay}
			/>,
		);

		const cell = within(view.container).getByRole("button", {
			name: /p2 cell with 1 orb/i,
		});
		expect(cell.hasAttribute("disabled")).toBe(false);
		fireEvent.click(cell);
		expect(onPlay).toHaveBeenCalled();
	});
});
