import { MapPin, Star } from 'lucide-react'
import mascot from '../../../assets/mascot.png'

export default function CareerTestIllustration() {
  return (
    <div className="career-test-hero-illustration" aria-hidden="true">
      <img src={mascot} alt="" width="1491" height="1055" />
      <span className="career-test-illustration-badge career-test-illustration-star">
        <Star />
      </span>
      <span className="career-test-illustration-badge career-test-illustration-pin">
        <MapPin />
      </span>
    </div>
  )
}
