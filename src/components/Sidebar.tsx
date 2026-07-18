import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "#/lib/auth-client";
import AtomRMark from "./brand/AtomRMark";

const F = "'Oxanium', 'Segoe UI', sans-serif";

const FOCUS_RING =
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70";

const NAV_ITEMS = [
	{
		to: "/" as const,
		label: "Home",
		exact: true,
		icon: (
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth={2}
				strokeLinecap="round"
				strokeLinejoin="round"
				className="h-4 w-4"
				role="img"
				aria-label="Home"
			>
				<path d="M3 11.5 12 4l9 7.5" />
				<path d="M5 10v10h14V10" />
			</svg>
		),
	},
	{
		to: "/play" as const,
		label: "Play",
		exact: false,
		icon: (
			<svg
				viewBox="0 0 24 24"
				fill="currentColor"
				className="h-4 w-4"
				role="img"
				aria-label="Play"
			>
				<path d="M8 5v14l11-7z" />
			</svg>
		),
	},
] as const;

export default function TopBar() {
	const { data: session, isPending } = authClient.useSession();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const [imgError, setImgError] = useState(false);

	const userLabel = session?.user.name || session?.user.email?.split("@")[0];
	const userInitial =
		session?.user.name?.charAt(0).toUpperCase() ||
		session?.user.email?.charAt(0).toUpperCase() ||
		"U";

	return (
		<header
			className="fixed inset-x-0 top-0 z-40 h-14 border-b border-white/[0.06] bg-[rgba(8,9,13,0.72)] backdrop-blur-xl"
			style={{ fontFamily: F }}
		>
			<div className="mx-auto flex h-full w-full max-w-[1280px] items-center justify-between gap-4 px-4 max-[640px]:px-3">
				{/* Logo + wordmark */}
				<Link
					to="/"
					className={`flex shrink-0 items-center gap-2.5 no-underline ${FOCUS_RING} rounded-[8px]`}
				>
					<AtomRMark size={22} title="AtomR" />
					<span className="text-[15px] font-semibold tracking-[0.09em] text-white max-[520px]:text-[14px]">
						AtomR
					</span>
				</Link>

				{/* Nav links — icon-only on mobile, label on desktop */}
				<nav className="flex flex-1 items-center justify-center gap-1">
					{NAV_ITEMS.map(({ to, label, exact, icon }) => {
						const isActive = exact ? pathname === to : pathname.startsWith(to);
						return (
							<Link
								key={to}
								to={to}
								aria-current={isActive ? "page" : undefined}
								aria-label={label}
								className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-[12px] px-4 text-[12px] font-semibold uppercase tracking-[0.16em] no-underline transition-colors duration-200 max-[640px]:px-2.5 ${FOCUS_RING}`}
								style={{
									color: isActive ? "white" : "rgba(255,255,255,0.55)",
									background: isActive
										? "rgba(255,255,255,0.05)"
										: "transparent",
								}}
							>
								<span className="md:hidden">{icon}</span>
								<span className="hidden md:inline">{label}</span>
							</Link>
						);
					})}
				</nav>

				{/* Auth chip */}
				<div className="flex shrink-0 items-center gap-2">
					{isPending ? (
						<div className="h-9 w-24 rounded-[12px] bg-white/[0.04]" />
					) : session?.user ? (
						<>
							<div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.06]">
								{session.user.image && !imgError ? (
									<img
										src={session.user.image}
										alt={session.user.name ?? "User"}
										className="h-full w-full object-cover"
										onError={() => setImgError(true)}
									/>
								) : (
									<span className="text-[13px] font-bold text-white/82">
										{userInitial}
									</span>
								)}
							</div>
							<button
								type="button"
								onClick={async () => {
									await fetch("/api/auth/sign-out", {
										method: "POST",
										credentials: "include",
										headers: {
											"Content-Type": "application/json",
										},
										body: "{}",
									});
									window.location.href = "/";
								}}
								className={`inline-flex h-9 items-center justify-center rounded-[12px] bg-white/[0.05] px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/62 transition hover:bg-white/[0.08] hover:text-white/84 active:scale-[0.98] max-[520px]:px-2.5 ${FOCUS_RING}`}
							>
								Sign Out
							</button>
							<span className="hidden truncate text-[12px] font-semibold tracking-[0.06em] text-white/72 md:block">
								{userLabel}
							</span>
						</>
					) : (
						<Link
							to="/sign-in"
							className={`inline-flex h-9 items-center justify-center rounded-[12px] bg-white/[0.05] px-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/74 no-underline transition hover:bg-white/[0.08] active:scale-[0.98] ${FOCUS_RING}`}
						>
							Sign In
						</Link>
					)}
				</div>
			</div>
		</header>
	);
}
