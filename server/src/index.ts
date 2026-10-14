import { serve } from '@hono/node-server'
import { mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { backup } from 'node:sqlite'
import { cleanup, createApp } from './app.ts'
import { loadConfig } from './config.ts'
import { openDb } from './db.ts'
import { createMailer } from './mail.ts'

const cfg = loadConfig()
mkdirSync(join(cfg.dataDir, 'backups'), { recursive: true })
const db = openDb(join(cfg.dataDir, 'zyklus.db'))
const { app, sweep } = createApp({ db, cfg, mail: createMailer(cfg) })

const HOUR = 3_600_000
const KEEP_BACKUPS = 14

async function nightlyBackup() {
  const dir = join(cfg.dataDir, 'backups')
  const file = join(dir, `zyklus-${new Date().toISOString().slice(0, 10)}.db`)
  await backup(db, file)
  const old = readdirSync(dir).filter((f) => f.endsWith('.db')).sort().slice(0, -KEEP_BACKUPS)
  for (const f of old) rmSync(join(dir, f))
  console.log(`backup written: ${file}`)
}

let lastBackupDay = ''
setInterval(() => {
  try {
    const removed = cleanup(db)
    if (removed.users) console.log(`cleanup: removed ${removed.users} unverified accounts`)
    sweep()
    // one backup per UTC day, in the first hourly tick after 03:00
    const day = new Date().toISOString().slice(0, 10)
    if (new Date().getUTCHours() >= 3 && day !== lastBackupDay) {
      lastBackupDay = day
      nightlyBackup().catch((e) => console.error('backup failed', e))
    }
  } catch (e) {
    console.error('housekeeping failed', e)
  }
}, HOUR).unref()

const server = serve({ fetch: app.fetch, port: cfg.port }, (info) => console.log(`zyklus-api on :${info.port}, origin ${cfg.appOrigin}`))

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    server.close()
    db.close()
    process.exit(0)
  })
}
