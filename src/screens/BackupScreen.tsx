import { useRef, useState, type ChangeEvent } from 'react'
import { downloadBackup, exportAllData, importAllData, type BackupFile } from '../lib/backup'

export default function BackupScreen() {
  const [status, setStatus] = useState<string | null>(null)
  const [confirmingImport, setConfirmingImport] = useState<BackupFile | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleExport() {
    const backup = await exportAllData()
    downloadBackup(backup)
    setStatus('Backup downloaded.')
  }

  function handleFileChosen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as BackupFile
        setConfirmingImport(parsed)
      } catch {
        setStatus('That file is not a valid LiftLog backup.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function confirmImport() {
    if (!confirmingImport) return
    try {
      await importAllData(confirmingImport)
      setStatus('Backup restored. All local data replaced.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Import failed.')
    }
    setConfirmingImport(null)
  }

  return (
    <div className="flex min-h-svh flex-col pb-24">
      <header className="sticky top-0 z-10 border-b border-line bg-paper/95 px-3 py-3 backdrop-blur">
        <h1 className="heading-display text-2xl text-ink">Backup & Restore</h1>
      </header>

      <main className="flex-1 space-y-3 px-3 py-3">
        <button
          onClick={handleExport}
          className="heading-display tap-target w-full rounded-xl border border-line bg-card px-4 text-left text-ink active:bg-card-alt"
        >
          Export all data (JSON)
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="heading-display tap-target w-full rounded-xl border border-line bg-card px-4 text-left text-ink active:bg-card-alt"
        >
          Import / restore from file
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleFileChosen}
          className="hidden"
        />

        {status && <p className="px-1 text-sm text-ink-muted">{status}</p>}
      </main>

      {confirmingImport && (
        <div className="fixed inset-0 z-30 flex items-end bg-ink/40">
          <div className="w-full rounded-t-2xl bg-card p-4 pb-8">
            <h2 className="heading-display mb-2 text-xl text-ink">Restore this backup?</h2>
            <p className="mb-4 text-sm text-ink-muted">
              This replaces ALL current data with the contents of the backup file
              (from {new Date(confirmingImport.exportedAt).toLocaleString()}). This
              cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={confirmImport}
                className="label-heading tap-target flex-1 rounded-lg bg-red-600 text-white active:bg-red-700"
              >
                Replace everything
              </button>
              <button
                onClick={() => setConfirmingImport(null)}
                className="label-heading tap-target rounded-lg border border-line px-5 text-ink-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
