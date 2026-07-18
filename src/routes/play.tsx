import {
	createFileRoute,
	Link,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import {
	Bot,
	BrainCircuit,
	ChevronRight,
	Monitor,
	Swords,
	Wifi,
} from "lucide-react";
import type { CSSProperties, ComponentType } from "react";

export const Route = createFileRoute("/play")({
	head: () => ({
		meta: [
			{ title: "AtomR" },
			{ name: "description", content: "Choose a mode and launch." },
		],
	}),
	component: PlayRoute,
});

type ModeTint = {
	/** badge background tint */
	tint: string;
	/** icon/text foreground */
	fg: string;
	/** hover glow */
	glow: string;
	/** left accent rail */
	rail: string;
};

type Mode = {
	to: "/play/local" | "/play/online" | "/play/training" | "/play/ai" | "/play/ai-battle";
	title: string;
	kicker: string;
	copy: string;
	meta?: string;
	icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
	tint: ModeTint;
};

const LOCAL: Mode = {
	to: "/play/local",
	title: "Local",
	kicker: "No setup",
	copy: "Pass the device. Shared turns, same screen.",
	meta: "2–8 players · no signup",
	icon: Monitor,
	tint: {
		tint: "rgba(255,255,255,0.08)",
		fg: "rgba(255,255,255,0.86)",
		glow: "rgba(255,255,255,0.10)",
		rail: "rgba(255,255,255,0.55)",
	},
};

const ONLINE: Mode = {
	to: "/play/online",
	title: "Online",
	kicker: "Realtime",
	copy: "Quick match or private room.",
	meta: "sign in required",
	icon: Wifi,
	tint: {
		tint: "rgba(224,92,58,0.16)",
		fg: "rgba(255,138,108,0.92)",
		glow: "rgba(224,92,58,0.22)",
		rail: "rgba(224,92,58,0.85)",
	},
};

const VS_CPU: Mode = {
	to: "/play/ai",
	title: "vs CPU",
	kicker: "Solo",
	copy: "Play the bot. Tune the heat.",
	meta: "difficulty slider",
	icon: Bot,
	tint: {
		tint: "rgba(101,214,114,0.16)",
		fg: "rgba(140,224,150,0.92)",
		glow: "rgba(101,214,114,0.22)",
		rail: "rgba(101,214,114,0.85)",
	},
};

const TRAINING: Mode = {
	to: "/play/training",
	title: "Training",
	kicker: "Coach",
	copy: "Ghost hints every turn.",
	icon: BrainCircuit,
	tint: {
		tint: "rgba(116,188,255,0.16)",
		fg: "rgba(150,202,255,0.92)",
		glow: "rgba(116,188,255,0.22)",
		rail: "rgba(116,188,255,0.85)",
	},
};

const AI_BATTLE: Mode = {
	to: "/play/ai-battle",
	title: "AI Battle",
	kicker: "Sim",
	copy: "Let bots run the board.",
	icon: Swords,
	tint: {
		tint: "rgba(255,255,255,0.08)",
		fg: "rgba(255,255,255,0.80)",
		glow: "rgba(255,255,255,0.12)",
		rail: "rgba(255,255,255,0.55)",
	},
};

function PlayRoute() {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});

	return pathname === "/play" ? <PlayPage /> : <Outlet />;
}

function ModeBadge({
	icon: Icon,
	tint,
	size = 40,
}: {
	icon: Mode["icon"];
	tint: ModeTint;
	size?: number;
}) {
	return (
		<div
			className="flex shrink-0 items-center justify-center rounded-[14px]"
			style={{
				width: size,
				height: size,
				background: tint.tint,
				boxShadow: `inset 0 0 0 1px ${tint.tint}`,
			}}
		>
			<span style={{ color: tint.fg }}>
				<Icon size={Math.round(size * 0.45)} strokeWidth={1.9} />
			</span>
		</div>
	);
}

/** Primary card: LOCAL — largest, leftmost, full row height, with a CTA. */
function PrimaryCard({ mode }: { mode: Mode }) {
	const { title, kicker, copy, meta, icon, tint, to } = mode;
	return (
		<Link
			to={to}
			className="group relative flex h-full min-h-[280px] flex-col justify-between overflow-hidden rounded-[20px] no-underline"
			style={{
				background:
					"linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
				boxShadow:
					"inset 0 0 0 1px rgba(255,255,255,0.08), 0 18px 40px -24px rgba(0,0,0,0.8)",
			}}
		>
			<div
				className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100"
				style={{
					background: `radial-gradient(circle at 20% 0%, ${tint.glow}, transparent 55%)`,
				}}
			/>
			<div
				className="pointer-events-none absolute top-0 bottom-0 left-0 w-[3px]"
				style={{ background: tint.rail }}
			/>

			<div className="relative flex flex-col gap-5 p-6 sm:p-7">
				<div className="flex items-center justify-between">
					<ModeBadge icon={icon} tint={tint} size={52} />
					<span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40">
						{kicker}
					</span>
				</div>

				<div>
					<h2 className="text-[2.4rem] leading-[0.9] font-semibold tracking-[-0.06em] text-white sm:text-[2.9rem]">
						{title.toUpperCase()}
					</h2>
					<p className="mt-3 text-[0.98rem] leading-6 text-white/62">{copy}</p>
					{meta ? (
						<p className="mt-2 text-[11px] font-medium uppercase tracking-[0.2em] text-white/36">
							{meta}
						</p>
					) : null}
				</div>
			</div>

			<div className="relative px-6 pb-6 sm:px-7 sm:pb-7">
				<div
					className="inline-flex items-center gap-2 rounded-[12px] px-5 py-3 transition duration-200 group-hover:brightness-110"
					style={{
						background: "rgba(255,255,255,0.92)",
						color: "#08090d",
						boxShadow: "0 8px 24px -10px rgba(255,255,255,0.4)",
					}}
				>
					<span className="text-[0.92rem] font-semibold uppercase tracking-[0.18em]">
						Start
					</span>
					<ChevronRight size={16} strokeWidth={2.4} />
				</div>
			</div>
		</Link>
	);
}

/** Secondary / tertiary card: compact, icon + title + copy, chevron. */
function ModeCard({ mode }: { mode: Mode }) {
	const { title, kicker, copy, meta, icon, tint, to } = mode;
	return (
		<Link
			to={to}
			className="group relative flex h-full min-h-[150px] flex-col justify-between overflow-hidden rounded-[16px] no-underline"
			style={{
				background:
					"linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015))",
				boxShadow:
					"inset 0 0 0 1px rgba(255,255,255,0.07), 0 12px 30px -22px rgba(0,0,0,0.8)",
			}}
		>
			<div
				className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100"
				style={{
					background: `radial-gradient(circle at 80% 0%, ${tint.glow}, transparent 60%)`,
				}}
			/>
			<div
				className="pointer-events-none absolute top-0 bottom-0 left-0 w-[2px]"
				style={{ background: tint.rail }}
			/>

			<div className="relative flex items-start justify-between gap-3 p-5">
				<ModeBadge icon={icon} tint={tint} size={42} />
				<span className="text-[9px] font-semibold uppercase tracking-[0.28em] text-white/36">
					{kicker}
				</span>
			</div>

			<div className="relative flex items-end justify-between gap-3 px-5 pb-5">
				<div className="min-w-0">
					<h3 className="text-[1.35rem] leading-none font-semibold tracking-[-0.04em] text-white">
						{title}
					</h3>
					<p className="mt-2 text-[0.86rem] leading-5 text-white/52">{copy}</p>
					{meta ? (
						<p className="mt-2 text-[10px] font-medium uppercase tracking-[0.2em] text-white/32">
							{meta}
						</p>
					) : null}
				</div>
				<div className="flex h-8 w-8 shrink-0 items-center justify-center text-white/34 transition duration-300 group-hover:text-white/76">
					<ChevronRight size={15} strokeWidth={1.9} />
				</div>
			</div>
		</Link>
	);
}

function PlayPage() {
	const mainStyle: CSSProperties = {
		background: "#08090d",
		fontFamily: "'Oxanium', 'Segoe UI', sans-serif",
	};

	return (
		<main
			className="min-h-[100dvh] px-4 py-6 sm:px-6 sm:py-8 max-[960px]:min-h-0"
			style={mainStyle}
		>
			<div className="mx-auto flex max-w-[1180px] flex-col gap-6">
				<div className="flex items-end justify-between gap-4 px-1">
					<div>
						<p className="text-[10px] uppercase tracking-[0.42em] text-white/28">
							Play
						</p>
						<h1
							className="mt-2 text-[2.05rem] leading-[0.92] font-semibold tracking-[-0.07em] text-white sm:text-[2.7rem]"
							style={{ fontFamily: "'Oxanium', 'Segoe UI', sans-serif" }}
						>
							Pick a mode.
						</h1>
					</div>
					<p className="hidden max-w-[22ch] text-right text-[12px] leading-5 text-white/38 md:block">
						Five ways in. One tap to board.
					</p>
				</div>

				{/* Primary + secondary row */}
				<section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
					<PrimaryCard mode={LOCAL} />
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<ModeCard mode={ONLINE} />
						<ModeCard mode={VS_CPU} />
					</div>
				</section>

				{/* Tertiary row */}
				<section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<ModeCard mode={TRAINING} />
					<ModeCard mode={AI_BATTLE} />
				</section>
			</div>
		</main>
	);
}
