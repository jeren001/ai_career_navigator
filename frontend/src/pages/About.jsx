// PROJECT: AI CAREER
// PAGE: About

import { useLocale } from '../lib/locale.js'

function About() {
  const { t } = useLocale()
  return (
    <main>
      <h1>{t('About AI CAREER', '关于 AI CAREER')}</h1>
      <p>{t('Discover your potential and build your future.', '发掘职业潜力，规划未来。')}</p>
    </main>
  )
}

export default About