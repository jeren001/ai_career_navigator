import { createContext, useContext } from 'react'

export const LocaleContext = createContext(null)
export const useLocale = () => useContext(LocaleContext)

export function apiErrorText(error, t, operation = '') {
  if (error.status === 0) return t('Could not reach the server. Check your connection and try again.', '无法连接服务器。请检查网络后重试。')
  if (error.message === 'Current password is incorrect') return t('The current password is incorrect.', '当前密码不正确。')
  if (error.message === 'Username is already taken') return t('That username is already taken.', '该用户名已被使用。')
  if (error.message === 'Enter a different email address') return t('Enter a different email address.', '请输入不同的邮箱地址。')
  if (error.message === 'An account with this email already exists') return t('That email is already registered.', '该邮箱已注册。')
  if (error.message === 'Account email delivery is unavailable') return t('Account email delivery is unavailable. Try again later.', '邮件服务暂不可用，请稍后重试。')
  if (error.message === 'Photo processing is unavailable') return t('Photo processing is unavailable.', '头像处理服务暂不可用。')
  if (error.status === 429) return t('Too many attempts. Please try again later.', '尝试次数过多，请稍后重试。')
  if ([413, 415, 422].includes(error.status)) return t('Choose a valid JPEG, PNG, or WebP image up to 5 MiB.', '请选择不超过 5 MiB 的有效 JPEG、PNG 或 WebP 图片。')
  if (error.status === 400 && operation === 'code') return t('Check that the code is correct and has not expired.', '请检查验证码是否正确且未过期。')
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
