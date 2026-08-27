import type { DataSource } from './types'
import { mockSource } from './mock'
import { liveSource, LIVE_AVAILABLE } from './live'

export const source: DataSource = LIVE_AVAILABLE ? liveSource : mockSource
export { LIVE_AVAILABLE }
