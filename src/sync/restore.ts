import { useStore } from '../store'
import { t } from '../i18n'
import { toast } from '../ui/notify'

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
