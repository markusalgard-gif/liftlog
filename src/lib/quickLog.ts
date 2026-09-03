import { v4 as uuid } from 'uuid'
import { db } from '../db/db'
import type { FootballSessionType } from '../db/types'
import { todayISO } from './format'

export async function logBodyweight(kg: number, date: string = todayISO()): Promise<void> {
  await db.bodyweightEntries.add({ id: uuid(), date, kg })
  const { schedulePush } = await import('./sync/autoSync')
  schedulePush('bodyweight')
}

export async function logFootball(
  type: FootballSessionType,
  date: string = todayISO(),
  note?: string,
): Promise<void> {
  await db.footballSessions.add({ id: uuid(), date, type, note })
  const { schedulePush } = await import('./sync/autoSync')
  schedulePush('football')
}
