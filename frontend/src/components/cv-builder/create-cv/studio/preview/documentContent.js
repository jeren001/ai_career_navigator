import { getCountryCallingCode, isSupportedCountry } from 'react-phone-number-input'
import { formatDocumentAddress, formatDocumentDate, formatDocumentPhone } from '../international/localizationUtils'

export function getDocumentContacts(information, localization) {
  const { email, phone, phoneCountry, location } = information
  // The wizard phone input may contain a calling prefix with no subscriber number.
  const prefix = phoneCountry && isSupportedCountry(phoneCountry)
    ? `+${getCountryCallingCode(phoneCountry)}`
    : ''

  return {
    email,
    phone: phone === prefix ? '' : formatDocumentPhone(phone, localization.phoneFormat),
    location: formatDocumentAddress(location, localization.addressFormat)
  }
}

export function getHistoryRange({ startDate, endDate }, active, studying, localization) {
  const start = formatDocumentDate(startDate, localization)
  const end = formatDocumentDate(endDate, localization)
  if (!active) return [start, end].filter(Boolean).join(' – ')
  const current = [start, localization.label('present')].filter(Boolean).join(' – ')
  return studying && end ? `${current} (${localization.label('expected')} ${end})` : current
}

export function orderHistory(entries, order) {
  if (!order) return entries
  return [...entries].sort((first, second) => {
    const dateOrder = (first.startDate || '').localeCompare(second.startDate || '')
    return order === 'newest-first' ? -dateOrder : dateOrder
  })
}

export function getDocumentSectionTitle({ id, title, custom }, settings, localization) {
  return localization.headings && localization.locale !== 'en' && !custom && !settings?.[id]?.title
    ? localization.heading(id)
    : title
}
