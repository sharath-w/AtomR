/// <reference types="node" />
import { createClient } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import { betterAuth } from 'better-auth/minimal'
import { query } from './_generated/server'
import { components } from './_generated/api'
import type { DataModel } from './_generated/dataModel'
import type { GenericCtx } from '@convex-dev/better-auth'
import authConfig from './auth.config'

const fallbackLocalSiteUrl = 'http://localhost:3000'

function isLocalSiteUrl(url?: string) {
	if (!url) return true

	try {
		const { hostname } = new URL(url)
		return (
			hostname === 'localhost' ||
			hostname === '127.0.0.1' ||
			hostname === '0.0.0.0' ||
			hostname.endsWith('.local')
		)
	} catch {
		return false
	}
}

function isLocalConvexRuntime(url?: string) {
	if (!url) return false

	try {
		const { hostname } = new URL(url)
		return hostname === 'localhost' || hostname === '127.0.0.1'
	} catch {
		return false
	}
}

function readTrustedOrigins(siteUrl: string, isLocal: boolean) {
	const trustedOrigins = new Set<string>([siteUrl])
	const configuredOrigins = process.env.TRUSTED_ORIGINS
		?.split(',')
		.map((origin) => origin.trim())
		.filter(Boolean)

	for (const origin of configuredOrigins ?? []) {
		trustedOrigins.add(origin)
	}

	if (isLocal) {
		trustedOrigins.add(fallbackLocalSiteUrl)
		trustedOrigins.add('http://127.0.0.1:3000')
	}

	return Array.from(trustedOrigins)
}

function readAuthModes() {
	const configuredSiteUrl = process.env.SITE_URL || process.env.BETTER_AUTH_URL
	const convexCloudUrl = process.env.CONVEX_CLOUD_URL
	const convexSiteUrl = process.env.CONVEX_SITE_URL
	const isLocal =
		isLocalSiteUrl(configuredSiteUrl) ||
		isLocalConvexRuntime(convexCloudUrl) ||
		isLocalConvexRuntime(convexSiteUrl)
	const googleEnabled = Boolean(
		process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
	)
	const siteUrl = configuredSiteUrl || (isLocal ? fallbackLocalSiteUrl : undefined)

	if (!siteUrl) {
		throw new Error(
			'SITE_URL or BETTER_AUTH_URL must be configured for cloud auth deployments.',
		)
	}

	return {
		siteUrl,
		isLocal,
		googleEnabled,
		emailPasswordEnabled: isLocal && !googleEnabled,
	}
}

function resolveAuthModesForAuth() {
	const modes = readAuthModes()

	if (!modes.isLocal && !modes.googleEnabled) {
		throw new Error(
			'Google auth must be configured in production. Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.',
		)
	}

	return modes
}

export const authComponent = createClient<DataModel>(components.betterAuth)

export const createAuth = (ctx: GenericCtx<DataModel>) => {
	const { siteUrl, isLocal, googleEnabled, emailPasswordEnabled } =
		resolveAuthModesForAuth()

	return betterAuth({
		baseURL: siteUrl,
		trustedOrigins: readTrustedOrigins(siteUrl, isLocal),
		database: authComponent.adapter(ctx),
		emailAndPassword: {
			enabled: emailPasswordEnabled,
			requireEmailVerification: false,
		},
		socialProviders: googleEnabled
			? {
					google: {
						clientId: process.env.GOOGLE_CLIENT_ID as string,
						clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
					},
			  }
			: undefined,
		plugins: [convex({ authConfig })],
	})
}

export const getAuthModes = query({
	args: {},
	handler: async () => {
		const { isLocal, googleEnabled, emailPasswordEnabled } = readAuthModes()
		return {
			isLocal,
			googleEnabled,
			emailPasswordEnabled,
		}
	},
})

export const getCurrentUser = query({
	args: {},
	handler: async (ctx) => {
		return await authComponent.getAuthUser(ctx)
	},
})
