import { createContext, useContext } from 'react'

export const LocaleContext = createContext(null)
export const useLocale = () => useContext(LocaleContext)

export function apiErrorText(error, t, operation = '') {
  if (error.status === 0) return t('Could not reach the server. Check your connection and try again.', '无法连接服务器。请检查网络后重试。')
  if (error.status === 401) {
    return operation === 'login'
      ? t('Email or password is incorrect.', '邮箱或密码不正确。')
      : t('Your session has expired. Please sign in again.', '会话已过期，请重新登录。')
  }
  if (error.status === 409 && operation === 'register') {
    return t('An account with this email already exists, or this session cannot register.', '该邮箱已注册，或当前会话无法注册。')
  }
  if (error.status === 400 && (operation === 'login' || operation === 'register')) {
    return t('Check your email and password and try again.', '请检查邮箱和密码后重试。')
  }
  return t('The request could not be completed. Please try again.', '无法完成请求，请重试。')
}
