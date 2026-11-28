import { formatPhoneNumberIntl } from 'react-phone-number-input'
import { documentLocales } from './documentLocales'

export const localizationDefaults = {
  locale: 'en',
  headings: true,
  labels: true,
  dateFormat: 'locale',
  phoneFormat: 'original',
  addressFormat: 'original',
  direction: 'auto'
}

export function getLocalization(settings) {
  const options = { ...localizationDefaults, ...settings }
  const locale = Object.hasOwn(documentLocales, options.locale) ? options.locale : 'en'
  const labelLocale = settings && options.labels ? locale : 'en'
  return {
    ...options,
    locale,
    headings: Boolean(settings && options.headings),
    direction: options.direction === 'auto' ? (locale === 'ar' ? 'rtl' : 'ltr') : options.direction,
    label: key => documentLocales[labelLocale].labels[key],
    heading: key => documentLocales[locale].labels[key],
    dateFormat: settings ? options.dateFormat : 'legacy'
  }
}

const dateFormatters = new Map()

export function formatDocumentDate(value, localization) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?$/.exec(value)
  if (!match || localization.dateFormat === 'iso') return value

  const [, year, month, day] = match
  if (localization.dateFormat === 'month-first') return day ? `${month}/${day}/${year}` : `${month}/${year}`
  if (localization.dateFormat === 'year-first') return day ? `${year}/${month}/${day}` : `${year}/${month}`

  const locale = localization.dateFormat === 'legacy' ? 'en' : localization.locale
  const key = `${locale}:${Boolean(day)}`
  if (!dateFormatters.has(key)) {
    dateFormatters.set(key, new Intl.DateTimeFormat(locale, {
      year: 'numeric', month: 'short', day: day ? 'numeric' : undefined, timeZone: 'UTC', calendar: 'gregory'
    }))
  }
  const date = new Date(`${year}-${month}-${day ?? '01'}T12:00:00Z`)
  if (!Number.isFinite(date.getTime()) || date.getUTCDate() !== Number(day ?? '01')) return value
  return dateFormatters.get(key).format(date)
}

export function formatDocumentPhone(phone, mode) {
  if (mode !== 'international' || !/^\+\d+$/.test(phone ?? '')) return phone
  const formatted = formatPhoneNumberIntl(phone)
  return formatted.replace(/[\s().-]/g, '') === phone ? formatted : phone
}

export function formatDocumentAddress(address, mode) {
  return mode === 'lines' ? address?.replace(/,[\t ]*(?![\t \r\n])/g, ',\n') : address
}
