import { useEffect, useState } from 'react'
import { getSyncStatus, subscribeSyncStatus, type SyncStatus } from './syncStatus'

export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState(getSyncStatus)
  useEffect(() => subscribeSyncStatus(setStatus), [])
  return status
}
