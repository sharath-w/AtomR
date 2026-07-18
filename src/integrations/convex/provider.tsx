import type { AuthClient } from "@convex-dev/better-auth/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { ConvexProvider } from "convex/react";
import type { ReactNode } from "react";
import { authClient } from "#/lib/auth-client";

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;
if (!CONVEX_URL) {
	console.error("missing envar CONVEX_URL");
}
const convexQueryClient = new ConvexQueryClient(CONVEX_URL);

export default function AppConvexProvider({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<ConvexProvider client={convexQueryClient.convexClient}>
			<ConvexBetterAuthProvider
				client={convexQueryClient.convexClient}
				authClient={authClient as unknown as AuthClient}
			>
				{children}
			</ConvexBetterAuthProvider>
		</ConvexProvider>
	);
}
