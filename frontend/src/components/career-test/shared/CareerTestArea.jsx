import { useId } from 'react'

export default function CareerTestArea({ title, features, children }) {
  const titleId = useId()

  return (
    <section className="career-test-area" aria-labelledby={titleId}>
      <h1 id={titleId}>{title}</h1>
      <p>This area is in development.</p>
      <ul>
        {features.map(feature => <li key={feature}>{feature}</li>)}
      </ul>
      {children}
    </section>
  )
}
