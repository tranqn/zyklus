import { LANGS, LANG_NAME, useLang, useT, type Lang } from '../i18n'
import { useStore } from '../store'
import { setAccountLocale } from '../sync/engine'
import { Segmented } from './kit'

/**
 * DE · EN · VI switch. The choice is stored on the device, in the synced settings (so other
 * devices follow) and on the server (language of e-mails).
 */
export function LanguagePicker({ compact }: { compact?: boolean }) {
  const lang = useLang((s) => s.lang)
  const setLang = useLang((s) => s.setLang)
  const { t } = useT()
  const choose = (l: Lang) => {
    setLang(l)
    if (useStore.getState().settings.language !== l) useStore.getState().updateSettings({ language: l })
    setAccountLocale(l)
  }
  return (
    <Segmented value={lang} label={t('common.language')} onChange={choose} options={LANGS.map((l) => ({ value: l, label: compact ? l.toUpperCase() : LANG_NAME[l] }))} />
  )
}
