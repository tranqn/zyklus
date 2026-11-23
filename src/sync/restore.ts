import { useStore } from '../store'
import { t } from '../i18n'
import { toast } from '../ui/notify'
import { recoverStash } from './engine'

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

/**
 * Bring back the data the device held before it started clean (see recoverStash): merged into
 * the account's data, unlike a backup file, which replaces it.
 */
export function restoreStash(): boolean {
  const result = recoverStash()
  if (result === 'ok') toast(t('more.settings.stashRestored'))
  else if (result === 'invalid') toast(t('more.settings.badBackup'))
  else if (result === 'storage') toast(t('more.settings.storageFull'))
  return result === 'ok'
}
