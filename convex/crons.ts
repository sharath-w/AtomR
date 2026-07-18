import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

crons.interval(
	'refresh online count',
	{ minutes: 1 },
	internal.online.refreshOnlineCount,
)

export default crons
