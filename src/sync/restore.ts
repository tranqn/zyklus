import { useStore } from '../store'
import { t } from '../i18n'
import { toast } from '../ui/notify'
import { discardStash, readStash } from './engine'

/**
 * Restore a backup file (the settings' "restore backup"). importData validates the whole file
 * before it writes anything, so an invalid one changes nothing and nothing is uploaded.
 */
export function restoreBackup(json: string): boolean {
  try {
    useStore.getState().importData(json)
  } catch {
    toast(t('more.settings.badBackup'))
    return false
  }
  toast(t('more.settings.restored'))
  return true
}

/** Bring back the data the device held before it started clean for another account (see engine). */
export function restoreStash(): boolean {
  const stash = readStash()
  if (!stash || !restoreBackup(JSON.stringify(stash.doc.state))) return false
  discardStash()
  return true
}
