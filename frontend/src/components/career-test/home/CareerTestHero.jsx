import CareerTestIllustration from './CareerTestIllustration'

export default function CareerTestHero() {
  return (
    <section className="career-test-hero">
      <div className="career-test-hero-copy">
        <h1 className="career-test-hero-title">
          Discover Who You{' '}
          <span className="career-test-hero-title-line">
            Can <span className="career-test-hero-underline">Become.</span>
          </span>
        </h1>
        <p>Understand who you are and explore where your potential can take you.</p>
      </div>
      <CareerTestIllustration />
    </section>
  )
}
