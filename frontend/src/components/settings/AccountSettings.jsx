// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Account Settings
// PURPOSE: Multilingual email and password management
// ==========================================

import { useLocale } from '../../lib/locale.js'

// Import icons
import {
  UserRound,
  Mail,
  LockKeyhole,
  ChevronRight
} from 'lucide-react'

// Import global user context
import { useUser } from '../../context/user.js'


function AccountSettings() {

  // 01. GLOBAL USER DATA

  const { profile } = useUser()


  const { t } = useLocale()


  // 03. ACCOUNT SETTINGS INTERFACE

  return (

    <section className="settings-card">

      {/* Section heading */}

      <div className="settings-card-header">

        <div className="settings-card-icon">
          <UserRound size={24} />
        </div>

        <div>

          <h2>{t('Account Settings', '账户设置')}</h2>

          <p>{t('Manage your account and login information.', '管理账户和登录信息。')}</p>

        </div>

      </div>


      <div className="settings-divider" />


      {/* 04. EMAIL ADDRESS */}

      <div className="settings-option">

        <div className="settings-option-icon">
          <Mail size={22} />
        </div>

        <div className="settings-option-content">

          <h3>{t('Email Address', '邮箱地址')}</h3>

          <p>
            {profile.email || t('No email address added', '未添加邮箱地址')}
          </p>

        </div>

        <button
          type="button"
          className="settings-action-button"
          disabled
          title={t('This action is currently unavailable.', '暂不支持此操作。')}
        >

          {t('Change Email', '更改邮箱')}

          <ChevronRight size={17} />

        </button>

      </div>


      <div className="settings-divider" />


      {/* 05. PASSWORD */}

      <div className="settings-option">

        <div className="settings-option-icon">
          <LockKeyhole size={22} />
        </div>

        <div className="settings-option-content">

          <h3>{t('Password', '密码')}</h3>

          <p>
            {t('Manage your account password.', '管理账户密码。')}
          </p>

        </div>

        <button
          type="button"
          className="settings-action-button"
          disabled
          title={t('This action is currently unavailable.', '暂不支持此操作。')}
        >

          {t('Change Password', '更改密码')}

          <ChevronRight size={17} />

        </button>

      </div>

    </section>

  )

}

export default AccountSettings
