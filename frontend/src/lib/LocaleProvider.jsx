import { useCallback, useEffect, useState } from 'react'
import { LocaleContext } from './locale.js'
import { readStorage, writeStorage } from './storage.js'

export default function LocaleProvider({ children }) {
  const [locale, setLocale] = useState(() =>
    readStorage('career-navigator-locale', true) === 'zh-CN' ? 'zh-CN' : 'en'
  )
  const setLanguage = useCallback((value) => setLocale(value === 'CH' ? 'zh-CN' : 'en'), [])
  useEffect(() => {
    document.documentElement.lang = locale
    writeStorage('career-navigator-locale', locale, true)
  }, [locale])

  return (
    <LocaleContext.Provider value={{
      locale,
      language: locale === 'zh-CN' ? 'CH' : 'EN',
      setLanguage,
      t: (en, zh) => locale === 'zh-CN' ? zh : en
    }}>
      {children}
    </LocaleContext.Provider>
  )
}
