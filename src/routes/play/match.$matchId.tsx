import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Flag, HelpCircle, Home } from "lucide-react";
import {
	useEffect,
	useEffectEvent,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import AtomRBoard from "#/features/atomr/components/AtomRBoard";
import GameOverlay from "#/features/atomr/components/GameOverlay";
import GameSettings from "#/features/atomr/components/GameSettings";
import OnboardingOverlay from "#/features/atomr/components/OnboardingOverlay";
import { PLAYER_COLORS } from "#/features/atomr/constants";
import { getCapacity } from "#/features/atomr/engine";
import {
	appendQueuedPremove,
	canAppendQueuedPremove,
	createQueuedPremove,
	getQueuedPremoves,
	type StoredQueuedPremoves,
} from "#/features/atomr/premoves";
import {
	type Board,
	formatBoardCoordinate,
	type GameState,
	type LastMove,
	ONLINE_TURN_TIME_LIMIT_MS,
	ONLINE_VIEWER_HEARTBEAT_MS,
	type PlayerId,
} from "#/features/atomr/shared";
import { useGameplayPreferences } from "#/features/atomr/useGameplayPreferences";
import { useResolvedGamePlayback } from "#/features/atomr/useResolvedGamePlayback";
import { getRecommendedSize } from "#/features/atomr/utils/recommendedSize";
import { authClient } from "#/lib/auth-client";
import { requireSessionFn } from "#/lib/session-fns";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

function cloneBoard(board: Board): Board {
	return board.map((row) => row.map((cell) => ({ ...cell })));
}

export const Route = createFileRoute("/play/match/$matchId")({
	beforeLoad: async () => {
		await requireSessionFn();
	},
	component: MatchPage,
});

function MatchPage() {
	const { matchId } = Route.useParams();
	const navigate = useNavigate();
	const { data: session } = authClient.useSession();
	const match = useQuery(api.online.getMatch, {
		matchId: matchId as Id<"matches">,
	});
	const syncViewer = useMutation(api.online.syncViewer);
	const claimTurnTimeout = useMutation(api.online.claimTurnTimeout);
	const submitMove = useMutation(api.online.submitMove);
	const queuePremove = useMutation(api.online.queuePremove);
	const clearPremove = useMutation(api.online.clearPremove);
	const resignMatch = useMutation(api.online.resignMatch);
	const [resignPending, setResignPending] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [rulesOpen, setRulesOpen] = useState(false);
	const [nowMs, setNowMs] = useState(() => Date.now());
	const containerRef = useRef<HTMLDivElement>(null);
	const timeoutClaimedForRef = useRef<string | null>(null);
	const pendingPremoveFlushRef = useRef(false);
	const queuedPremoveNoticeTimerRef = useRef<number | null>(null);
	const [premoveNotice, setPremoveNotice] = useState<string | null>(null);
	const [pendingPremoves, setPendingPremoves] = useState<
		Array<{
			row: number;
			col: number;
		}>
	>([]);
	const [boardDims, setBoardDims] = useState<{ w: number; h: number } | null>(
		null,
	);
	const { preferences, setEnablePremoves } = useGameplayPreferences();
	const user = session?.user ?? null;
	const activeMatchId = match?._id ?? null;
	const viewerPlayerId: PlayerId | null =
		match?.viewerPlayerId === "p1" || match?.viewerPlayerId === "p2"
			? match.viewerPlayerId
			: null;

	const heartbeatViewer = useEffectEvent(async () => {
		if (!user) return;
		await syncViewer({});
	});

	const flashPremoveNotice = useEffectEvent((message: string) => {
		if (queuedPremoveNoticeTimerRef.current !== null) {
			window.clearTimeout(queuedPremoveNoticeTimerRef.current);
		}
		setPremoveNotice(message);
		queuedPremoveNoticeTimerRef.current = window.setTimeout(() => {
			setPremoveNotice(null);
			queuedPremoveNoticeTimerRef.current = null;
		}, 1500);
	});

	useEffect(() => {
		if (!user) return;
		let cancelled = false;
		async function heartbeat() {
			if (cancelled) return;
			try {
				await heartbeatViewer();
			} catch {
				// Match should continue even if presence heartbeat fails.
			}
		}

		void heartbeat();
		const timer = window.setInterval(() => {
			void heartbeat();
		}, ONLINE_VIEWER_HEARTBEAT_MS);
		return () => {
			cancelled = true;
			window.clearInterval(timer);
		};
	}, [user]);

	const matchState = useMemo(() => {
		if (!match) return null;
		return {
			board: match.board,
			rows: match.rows,
			cols: match.cols,
			playerCount: match.playerCount ?? 2,
			currentPlayer: match.currentPlayer,
			turnNumber: match.turnNumber,
			hasPlayed: match.hasPlayed,
			eliminated: match.eliminated,
			winner: match.winner,
			phase: match.winner ? "gameOver" : "idle",
		} satisfies GameState;
	}, [match]);

	const playback = useResolvedGamePlayback(
		matchState ?? {
			board: [],
			rows: 0,
			cols: 0,
			playerCount: 2,
			currentPlayer: "p1",
			turnNumber: 0,
			hasPlayed: { p1: false, p2: false },
			eliminated: { p1: false, p2: false },
			winner: null,
			phase: "idle",
		},
	);
	const {
		state: playbackState,
		isAnimating,
		activeExplosionKeys,
		activeCaptureKeys,
		activeExplosions,
		playEvents,
		resetToState,
	} = playback;
	const toStoredQueuedPremoves = (
		moves: Array<{ row: number; col: number }>,
		playerId: PlayerId,
	): StoredQueuedPremoves => ({
		[playerId]: moves.map((move, index) =>
			createQueuedPremove(
				move.row,
				move.col,
				match?.turnNumber ?? index,
				index,
			),
		),
	});
	const prevServerTurnRef = useRef<number | null>(null);
	const prevServerBoardRef = useRef<Board | null>(null);
	const [optimisticPlacement, setOptimisticPlacement] = useState<{
		row: number;
		col: number;
		player: PlayerId;
		turnNumber: number;
		baseTurn: number;
		didExplode: boolean;
	} | null>(null);

	useEffect(() => {
		if (!matchState || !match) return;

		const previousTurn = prevServerTurnRef.current;
		const currentTurn = match.turnNumber;

		if (previousTurn === null) {
			resetToState(matchState);
		} else if (currentTurn === previousTurn) {
			if (!isAnimating) {
				resetToState(matchState);
			}
		} else if (
			currentTurn === previousTurn + 1 &&
			match.lastMoveEvents?.length &&
			prevServerBoardRef.current
		) {
			playEvents(
				match.lastMoveEvents,
				matchState,
				cloneBoard(prevServerBoardRef.current),
			);
		} else {
			resetToState(matchState);
		}

		prevServerTurnRef.current = currentTurn;
		prevServerBoardRef.current = cloneBoard(matchState.board);
	}, [match, matchState, isAnimating, playEvents, resetToState]);

	useEffect(() => {
		if (!optimisticPlacement || !match) return;
		if (match.turnNumber !== optimisticPlacement.baseTurn) {
			setOptimisticPlacement(null);
		}
	}, [match, optimisticPlacement]);

	useEffect(() => {
		if (
			!match ||
			!viewerPlayerId ||
			pendingPremoveFlushRef.current ||
			pendingPremoves.length === 0 ||
			match.currentPlayer === viewerPlayerId
		) {
			return;
		}

		const premove = pendingPremoves[0];
		pendingPremoveFlushRef.current = true;

		void queuePremove({
			matchId: match._id,
			row: premove.row,
			col: premove.col,
		})
			.then(() => {
				setPendingPremoves((current) => current.slice(1));
				flashPremoveNotice(
					`Premove ${formatBoardCoordinate(premove.row, premove.col)} queued`,
				);
			})
			.catch(() => {
				flashPremoveNotice("Premove failed");
			})
			.finally(() => {
				pendingPremoveFlushRef.current = false;
			});
	}, [match, pendingPremoves, queuePremove, viewerPlayerId]);

	useEffect(() => {
		return () => {
			if (queuedPremoveNoticeTimerRef.current !== null) {
				window.clearTimeout(queuedPremoveNoticeTimerRef.current);
			}
		};
	}, []);

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key !== "Escape") return;
			setPendingPremoves([]);
			if (!match || !viewerPlayerId) return;
			void clearPremove({ matchId: match._id }).then(() => {
				flashPremoveNotice("Premove cleared");
			});
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [clearPremove, match, viewerPlayerId]);

	useEffect(() => {
		if (!settingsOpen || !activeMatchId || !viewerPlayerId) return;
		setPendingPremoves([]);
		void clearPremove({ matchId: activeMatchId }).catch(() => {});
	}, [activeMatchId, clearPremove, settingsOpen, viewerPlayerId]);

	useEffect(() => {
		if (!match || match.winner) return;
		setNowMs(Date.now());
		const timer = window.setInterval(() => {
			setNowMs(Date.now());
		}, 250);
		return () => window.clearInterval(timer);
	}, [match]);

	const turnDeadlineAt = match
		? match.lastMoveAt + ONLINE_TURN_TIME_LIMIT_MS
		: null;
	const msRemaining = turnDeadlineAt ? Math.max(0, turnDeadlineAt - nowMs) : 0;
	const lastMove = useMemo<LastMove | null>(() => {
		if (optimisticPlacement) {
			return optimisticPlacement;
		}
		const placeEvent = match?.lastMoveEvents?.find(
			(event) => event.type === "place",
		);
		if (!placeEvent || !match) return null;
		const didExplode =
			match.lastMoveEvents?.some((event) => event.type === "explode") ?? false;
		return {
			row: placeEvent.row,
			col: placeEvent.col,
			player: placeEvent.player,
			turnNumber: match.turnNumber,
			didExplode,
		};
	}, [match, optimisticPlacement]);

	useEffect(() => {
		if (!session?.user || !match || !viewerPlayerId) return;
		if (match.winner || match.phase !== "idle") return;
		if (msRemaining > 0) return;

		const claimKey = `${match._id}:${match.turnNumber}`;
		if (timeoutClaimedForRef.current === claimKey) return;
		timeoutClaimedForRef.current = claimKey;

		void claimTurnTimeout({ matchId: match._id })
			.then((result) => {
				if (!result.timedOut) {
					timeoutClaimedForRef.current = null;
				}
			})
			.catch(() => {
				timeoutClaimedForRef.current = null;
			});
	}, [claimTurnTimeout, match, msRemaining, session?.user, viewerPlayerId]);

	useEffect(() => {
		if (!matchState) return;
		const rec = getRecommendedSize();
		if (!boardDims && rec.rows && rec.cols) {
			// no-op, just trigger initial layout after mount
		}
	}, [boardDims, matchState]);

	useLayoutEffect(() => {
		const element = containerRef.current;
		const nextMatchState = matchState;
		if (!element || !nextMatchState) return;
		function measure(target: HTMLDivElement, state: GameState) {
			const { width, height } = target.getBoundingClientRect();
			if (!width || !height) return;
			const aspect = state.cols / state.rows;
			let w: number;
			let h: number;
			if (width / height > aspect) {
				h = height;
				w = h * aspect;
			} else {
				w = width;
				h = w / aspect;
			}
			setBoardDims({ w, h });
		}
		measure(element, nextMatchState);
		const obs = new ResizeObserver(() => measure(element, nextMatchState));
		obs.observe(element);
		return () => obs.disconnect();
	}, [matchState]);

	if (!user || match === undefined || !matchState) {
		return (
			<main className="min-h-[100dvh] bg-[#07070b] p-8 text-white">
				Loading match…
			</main>
		);
	}
	if (match === null) {
		return (
			<main className="min-h-[100dvh] bg-[#07070b] p-8 text-white">
				Match unavailable.
			</main>
		);
	}

	const activeColor = matchState.winner
		? PLAYER_COLORS[matchState.winner]
		: PLAYER_COLORS[matchState.currentPlayer];
	const viewerColor = viewerPlayerId
		? PLAYER_COLORS[viewerPlayerId]
		: PLAYER_COLORS.p1;
	const opponentPlayerId: PlayerId | null =
		viewerPlayerId === "p1" ? "p2" : viewerPlayerId === "p2" ? "p1" : null;
	const opponentColor = opponentPlayerId
		? PLAYER_COLORS[opponentPlayerId]
		: PLAYER_COLORS.p2;
	const secondsRemaining = Math.max(0, Math.ceil(msRemaining / 1000));
	const viewerName =
		viewerPlayerId === "p1"
			? (match.player1?.displayName ?? "You")
			: viewerPlayerId === "p2"
				? (match.player2?.displayName ?? "You")
				: "You";
	const opponentName =
		viewerPlayerId === "p1"
			? (match.player2?.displayName ?? "Opponent")
			: viewerPlayerId === "p2"
				? (match.player1?.displayName ?? "Opponent")
				: "Opponent";
	const boardStyle: React.CSSProperties = boardDims
		? { width: `${boardDims.w}px`, height: `${boardDims.h}px` }
		: { width: "100%", height: "100%" };
	const cellSize = boardDims ? boardDims.w / matchState.cols : 0;
	const queuedPremoves =
		pendingPremoves.length > 0
			? pendingPremoves.map((move, index) => ({
					row: move.row,
					col: move.col,
					queuedAtTurn: match.turnNumber + index,
					queuedAtMs: index,
				}))
			: viewerPlayerId
				? getQueuedPremoves(match.queuedPremoves, viewerPlayerId)
				: [];
	const queuedPremove = queuedPremoves[0] ?? null;
	const queuedPremoveCount = queuedPremoves.length;
	const queuedPremoveLabel = queuedPremove
		? formatBoardCoordinate(queuedPremove.row, queuedPremove.col)
		: null;
	const canQueuePremove =
		preferences.enablePremoves &&
		Boolean(viewerPlayerId) &&
		viewerPlayerId !== matchState.currentPlayer &&
		!matchState.winner &&
		!settingsOpen;
	const canInteractDuringPlayback =
		Boolean(viewerPlayerId) &&
		!settingsOpen &&
		!matchState.winner &&
		(preferences.enablePremoves || viewerPlayerId === matchState.currentPlayer);
	const boardStatus = premoveNotice
		? premoveNotice
		: queuedPremove
			? queuedPremoveCount === 1
				? `Premove ${queuedPremoveLabel} queued`
				: `${queuedPremoveCount} premoves queued`
			: matchState.winner
				? "done"
				: matchState.currentPlayer === viewerPlayerId
					? "your turn"
					: preferences.enablePremoves
						? "waiting • premove ready"
						: "waiting";

	const displayState = (() => {
		if (!optimisticPlacement) return playbackState;
		if (playbackState.turnNumber !== optimisticPlacement.baseTurn) {
			return playbackState;
		}

		const { row, col, player } = optimisticPlacement;
		if (
			row < 0 ||
			col < 0 ||
			row >= playbackState.rows ||
			col >= playbackState.cols
		) {
			return playbackState;
		}

		const target = playbackState.board[row][col];
		if (target.owner !== null && target.owner !== player) {
			return playbackState;
		}

		const nextBoard = cloneBoard(playbackState.board);
		nextBoard[row][col] = {
			owner: player,
			count: nextBoard[row][col].count + 1,
		};
		return {
			...playbackState,
			board: nextBoard,
		};
	})();

	return (
		<main
			className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#07070b] px-3 pt-5 pb-4 text-white"
			style={{ fontFamily: "'Oxanium', 'Segoe UI', sans-serif" }}
		>
			<div className="mx-auto w-full max-w-5xl">
				<div
					className="w-full rounded-[22px] px-1.5 py-1.5 sm:rounded-[24px] sm:px-2 sm:py-2"
					style={{
						background:
							"linear-gradient(180deg, rgba(10,10,16,0.92), rgba(7,7,11,0.82))",
						boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
					}}
				>
					<div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-3">
						{/* Home */}
						<button
							type="button"
							className="flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] min-[480px]:h-10 min-[480px]:w-auto min-[480px]:gap-2 min-[480px]:px-3"
							style={{
								background: "rgba(255,255,255,0.02)",
								color: "rgba(255,255,255,0.66)",
								fontFamily: "'Oxanium', sans-serif",
								fontSize: "10px",
								fontWeight: 700,
								letterSpacing: "0.22em",
								textTransform: "uppercase",
							}}
							onClick={() => void navigate({ to: "/" })}
						>
							<Home size={14} strokeWidth={2} />
							<span className="hidden min-[480px]:inline">home</span>
						</button>

						{/* Center: player names + orbs + status + timer */}
						<div
							className="min-w-0 rounded-[18px] sm:rounded-[22px] px-3 py-2 sm:px-4"
							style={{ background: "rgba(255,255,255,0.025)" }}
						>
							<div className="flex items-center gap-2 sm:gap-3">
								{/* Viewer */}
								<div className="flex min-w-0 shrink items-center gap-1.5">
									<span
										className="h-3.5 w-3.5 shrink-0 rounded-full"
										style={{
											background: viewerColor,
											boxShadow: `0 0 10px color-mix(in srgb, ${viewerColor} 40%, transparent)`,
										}}
									/>
									<span className="truncate text-[13px] font-semibold text-white/90">
										{viewerName}
									</span>
								</div>

								{/* Timer + status */}
								<div className="shrink-0 flex-1 text-center">
									<div
										className={`text-base font-semibold leading-none tracking-tight ${
											!matchState.winner && secondsRemaining <= 5
												? "text-[#ff847d]"
												: "text-white/86"
										}`}
										style={{ fontFamily: "'JetBrains Mono', monospace" }}
									>
										{matchState.winner ? "—" : `${secondsRemaining}s`}
									</div>
									<div className="mt-0.5 text-[10px] uppercase tracking-[0.22em] text-white/42">
										{boardStatus}
									</div>
								</div>

								{/* Opponent */}
								<div className="flex min-w-0 shrink items-center justify-end gap-1.5">
									<span className="truncate text-[13px] font-semibold text-white/55">
										{opponentName}
									</span>
									<span
										className="h-3.5 w-3.5 shrink-0 rounded-full"
										style={{
											background: opponentColor,
											boxShadow: `0 0 10px color-mix(in srgb, ${opponentColor} 40%, transparent)`,
											opacity: 0.7,
										}}
									/>
								</div>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => setRulesOpen(true)}
								aria-label="How to play"
								className="flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] min-[480px]:h-10 min-[480px]:w-auto min-[480px]:gap-2 min-[480px]:px-3"
								style={{
									background: "rgba(255,255,255,0.02)",
									color: "rgba(255,255,255,0.66)",
									fontFamily: "'Oxanium', sans-serif",
									fontSize: "10px",
									fontWeight: 700,
									letterSpacing: "0.22em",
									textTransform: "uppercase",
								}}
							>
								<HelpCircle size={14} strokeWidth={2} />
								<span className="hidden min-[480px]:inline">rules</span>
							</button>
							<button
								type="button"
								onClick={() => setSettingsOpen(true)}
								className="flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] min-[480px]:h-10 min-[480px]:w-auto min-[480px]:gap-2 min-[480px]:px-3"
								style={{
									background: "rgba(255,255,255,0.02)",
									color: "rgba(255,255,255,0.66)",
									fontFamily: "'Oxanium', sans-serif",
									fontSize: "10px",
									fontWeight: 700,
									letterSpacing: "0.22em",
									textTransform: "uppercase",
								}}
							>
								<span className="hidden min-[480px]:inline">prefs</span>
								<span className="min-[480px]:hidden">P</span>
							</button>
							<button
								type="button"
								disabled={resignPending || Boolean(matchState.winner)}
								aria-hidden={Boolean(matchState.winner)}
								tabIndex={matchState.winner ? -1 : undefined}
								className={`flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-55 min-[480px]:h-10 min-[480px]:w-auto min-[480px]:gap-2 min-[480px]:px-3 ${
									matchState.winner ? "pointer-events-none invisible" : ""
								}`}
								style={{
									background: "rgba(224,92,58,0.10)",
									color: "rgba(255,159,134,0.88)",
									fontFamily: "'Oxanium', sans-serif",
									fontSize: "10px",
									fontWeight: 700,
									letterSpacing: "0.22em",
									textTransform: "uppercase",
								}}
								onClick={async () => {
									if (
										!window.confirm(
											"Resign this match? This immediately gives the win to your opponent.",
										)
									)
										return;
									setResignPending(true);
									try {
										await resignMatch({ matchId: match._id });
									} finally {
										setResignPending(false);
									}
								}}
							>
								<Flag size={14} strokeWidth={2} />
								<span className="hidden min-[480px]:inline">
									{resignPending ? "…" : "resign"}
								</span>
							</button>
						</div>
					</div>
				</div>
			</div>

			<div
				ref={containerRef}
				className="relative flex-1 min-h-0 flex items-center justify-center"
			>
				<div style={boardStyle} className="relative">
					<AtomRBoard
						state={displayState}
						legalState={matchState}
						activeColor={activeColor}
						isAnimating={isAnimating}
						activeExplosionKeys={activeExplosionKeys}
						activeCaptureKeys={activeCaptureKeys}
						activeExplosions={activeExplosions}
						cellSize={cellSize}
						lastMove={lastMove}
						legalPlayer={canQueuePremove ? viewerPlayerId : null}
						interactablePlayer={viewerPlayerId}
						allowInteractionWhileAnimating={canInteractDuringPlayback}
						queuedMoves={queuedPremoves}
						queuedPlayer={viewerPlayerId}
						keyboardNavigationEnabled={!matchState.winner}
						canPlay={
							!matchState.winner &&
							Boolean(viewerPlayerId) &&
							(viewerPlayerId === matchState.currentPlayer ||
								canQueuePremove) &&
							optimisticPlacement === null
						}
						onPlay={(row, col) => {
							if (!match || !viewerPlayerId) return;

							if (optimisticPlacement !== null) {
								const validationState = {
									...matchState,
									currentPlayer: viewerPlayerId,
								};

								setPendingPremoves((current) => {
									const currentQueuedPremoves = toStoredQueuedPremoves(
										current,
										viewerPlayerId,
									);

									if (
										!canAppendQueuedPremove(
											validationState,
											viewerPlayerId,
											currentQueuedPremoves,
											row,
											col,
										)
									) {
										flashPremoveNotice("Premove failed");
										return current;
									}

									flashPremoveNotice(
										`Premove ${formatBoardCoordinate(row, col)} queued`,
									);
									return getQueuedPremoves(
										appendQueuedPremove(
											currentQueuedPremoves,
											viewerPlayerId,
											createQueuedPremove(
												row,
												col,
												match.turnNumber + current.length,
												Date.now(),
											),
										),
										viewerPlayerId,
									).map((move) => ({ row: move.row, col: move.col }));
								});
								return;
							}

							if (canQueuePremove) {
								const validationState = {
									...matchState,
									currentPlayer: viewerPlayerId,
								};

								setPendingPremoves((current) => {
									const currentQueuedPremoves = toStoredQueuedPremoves(
										current,
										viewerPlayerId,
									);

									if (
										!canAppendQueuedPremove(
											validationState,
											viewerPlayerId,
											currentQueuedPremoves,
											row,
											col,
										)
									) {
										flashPremoveNotice("Premove failed");
										return current;
									}

									flashPremoveNotice(
										`Premove ${formatBoardCoordinate(row, col)} queued`,
									);
									return getQueuedPremoves(
										appendQueuedPremove(
											currentQueuedPremoves,
											viewerPlayerId,
											createQueuedPremove(
												row,
												col,
												match.turnNumber + current.length,
												Date.now(),
											),
										),
										viewerPlayerId,
									).map((move) => ({ row: move.row, col: move.col }));
								});
								return;
							}

							if (
								!viewerPlayerId ||
								viewerPlayerId !== matchState.currentPlayer ||
								optimisticPlacement !== null
							)
								return;

							setOptimisticPlacement({
								row,
								col,
								player: viewerPlayerId,
								turnNumber: match.turnNumber + 1,
								baseTurn: match.turnNumber,
								didExplode:
									matchState.board[row][col].count + 1 >=
									getCapacity(row, col, matchState.rows, matchState.cols),
							});

							void submitMove({
								matchId: match._id,
								row,
								col,
							}).catch(() => {
								setOptimisticPlacement(null);
								if (matchState) {
									resetToState(matchState);
								}
							});
						}}
					/>
					<GameOverlay
						state={playbackState}
						onReset={() => {
							void navigate({ to: "/play/online" });
						}}
						resetLabel="leave match"
						playerNames={{
							p1: match.player1?.displayName ?? "Player 1",
							p2: match.player2?.displayName ?? "Player 2",
						}}
					/>
				</div>
			</div>
			<GameSettings
				open={settingsOpen}
				rows={matchState.rows}
				cols={matchState.cols}
				enablePremoves={preferences.enablePremoves}
				onEnablePremovesChange={(enabled) => {
					setEnablePremoves(enabled);
					if (!enabled && match && viewerPlayerId) {
						void clearPremove({ matchId: match._id });
					}
				}}
				onApply={() => {
					// Online match settings do not mutate board size mid-match.
				}}
				onClose={() => setSettingsOpen(false)}
			/>
			<OnboardingOverlay
				forceOpen={rulesOpen}
				autoShow={false}
				onClose={() => setRulesOpen(false)}
			/>
		</main>
	);
}
