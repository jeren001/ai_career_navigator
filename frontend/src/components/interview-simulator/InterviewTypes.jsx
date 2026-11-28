import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

import { interviewTypes } from './interviewTypePresentation'

function InterviewTypeCard({ type }) {
  const Icon = type.icon

  return (
    <Link to={type.to} className="interview-type-card" data-color={type.color}>
      <span className="interview-type-icon"><Icon size={23} aria-hidden="true" /></span>
      <span className="interview-type-title">{type.title}</span>
      <span className="interview-type-description">{type.description}</span>
      <ArrowRight className="interview-type-arrow" size={19} aria-hidden="true" />
    </Link>
  )
}

export default function InterviewTypes() {
  return (
    <section className="interview-section" aria-labelledby="interview-types">
      <h2 id="interview-types" tabIndex={-1}>Choose an Interview Type</h2>
      <ul className="interview-type-grid">
        {interviewTypes.map(type => (
          <li key={type.title}><InterviewTypeCard type={type} /></li>
        ))}
      </ul>
    </section>
  )
}
