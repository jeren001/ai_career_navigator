import { useEffect, useState } from 'react'
import { careerText } from '../../lib/careers.js'
import { apiErrorText, useLocale } from '../../lib/locale.js'
import { useSession } from '../../session/session.js'

const metrics = [
  ['assessments_completed', 'Completed assessments', '已完成测评'],
  ['assessments_in_progress', 'Assessments in progress', '进行中的测评'],
  ['skills', 'Saved skills', '已保存技能'],
  ['active_roadmaps', 'Active roadmaps', '进行中的路线图'],
  ['challenges_submitted', 'Submitted challenges', '已提交挑战'],
  ['challenges_evaluated', 'Evaluated challenges', '已评估挑战'],
  ['interviews_started', 'Started interviews', '已开始面试'],
  ['interviews_evaluated', 'Evaluated interviews', '已评估面试'],
  ['resources_completed', 'Completed resources', '已完成学习资源'],
  ['resources_bookmarked', 'Bookmarked resources', '已收藏学习资源']
]

export default function DashboardSummary() {
  const { locale, t } = useLocale()
  const { request } = useSession()
  const [result, setResult] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const current = result?.locale === locale && result.attempt === attempt ? result : null

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    request(`/api/dashboard?language=${locale}`, { signal })
      .then((summary) => {
        if (!signal.aborted) setResult({ locale, attempt, summary })
      })
      .catch((error) => {
        if (!signal.aborted) setResult({ locale, attempt, error })
      })
    return () => controller.abort()
  }, [request, locale, attempt])

  const summary = current?.summary
  const assessment = summary?.progress.assessment
  const roadmap = summary?.progress.roadmap
  const recommendations = summary?.recommendations
  const number = new Intl.NumberFormat(locale)
  const activityTime = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <section className="integration-progress" aria-labelledby="dashboard-summary-heading">
      <h2 id="dashboard-summary-heading">{t('Progress overview', '进度概览')}</h2>
      {!current && <p role="status">{t('Loading your overview…', '正在加载进度概览…')}</p>}
      {current?.error && (
        <>
          <p role="alert">{apiErrorText(current.error, t)}</p>
          <button type="button" onClick={() => setAttempt((value) => value + 1)}>{t('Retry overview', '重试加载概览')}</button>
        </>
      )}
      {summary && (
        <>
          <dl className="dashboard-summary-metrics">
            {metrics.map(([key, en, zh]) => (
              <div key={key}>
                <dt>{t(en, zh)}</dt>
                <dd>{number.format(summary.statistics[key])}</dd>
              </div>
            ))}
          </dl>
          <h3>{t('In progress', '进行中')}</h3>
          {assessment || roadmap ? (
            <ul>
              {assessment && <li>{t(
                `Career Test: ${number.format(assessment.answered)} of ${number.format(assessment.target)} questions answered`,
                `职业测试：已回答 ${number.format(assessment.answered)} / ${number.format(assessment.target)} 题`
              )}</li>}
              {roadmap && <li>{t(
                `${roadmap.profession.title}: ${number.format(roadmap.completed_milestones)} of ${number.format(roadmap.total_milestones)} milestones completed`,
                `${roadmap.profession.title}：已完成 ${number.format(roadmap.completed_milestones)} / ${number.format(roadmap.total_milestones)} 个里程碑`
              )}</li>}
            </ul>
          ) : <p>{t('No assessment or roadmap in progress.', '暂无进行中的测评或路线图。')}</p>}
          <h3>{t('Saved career recommendations', '已保存的职业推荐')}</h3>
          {recommendations?.professions.length ? (
            <ul>{recommendations.professions.map((career) => (
              <li key={career.slug}>{careerText(career, locale).title}</li>
            ))}</ul>
          ) : <p>{t('No saved recommendations yet.', '暂无已保存的职业推荐。')}</p>}
          <h3>{t('Recent activity', '最近活动')}</h3>
          {summary.recent_activity.length ? (
            <ul>{summary.recent_activity.map((event) => (
              <li key={`${event.kind}:${event.item_id}:${event.occurred_at}`}>
                {event.label}{' '}
                <time dateTime={event.occurred_at}>{activityTime.format(new Date(event.occurred_at))}</time>
              </li>
            ))}</ul>
          ) : <p>{t('No recent activity.', '暂无最近活动。')}</p>}
        </>
      )}
    </section>
  )
}
