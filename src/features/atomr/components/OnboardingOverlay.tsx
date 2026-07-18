import { useEffect, useRef, useState } from "react";
import { PLAYER_COLORS } from "../constants";

const STORAGE_KEY = "atomr:onboarded";

const FOCUSABLE_SELECTOR =
	'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function hasOnboarded(): boolean {
	if (typeof window === "undefined") return false;
	try {
		return window.localStorage.getItem(STORAGE_KEY) === "1";
	} catch {
		return false;
	}
}

function markOnboarded() {
	try {
		window.localStorage.setItem(STORAGE_KEY, "1");
	} catch {
		// Persistence failures must not block gameplay.
	}
}

type OnboardingOverlayProps = {
	/** Force open regardless of localStorage (e.g. when user taps "?"). */
	forceOpen?: boolean;
	onClose: () => void;
};

const STEPS = [
	{
		title: "place orbs",
		body: "tap any empty cell, or a cell you already own. you can't place on enemy cells.",
		diagram: "place",
	},
	{
		title: "critical mass",
		body: "a cell is critical when one more orb would explode it. corners hold 2, edges 3, inner 4.",
		diagram: "critical",
	},
	{
		title: "cascade",
		body: "when a cell explodes, it sends orbs to neighbors and converts them to your color. chains can sweep the board.",
		diagram: "cascade",
	},
] as const;

function MiniDiagram({ kind }: { kind: (typeof STEPS)[number]["diagram"] }) {
	const p1 = PLAYER_COLORS.p1;
	const p2 = PLAYER_COLORS.p2;
	if (kind === "place") {
		return (
			<div className="flex items-center gap-3">
				<CellDemo tint="empty" />
				<span className="font-mono text-[10px] text-white/40">→</span>
				<CellDemo tint="owned" color={p1} orbCount={1} />
			</div>
		);
	}
	if (kind === "critical") {
		return (
			<div className="flex items-center gap-3">
				<CellDemo tint="owned" color={p1} orbCount={1} critical />
				<span className="font-mono text-[10px] text-white/40">→</span>
				<CellDemo tint="owned" color={p2} orbCount={2} critical />
			</div>
		);
	}
	// cascade
	return (
		<div className="flex items-center gap-2">
			<CellDemo tint="owned" color={p1} orbCount={2} critical />
			<span className="font-mono text-[10px] text-white/40">→</span>
			<CellDemo tint="exploding" color={p1} />
			<span className="font-mono text-[10px] text-white/40">→</span>
			<CellDemo tint="owned" color={p1} orbCount={1} />
			<CellDemo tint="owned" color={p1} orbCount={1} />
		</div>
	);
}

function CellDemo({
	tint,
	color,
	orbCount = 0,
	critical = false,
}: {
	tint: "empty" | "owned" | "exploding";
	color?: string;
	orbCount?: number;
	critical?: boolean;
}) {
	const bg =
		tint === "empty"
			? "#0c0d14"
			: tint === "exploding"
				? color
					? `color-mix(in srgb, ${color} 20%, #07070b)`
					: "#07070b"
				: color
					? `color-mix(in srgb, ${color} 10%, #11121a)`
					: "#11121a";
	return (
		<div
			className="relative h-12 w-12 rounded-[4px]"
			style={{
				background: bg,
				boxShadow: critical
					? `inset 0 0 0 1px ${color ?? "#fff"}, 0 0 12px ${color ?? "#fff"}55`
					: "inset 0 0 0 1px rgba(255,255,255,0.05)",
			}}
		>
			{orbCount > 0 && color && (
				<span
					className="cr-orb-plasma absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full"
					style={{ "--orb-color": color } as React.CSSProperties}
				/>
			)}
		</div>
	);
}

export default function OnboardingOverlay({
	forceOpen = false,
	onClose,
}: OnboardingOverlayProps) {
	const [open, setOpen] = useState(false);
	const [step, setStep] = useState(0);
	const panelRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<Element | null>(null);

	useEffect(() => {
		if (forceOpen) {
			setOpen(true);
			setStep(0);
			return;
		}
		// forceOpen flipped false (e.g. trigger tapped again): dismiss the overlay.
		setOpen(false);
		if (hasOnboarded()) return;
		// Show after a brief delay so the board settles.
		const id = window.setTimeout(() => setOpen(true), 600);
		return () => window.clearTimeout(id);
	}, [forceOpen]);

	const handleClose = useCallback(() => {
		markOnboarded();
		setOpen(false);
		onClose();
	}, [onClose]);

	useEffect(() => {
		if (!open) return;
		// Remember what had focus before the overlay opened so we can restore it.
		triggerRef.current = document.activeElement;
		// Move focus into the dialog: first focusable element, else the panel itself.
		const panel = panelRef.current;
		if (panel) {
			const first = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
			(first ?? panel).focus();
		}

		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") {
				handleClose();
				return;
			}
			if (e.key !== "Tab") return;
			const panel = panelRef.current;
			if (!panel) return;
			const focusables = Array.from(
				panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
			).filter((el) => !el.hasAttribute("disabled"));
			const active = document.activeElement as HTMLElement | null;
			if (focusables.length === 0) {
				e.preventDefault();
				panel.focus();
				return;
			}
			const first = focusables[0];
			const last = focusables[focusables.length - 1];
			if (e.shiftKey) {
				if (active === first || !panel.contains(active)) {
					e.preventDefault();
					last.focus();
				}
			} else {
				if (active === last || !panel.contains(active)) {
					e.preventDefault();
					first.focus();
				}
			}
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			// Restore focus to the element that opened the overlay.
			if (triggerRef.current instanceof HTMLElement) {
				triggerRef.current.focus();
			}
			triggerRef.current = null;
		};
	}, [open]);

	function handleClose() {
		markOnboarded();
		setOpen(false);
		onClose();
	}

	if (!open) return null;

	const current = STEPS[step];
	const isLast = step === STEPS.length - 1;

	return (
		<>
			<button
				type="button"
				aria-label="Close onboarding"
				className="fixed inset-0 z-50"
				style={{
					background: "rgba(7,7,11,0.82)",
					backdropFilter: "blur(10px)",
					cursor: "default",
				}}
				onClick={handleClose}
			/>
			<div
				role="dialog"
				aria-modal="true"
				aria-label="How to play"
				className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
			>
				<div
					ref={panelRef}
					tabIndex={-1}
					className="relative mx-4 w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5 pointer-events-auto"
					style={{
						background: "#0d0d1a",
						border: "1px solid rgba(255,255,255,0.07)",
						boxShadow: "0 32px 80px rgba(0,0,0,0.75)",
						outline: "none",
					}}
				>
					<div className="flex items-center justify-between">
						<span
							style={{
								fontFamily: "'Oxanium', sans-serif",
								fontSize: "10px",
								color: "rgba(255,255,255,0.3)",
								textTransform: "uppercase",
								letterSpacing: "0.25em",
							}}
						>
							how to play · {step + 1}/{STEPS.length}
						</span>
						<button
							type="button"
							onClick={handleClose}
							aria-label="Close onboarding"
							className="transition-opacity hover:opacity-60 active:scale-95"
							style={{
								fontFamily: "'JetBrains Mono', monospace",
								fontSize: "18px",
								lineHeight: 1,
								color: "rgba(255,255,255,0.25)",
							}}
						>
							×
						</button>
					</div>

					<div className="flex justify-center py-2">
						<MiniDiagram kind={current.diagram} />
					</div>

					<div className="flex flex-col gap-2">
						<h3
							className="text-xl font-semibold tracking-tight"
							style={{
								fontFamily: "'Oxanium', sans-serif",
								color: "rgba(255,255,255,0.92)",
							}}
						>
							{current.title}
						</h3>
						<p className="text-sm leading-6 text-white/56">{current.body}</p>
					</div>

					<div className="flex items-center justify-between">
						<button
							type="button"
							onClick={handleClose}
							className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/30 transition hover:text-white/50"
							style={{ fontFamily: "'Oxanium', sans-serif" }}
						>
							skip
						</button>
						<button
							type="button"
							onClick={() => {
								if (isLast) {
									handleClose();
								} else {
									setStep((s) => s + 1);
								}
							}}
							className="rounded-full px-6 py-2.5 text-[11px] font-bold uppercase tracking-[0.25em] transition-transform hover:scale-[1.02] active:scale-[0.97]"
							style={{
								fontFamily: "'Oxanium', sans-serif",
								background: "oklch(0.72 0.19 23)",
								color: "#07070b",
								boxShadow: "0 0 18px oklch(0.72 0.19 23 / 0.28)",
							}}
						>
							{isLast ? "start" : "next"}
						</button>
					</div>
				</div>
			</div>
		</>
	);
}
