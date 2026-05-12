import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

const playerId = v.union(
	v.literal('p1'),
	v.literal('p2'),
	v.literal('p3'),
	v.literal('p4'),
	v.literal('p5'),
	v.literal('p6'),
	v.literal('p7'),
	v.literal('p8'),
)

const nullablePlayerId = v.union(playerId, v.null())

const playerFlags = v.object({
	p1: v.boolean(),
	p2: v.boolean(),
	p3: v.optional(v.boolean()),
	p4: v.optional(v.boolean()),
	p5: v.optional(v.boolean()),
	p6: v.optional(v.boolean()),
	p7: v.optional(v.boolean()),
	p8: v.optional(v.boolean()),
})

const queuedPremove = v.object({
	row: v.number(),
	col: v.number(),
	queuedAtTurn: v.number(),
	queuedAtMs: v.number(),
})

export default defineSchema({
	users: defineTable({
		authUserId: v.string(),
		displayName: v.string(),
		email: v.optional(v.string()),
		avatarUrl: v.optional(v.string()),
		createdAt: v.number(),
		lastSeenAt: v.number(),
	}).index('by_auth_user_id', ['authUserId']),
	matchmakingQueue: defineTable({
		userId: v.id('users'),
		status: v.union(
			v.literal('searching'),
			v.literal('matched'),
			v.literal('cancelled'),
		),
		requestedAt: v.number(),
		matchId: v.optional(v.id('matches')),
	}).index('by_status_requested_at', ['status', 'requestedAt'])
	  .index('by_user_id', ['userId']),
	privateRooms: defineTable({
		code: v.string(),
		hostUserId: v.id('users'),
		guestUserId: v.optional(v.id('users')),
		status: v.union(
			v.literal('open'),
			v.literal('full'),
			v.literal('closed'),
			v.literal('expired'),
		),
		rows: v.number(),
		cols: v.number(),
		createdAt: v.number(),
		expiresAt: v.number(),
		matchId: v.optional(v.id('matches')),
	})
		.index('by_code', ['code'])
		.index('by_host_user_id', ['hostUserId'])
		.index('by_status', ['status']),
	matches: defineTable({
		type: v.union(v.literal('public'), v.literal('private')),
		roomId: v.optional(v.id('privateRooms')),
		player1UserId: v.id('users'),
		player2UserId: v.id('users'),
		rows: v.number(),
		cols: v.number(),
		playerCount: v.optional(v.number()),
		board: v.array(
			v.array(
				v.object({
					owner: nullablePlayerId,
					count: v.number(),
				}),
			),
		),
		currentPlayer: playerId,
		turnNumber: v.number(),
		hasPlayed: playerFlags,
		eliminated: playerFlags,
		winner: nullablePlayerId,
		phase: v.union(
			v.literal('idle'),
			v.literal('resolving'),
			v.literal('gameOver'),
			v.literal('abandoned'),
		),
		lastMoveEvents: v.optional(
			v.array(
				v.union(
					v.object({
						type: v.literal('place'),
						row: v.number(),
						col: v.number(),
						player: playerId,
					}),
					v.object({
						type: v.literal('explode'),
						row: v.number(),
						col: v.number(),
						player: playerId,
						affected: v.array(
							v.object({ row: v.number(), col: v.number() }),
						),
					}),
					v.object({
						type: v.literal('capture'),
						row: v.number(),
						col: v.number(),
						player: playerId,
					}),
				),
			),
		),
		createdAt: v.number(),
		startedAt: v.number(),
		endedAt: v.optional(v.number()),
		lastMoveAt: v.number(),
		queuedPremoves: v.optional(
			v.object({
				p1: v.optional(queuedPremove),
				p2: v.optional(queuedPremove),
			}),
		),
		rematchMatchId: v.optional(v.id('matches')),
	})
		.index('by_player1_user_id', ['player1UserId'])
		.index('by_player2_user_id', ['player2UserId'])
		.index('by_phase', ['phase'])
		.index('by_room_id', ['roomId']),
	matchMoves: defineTable({
		matchId: v.id('matches'),
		turnNumber: v.number(),
		userId: v.id('users'),
		playerId: playerId,
		row: v.number(),
		col: v.number(),
		events: v.array(
			v.union(
				v.object({
					type: v.literal('place'),
					row: v.number(),
					col: v.number(),
					player: playerId,
				}),
				v.object({
					type: v.literal('explode'),
					row: v.number(),
					col: v.number(),
					player: playerId,
					affected: v.array(v.object({ row: v.number(), col: v.number() })),
				}),
				v.object({
					type: v.literal('capture'),
					row: v.number(),
					col: v.number(),
					player: playerId,
				}),
			),
		),
		createdAt: v.number(),
	}).index('by_match_id_turn_number', ['matchId', 'turnNumber']),
})
