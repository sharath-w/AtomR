import { Link, useRouterState } from "@tanstack/react-router";
import { authClient } from "#/lib/auth-client";
import AtomRMark from "./brand/AtomRMark";

const F = "'Oxanium', 'Segoe UI', sans-serif";

const NAV_ITEMS = [
	{ to: "/" as const, label: "Home", exact: true },
	{ to: "/play" as const, label: "Play", exact: false },
] as const;

export default function TopBar() {
	const { data: session, isPending } = authClient.useSession();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const userLabel = session?.user.name || session?.user.email?.split("@")[0];
	const userInitial = session?.user.name?.charAt(0).toUpperCase() ?? "U";

	return (
		<header
			className="fixed inset-x-0 top-0 z-40 h-14 border-b border-white/[0.06] bg-[rgba(8,9,13,0.72)] backdrop-blur-xl"
			style={{ fontFamily: F }}
		>
			<div className="mx-auto flex h-full w-full max-w-[1280px] items-center justify-between gap-4 px-4 max-[640px]:px-3">
				{/* Logo + wordmark */}
				<Link
					to="/"
					className="flex shrink-0 items-center gap-2.5 no-underline"
				>
					<AtomRMark size={22} title="AtomR" />
					<span className="text-[15px] font-semibold tracking-[0.09em] text-white max-[520px]:text-[14px]">
						AtomR
					</span>
				</Link>

				{/* Nav links — hidden on mobile */}
				<nav className="flex flex-1 items-center justify-center gap-1 max-[640px]:hidden">
					{NAV_ITEMS.map(({ to, label, exact }) => {
						const isActive = exact ? pathname === to : pathname.startsWith(to);
						return (
							<Link
								key={to}
								to={to}
								className="inline-flex h-9 items-center rounded-[12px] px-4 text-[12px] font-semibold uppercase tracking-[0.16em] no-underline transition-colors duration-200"
								style={{
									color: isActive ? "white" : "rgba(255,255,255,0.55)",
									background: isActive
										? "rgba(255,255,255,0.05)"
										: "transparent",
								}}
							>
								{label}
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
								{session.user.image ? (
									<img
										src={session.user.image}
										alt={session.user.name ?? "User"}
										className="h-full w-full object-cover"
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
										headers: { "Content-Type": "application/json" },
										body: "{}",
									});
									window.location.href = "/";
								}}
								className="inline-flex h-9 items-center justify-center rounded-[12px] bg-white/[0.05] px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/62 transition hover:bg-white/[0.08] hover:text-white/84 active:scale-[0.98] max-[520px]:hidden"
							>
								Sign Out
							</button>
							<span className="hidden truncate text-[12px] font-semibold tracking-[0.06em] text-white/72 max-[768px]:block max-[520px]:hidden">
								{userLabel}
							</span>
						</>
					) : (
						<Link
							to="/sign-in"
							className="inline-flex h-9 items-center justify-center rounded-[12px] bg-white/[0.05] px-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/74 no-underline transition hover:bg-white/[0.08] active:scale-[0.98]"
						>
							Sign In
						</Link>
					)}
				</div>
			</div>
		</header>
	);
}
