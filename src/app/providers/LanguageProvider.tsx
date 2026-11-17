import { useCallback, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import en from '@/locales/en'
import fa from '@/locales/fa'
import {
  LanguageContext,
  type Language,
  type TranslationKey,
} from './LanguageContext'

const LANGUAGE_STORAGE_KEY = 'brewlog-language'
type LocaleMessages = { [Key in keyof typeof en]: string }
const messagesByLanguage: Record<Language, LocaleMessages> = { en, fa }

function isLanguage(value: string | null): value is Language {
  return value === 'en' || value === 'fa'
}

function getInitialLanguage(): Language {
  const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY)
  return isLanguage(savedLanguage) ? savedLanguage : 'en'
}

interface LanguageProviderProps {
  children: ReactNode
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguage] = useState<Language>(getInitialLanguage)
  const messages = messagesByLanguage[language]
  const t = useCallback(
    (key: TranslationKey) => messages[key],
    [messages],
  )

  useLayoutEffect(() => {
    const root = document.documentElement
    root.lang = language
    root.dir = language === 'fa' ? 'rtl' : 'ltr'
    document.title = t('documentTitle')
    const description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    )
    if (description) description.content = t('metaDescription')
    const manifest = document.querySelector<HTMLLinkElement>(
      'link[rel="manifest"]',
    )
    if (manifest) {
      manifest.href =
        language === 'fa' ? '/manifest.fa.webmanifest' : '/manifest.webmanifest'
    }
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  }, [language, t])

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, t],
  )

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}
