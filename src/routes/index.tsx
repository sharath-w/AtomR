import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import AtomRBoard from "#/features/atomr/components/AtomRBoard";
import { PLAYER_COLORS } from "#/features/atomr/constants";
import { pickRandomLegalMove } from "#/features/atomr/engine";
import { useAtomRGame } from "#/features/atomr/useAtomRGame";
import { authClient } from "#/lib/auth-client";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/")({
	head: () => ({
		meta: [
			{ title: "AtomR" },
			{
				name: "description",
				content:
					"Deterministic board tactics with cascading orb explosions. Local, online, CPU, and training modes.",
			},
		],
	}),
	component: HomePage,
});

const F = "'Oxanium', 'Segoe UI', sans-serif";

const MOVE_INTERVAL_MS = 1400;
const WIN_RESET_MS = 2000;
const DEMO_CELL_SIZE = 56;

function useIsPortrait() {
	const [portrait, setPortrait] = useState(false);
	useEffect(() => {
		const update = () => setPortrait(window.innerHeight > window.innerWidth);
		update();
		window.addEventListener("resize", update);
		return () => window.removeEventListener("resize", update);
	}, []);
	return portrait;
}

function DemoBoard() {
	const portrait = useIsPortrait();
	const rows = portrait ? 4 : 3;
	const cols = portrait ? 3 : 4;
	const game = useAtomRGame(rows, cols, 2, 0);
	const {
		state,
		handleMove,
		reset,
		isAnimating,
		lastMove,
		activeExplosionKeys,
		activeCaptureKeys,
		activeExplosions,
	} = game;

	useEffect(() => {
		if (isAnimating) return;
		if (state.winner) {
			const t = window.setTimeout(() => reset(), WIN_RESET_MS);
			return () => window.clearTimeout(t);
		}
		const t = window.setTimeout(() => {
			const move = pickRandomLegalMove(state);
			if (move) handleMove(move);
		}, MOVE_INTERVAL_MS);
		return () => window.clearTimeout(t);
	}, [state, isAnimating, handleMove, reset]);

	return (
		<div
			className="relative w-full"
			style={{
				width: "min(62vw, 460px)",
				aspectRatio: `${cols} / ${rows}`,
			}}
		>
			<AtomRBoard
				state={state}
				activeColor={PLAYER_COLORS[state.currentPlayer]}
				isAnimating={isAnimating}
				activeExplosionKeys={activeExplosionKeys}
				activeCaptureKeys={activeCaptureKeys}
				activeExplosions={activeExplosions}
				cellSize={DEMO_CELL_SIZE}
				lastMove={lastMove}
				canPlay={false}
				onPlay={() => {}}
			/>
		</div>
	);
}

function HomePage() {
	const navigate = useNavigate();
	const { data: session } = authClient.useSession();
	const activeMatch = useQuery(
		api.online.getMyActiveMatch,
		session?.user ? {} : "skip",
	);

	useEffect(() => {
		if (!activeMatch?.matchId) return;
		void navigate({
			to: "/play/match/$matchId",
			params: { matchId: activeMatch.matchId },
			replace: true,
		});
	}, [activeMatch?.matchId, navigate]);

	if (activeMatch?.matchId) {
		return (
			<main
				style={{
					background: "#08090d",
					minHeight: "100dvh",
					display: "grid",
					placeItems: "center",
					fontFamily: F,
					color: "rgba(255,255,255,0.68)",
					letterSpacing: "0.2em",
					textTransform: "uppercase",
					fontSize: 12,
				}}
			>
				Rejoining active match…
			</main>
		);
	}

	return (
		<main
			className="relative min-h-[100dvh] overflow-x-hidden bg-[#08090d] text-white max-[960px]:min-h-0"
			style={{ fontFamily: F }}
		>
			<div
				className="pointer-events-none fixed inset-0 z-0"
				style={{
					backgroundImage:
						"radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
					backgroundSize: "28px 28px",
				}}
			/>
			<div className="pointer-events-none fixed top-[-18%] left-[-12%] z-0 h-[680px] w-[680px] rounded-full bg-[radial-gradient(circle,rgba(58,204,224,0.08)_0%,transparent_68%)]" />
			<div className="pointer-events-none fixed top-[-12%] right-[-14%] z-0 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(224,92,58,0.08)_0%,transparent_68%)]" />

			<div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-[1220px] flex-col justify-center px-4 py-8 sm:px-6 sm:py-12 max-[960px]:min-h-0 max-[960px]:py-16">
				<div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
					<div className="order-2 flex justify-center lg:order-1 lg:justify-start">
						<DemoBoard />
					</div>

					<section className="order-1 max-w-[780px] lg:order-2">
						<h1 className="max-w-[12ch] text-[3rem] leading-[0.9] font-semibold tracking-[-0.08em] text-white sm:text-[4.2rem] lg:text-[5.4rem]">
							Turn-based cascading play.
						</h1>
						<p className="mt-5 max-w-[36ch] text-[15px] leading-7 text-white/56 sm:text-[16px]">
							Place orbs. Hit critical mass. Convert the board in one move.
						</p>

						<div className="mt-8 flex flex-wrap gap-3">
							<Link
								to="/play"
								className="inline-flex h-12 items-center justify-center gap-2 rounded-[18px] bg-[rgba(224,92,58,0.16)] px-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-white no-underline transition hover:bg-[rgba(224,92,58,0.24)]"
							>
								Play
								<ArrowRight size={15} strokeWidth={1.9} />
							</Link>
							<Link
								to="/play"
								className="inline-flex h-12 items-center justify-center rounded-[18px] bg-white/[0.04] px-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/68 no-underline transition hover:bg-white/[0.07] hover:text-white/82"
							>
								How to play
							</Link>
						</div>
					</section>
				</div>
			</div>
		</main>
	);
}
