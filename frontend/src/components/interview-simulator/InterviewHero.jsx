import { ArrowRight } from 'lucide-react'
import mascot from '../../assets/mascot.png'

export function StartInterviewLink() {
  return (
    <a className="interview-primary" href="#interview-types">
      Start Interview <ArrowRight size={18} aria-hidden="true" />
    </a>
  )
}

export default function InterviewHero() {
  return (
    <section className="interview-hero" aria-labelledby="interview-hero-title">
      <div className="interview-hero-copy">
        <h2 id="interview-hero-title">Ready for your next interview?</h2>
        <p>Build confidence for your next opportunity. Choose an interview type and practice answering questions tailored to your goals.</p>
        <StartInterviewLink />
      </div>
      <div className="interview-hero-art" aria-hidden="true">
        <img src={mascot} alt="" />
      </div>
    </section>
  )
}
