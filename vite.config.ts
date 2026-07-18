import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const config = defineConfig({
	ssr: {
		noExternal: ["@convex-dev/better-auth"],
	},
	server: {
		watch: {
			ignored: ["**/.convex/**", "**/.output/**", "**/.pnpm-store/**"],
			usePolling: true,
			interval: 250,
		},
	},
	plugins: [
		devtools(),
		tsconfigPaths({ projects: ["./tsconfig.json"] }),
		tailwindcss(),
		tanstackStart(),
		nitro(),
		viteReact(),
		babel({ presets: [reactCompilerPreset()] }),
	],
});

export default config;
