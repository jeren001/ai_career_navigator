import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Compass, House, Info, LayoutDashboard, Search, X } from 'lucide-react'
import { api } from '../lib/api.js'
import { careerText, searchCareers } from '../lib/careers.js'
import { apiErrorText, useLocale } from '../lib/locale.js'
import '../styles/commandbar.css'

export default function CommandBar() {
  const { locale, t } = useLocale()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [careers, setCareers] = useState(null)
  const [searchError, setSearchError] = useState(null)
  const [retry, setRetry] = useState(0)
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailError, setDetailError] = useState(null)
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const backRef = useRef(null)
  const searching = isOpen && Boolean(query.trim())
  const hasCareers = careers !== null

  useEffect(() => {
    if (!searching || hasCareers) return
    const controller = new AbortController()
    api('/api/careers', { signal: controller.signal })
      .then((rows) => { if (!controller.signal.aborted) setCareers(rows) })
      .catch((error) => { if (!controller.signal.aborted) setSearchError(error) })
    return () => controller.abort()
  }, [searching, hasCareers, retry])

  useEffect(() => {
    if (selectedId === null) return
    const controller = new AbortController()
    api(`/api/careers/${selectedId}`, { signal: controller.signal })
      .then((career) => { if (!controller.signal.aborted) setDetail(career) })
      .catch((error) => { if (!controller.signal.aborted) setDetailError(error) })
    backRef.current?.focus()
    return () => controller.abort()
  }, [selectedId])

  useEffect(() => {
    function handleShortcut(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
        setIsOpen(true)
      } else if (event.key === 'Escape' && containerRef.current?.contains(document.activeElement)) {
        setSelectedId(null)
        setIsOpen(false)
        inputRef.current?.blur()
      }
    }
    function outside(event) {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false)
        setSelectedId(null)
      }
    }
    document.addEventListener('keydown', handleShortcut)
    document.addEventListener('pointerdown', outside)
    return () => {
      document.removeEventListener('keydown', handleShortcut)
      document.removeEventListener('pointerdown', outside)
    }
  }, [])

  const commands = [
    { path: '/', title: t('Home', '首页'), summary: t('Return to the home page', '返回首页'), icon: House },
    { path: '/dashboard', title: t('Dashboard', '仪表板'), summary: t('View your account and progress', '查看账户和进度'), icon: LayoutDashboard },
    { path: '/about', title: t('About', '关于'), summary: t('Learn more about AI CAREER', '了解 AI CAREER'), icon: Info }
  ]
  const needle = query.trim().toLowerCase()
  const results = [
    ...commands.filter(({ title, path }) => title.toLowerCase().includes(needle) || path.includes(needle)),
    ...searchCareers(careers || [], query, locale).map((career) => ({
      id: career.id, ...careerText(career, locale), icon: Compass
    }))
  ]

  function showResult(result) {
    if (!result) return
    if (result.path) {
      setIsOpen(false)
      setQuery('')
      setActiveIndex(0)
      navigate(result.path)
      return
    }
    setDetail(null)
    setDetailError(null)
    setSelectedId(result.id)
  }

  function handleKeyDown(event) {
    if (!isOpen || selectedId !== null || !results.length) return
    if (event.key === 'Enter') {
      event.preventDefault()
      showResult(results[activeIndex] || results[0])
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((index) => (index + direction + results.length) % results.length)
    }
  }

  function changeQuery(value) {
    setQuery(value)
    setActiveIndex(0)
    setSelectedId(null)
    setSearchError(null)
    if (!hasCareers && searchError) setRetry((count) => count + 1)
    setIsOpen(true)
  }

  const selected = detail && careerText(detail, locale)
  return (
    <div className="command-container" ref={containerRef}>
      <div className="command-bar">
        <Search size={20} />
        <input
          ref={inputRef}
          type="search"
          aria-label={t('Search careers and pages', '搜索职业和页面')}
          placeholder={t('Search careers and pages…', '搜索职业和页面…')}
          value={query}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          onChange={(event) => changeQuery(event.target.value)}
        />
        {query && (
          <button className="command-clear" type="button" aria-label={t('Clear search', '清除搜索')} onClick={() => {
            changeQuery('')
            inputRef.current?.focus()
          }}>
            <X size={16} />
          </button>
        )}
        <kbd className="command-shortcut">⌘ K</kbd>
      </div>
      {isOpen && (
        <div className="command-results">
          {selectedId !== null ? (
            <div className="command-empty">
              <button type="button" ref={backRef} className="integration-retry" onClick={() => {
                setSelectedId(null)
                inputRef.current?.focus()
              }}>{t('Back to results', '返回结果')}</button>
              {selected ? <><h3>{selected.title}</h3><p>{selected.field}</p><p>{selected.summary}</p></>
                : detailError ? <p role="alert">{apiErrorText(detailError, t)}</p>
                  : <p role="status">{t('Loading career…', '正在加载职业…')}</p>}
            </div>
          ) : (
            <>
              <div className="command-results-title">{query ? t('Search results', '搜索结果') : t('Quick actions', '快捷操作')}</div>
              {results.map((result, index) => {
                const Icon = result.icon
                return (
                  <button
                    type="button"
                    key={result.path ?? result.id}
                    className={`command-item ${index === activeIndex ? 'active' : ''}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => showResult(result)}
                  >
                    <span className="command-item-icon"><Icon size={20} /></span>
                    <span className="command-item-text"><span>{result.title}</span><small>{result.summary}</small></span>
                  </button>
                )
              })}
              {searching && !hasCareers && (searchError ? (
                <div className="command-empty" role="alert">
                  {apiErrorText(searchError, t)}{' '}
                  <button type="button" className="integration-retry" onClick={() => {
                    setSearchError(null)
                    setRetry((count) => count + 1)
                  }}>{t('Retry', '重试')}</button>
                </div>
              ) : <div className="command-empty" role="status">{t('Loading careers…', '正在加载职业…')}</div>)}
              {!results.length && hasCareers && <div className="command-empty">{t('No results found.', '未找到结果。')}</div>}
            </>
          )}
        </div>
      )}
    </div>
  )
}
