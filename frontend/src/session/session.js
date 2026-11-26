import { createContext, useContext } from 'react'

export const SessionContext = createContext(null)
export const useSession = () => useContext(SessionContext)

export function accountName(user, t) {
  if (user?.is_guest) return t('Guest', '访客')
  return user?.display_name || user?.email || t('Account', '账户')
}
