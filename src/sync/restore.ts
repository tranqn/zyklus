import { t } from '../i18n'
import { toast } from '../ui/notify'
import { importBackup, recoverStash } from './engine'

/**
 * Restore a backup file (the settings' "restore backup"). The whole file is validated before
 * anything is written, so an invalid one changes nothing and nothing is uploaded; a file too
 * large for this device's storage is rolled back and reported as such.
 */
export function restoreBackup(json: string): boolean {
  const result = importBackup(json)
  if (result === 'ok') toast(t('more.settings.restored'))
  else toast(t(result === 'storage' ? 'more.settings.storageFull' : 'more.settings.badBackup'))
  return result === 'ok'
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
