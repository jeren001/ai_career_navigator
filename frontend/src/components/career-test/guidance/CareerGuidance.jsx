import { Link } from 'react-router-dom'
import CareerTestArea from '../shared/CareerTestArea'

const features = [
  'Personalized guidance',
  'Career exploration',
  'Recommended next steps',
  'AI support'
]

export default function CareerGuidance() {
  return (
    <CareerTestArea title="Career Guidance" features={features}>
      <Link to="/ai-assistant">Open AI Assistant</Link>
    </CareerTestArea>
  )
}
