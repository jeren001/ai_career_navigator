import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { interviewTypeLabels } from '../../../services/interviewSessionModel'
import { interviewResultsPath } from '../../../services/interviewSessionRepository'
import { dateText, deltaText, scoreText } from './progressFormat'

const width = 1000
const height = 250
const xPosition = (index, length) => length > 1 ? 4 + index * 92 / (length - 1) : 50
const yPosition = score => 6 + (100 - score) * .88

function drawLine(context, points, field, color, dash = []) {
  context.beginPath()
  context.strokeStyle = color
  context.lineWidth = 2.5
  context.setLineDash(dash)
  let previous = null
  for (const [index, point] of points.entries()) {
    const value = field === 'score' ? point.record.score : point.runningAverage
    if (value === null) {
      previous = null
      continue
    }
    const x = width * xPosition(index, points.length) / 100
    const y = height * yPosition(value) / 100
    if (point.cohort && point.cohort === previous) context.lineTo(x, y)
    else context.moveTo(x, y)
    previous = point.cohort
  }
  context.stroke()
  context.setLineDash([])
}

export function PerformanceEvolution({ points }) {
  const canvas = useRef(null)
  const [hovered, setHovered] = useState(null)
  const [focused, setFocused] = useState(null)
  const scores = points.filter(point => point.record.score !== null)
  const selected = scores.find(point => point.record.session.id === (hovered ?? focused))
  const hasAverage = scores.some(point => point.runningAverage !== null)
  const tooltip = selected && {
    x: xPosition(points.indexOf(selected), points.length),
    y: yPosition(selected.record.score),
    text: `${dateText(selected.record.date)} · ${interviewTypeLabels[selected.record.session.interviewType]} · ${selected.record.session.configuration.role} · ${scoreText(selected.record.score)}`
  }

  useEffect(() => {
    const context = canvas.current?.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, width, height)
    context.strokeStyle = '#e1e7f7'
    context.lineWidth = 1.5
    for (const mark of [0, 25, 50, 75, 100]) {
      const y = height * yPosition(mark) / 100
      context.beginPath()
      context.moveTo(0, y)
      context.lineTo(width, y)
      context.stroke()
    }
    drawLine(context, points, 'score', '#244bc3')
    if (hasAverage) drawLine(context, points, 'average', '#7141bb', [8, 6])
  }, [points, hasAverage])

  return (
    <section className="progress-panel" aria-labelledby="progress-evolution">
      <h3 id="progress-evolution">Performance Evolution</h3>
      {!scores.length ? <p>No evaluated interviews match these filters. Scores will appear when validated evaluations are available.</p>
        : (
          <>
            <div className="progress-chart-legend">
              <span>Individual overall score</span>
              {hasAverage && <span className="progress-legend-average">Running average</span>}
            </div>
            <div className="progress-line-layout">
              <div className="progress-line-axis" aria-hidden="true">
                {[100, 75, 50, 25, 0].map(mark => <span key={mark} style={{ top: `${yPosition(mark)}%` }}>{mark}</span>)}
              </div>
              <div className="progress-line-plot" onMouseLeave={() => setHovered(null)}>
                <canvas width={width} height={height} ref={canvas} aria-hidden="true" />
                {points.map(({ record }, index) => record.score !== null && (
                  <Link key={record.session.id} to={interviewResultsPath(record.session.id)} className="progress-score-point"
                    style={{ left: `${xPosition(index, points.length)}%`, top: `${yPosition(record.score)}%` }}
                    aria-label={`${dateText(record.date)}, ${record.session.configuration.role}, ${interviewTypeLabels[record.session.interviewType]}, ${scoreText(record.score)}. View results`}
                    aria-describedby={selected?.record.session.id === record.session.id ? 'progress-score-tooltip' : undefined}
                    onFocus={() => setFocused(record.session.id)} onBlur={() => setFocused(null)}
                    onMouseEnter={() => setHovered(record.session.id)}
                    onKeyDown={event => {
                      if (event.key === 'Escape') {
                        setFocused(null)
                        setHovered(null)
                      }
                    }}>
                    <span aria-hidden="true" />
                  </Link>
                ))}
                {tooltip && (
                  <div id="progress-score-tooltip" role="tooltip" className="progress-score-tooltip"
                    data-below={tooltip.y < 50} style={{ '--point-x': `${tooltip.x}%`, '--point-y': `${tooltip.y}%` }}>
                    {tooltip.text}
                    {selected.runningAverage !== null && <><br />Running average {scoreText(selected.runningAverage)}</>}
                  </div>
                )}
              </div>
            </div>
            <div className="progress-chart-dates">
              <span>{dateText(points[0].record.date)}</span>
              {points.length > 1 && <span>{dateText(points[points.length - 1].record.date)}</span>}
            </div>
            <p className="progress-note">Focus or hover over a point for interview details. Select a point to view results.</p>
            {!hasAverage && <p className="progress-note">A score trend requires at least two comparable evaluations.</p>}
            <details className="progress-data-details">
              <summary>View score data</summary>
              <div className="progress-table-scroll" role="region" aria-label="Score data" tabIndex={0}><table>
                <thead><tr><th scope="col">Date</th><th scope="col">Interview</th><th scope="col">Score</th><th scope="col">Running average</th></tr></thead>
                <tbody>{scores.map(({ record, runningAverage }) => (
                  <tr key={record.session.id}>
                    <td>{dateText(record.date)}</td>
                    <td><Link to={interviewResultsPath(record.session.id)}>{record.session.configuration.role}</Link>
                      <br />{interviewTypeLabels[record.session.interviewType]}</td>
                    <td>{scoreText(record.score)}</td><td>{scoreText(runningAverage)}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            </details>
          </>
        )}
    </section>
  )
}

function SkillRadar({ skills }) {
  const canvas = useRef(null)

  useEffect(() => {
    const context = canvas.current?.getContext('2d')
    if (!context) return
    const center = 150
    const radius = 108
    const point = (index, scale) => {
      const angle = index * 2 * Math.PI / skills.length - Math.PI / 2
      return [center + Math.cos(angle) * radius * scale, center + Math.sin(angle) * radius * scale]
    }
    function polygon(values) {
      context.beginPath()
      values.forEach((value, index) => {
        const [x, y] = point(index, value)
        if (index === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      })
      context.closePath()
    }
    context.clearRect(0, 0, 300, 300)
    context.strokeStyle = '#ccd5ef'
    for (const grid of [.25, .5, .75, 1]) {
      polygon(skills.map(() => grid))
      context.stroke()
    }
    for (const index of skills.keys()) {
      context.beginPath()
      context.moveTo(center, center)
      context.lineTo(...point(index, 1))
      context.stroke()
      const [x, y] = point(index, 1.16)
      context.fillStyle = '#101d48'
      context.font = 'bold 12px sans-serif'
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText(String(index + 1), x, y)
    }
    polygon(skills.map(skill => skill.score / 100))
    context.strokeStyle = '#5a44c8'
    context.fillStyle = '#7152cb35'
    context.fill()
    context.stroke()
  }, [skills])

  return <canvas className="progress-radar" ref={canvas} width={300} height={300} aria-hidden="true" />
}

export function SkillsPerformance({ skills }) {
  const plotted = skills.filter(skill => skill.score !== null && skill.method)
  const radar = plotted.length >= 3 && new Set(plotted.map(skill => skill.method)).size === 1

  return (
    <section className="progress-panel" aria-labelledby="progress-skills">
      <h3 id="progress-skills">Skills Performance</h3>
      <p className="progress-note">These scores describe interview performance. Verified professional skills are separate.</p>
      {!skills.length ? <p>Skill scores are unavailable until interviews have validated category evaluations.</p>
        : (
          <div className={radar ? 'progress-skills-layout' : undefined}>
            {radar && <SkillRadar skills={plotted} />}
            <div className="progress-table-scroll" role="region" aria-label="Skill scores" tabIndex={0}>
              <table>
                <caption className="sr-only">Skill scores, evaluation counts and changes</caption>
                <thead><tr><th scope="col">Evaluation category</th><th scope="col">Score</th><th scope="col">Evaluations</th><th scope="col">Change</th></tr></thead>
                <tbody>{skills.map(skill => (
                  <tr key={skill.id}>
                    <th scope="row">{radar && plotted.includes(skill) ? `${plotted.indexOf(skill) + 1}. ` : ''}{skill.label}</th>
                    <td>{scoreText(skill.score)}</td><td>{skill.count}</td><td>{deltaText(skill.change)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}
      {skills.length > 0 && !radar && <p className="progress-note">The radar chart requires at least three categories with a shared scoring methodology.</p>}
      {skills.some(skill => skill.score === null) && <p className="progress-note">Scores with incompatible or unknown methodologies are kept separate.</p>}
    </section>
  )
}
