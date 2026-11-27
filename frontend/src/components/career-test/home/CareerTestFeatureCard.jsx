import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function CareerTestFeatureCard({ to, title, description, featureLabel, icon: Icon, accent }) {
  return (
    <Link className="career-test-card" data-accent={accent} to={to}>
      <span className="career-test-card-icon" aria-hidden="true">
        <Icon />
      </span>
      <h2>{title}</h2>
      {featureLabel && <span className="career-test-card-label">{featureLabel}</span>}
      <p>{description}</p>
      {featureLabel && (
        <span className="career-test-card-arrow" aria-hidden="true">
          <ArrowRight />
        </span>
      )}
    </Link>
  )
}
