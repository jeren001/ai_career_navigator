import CareerTestArea from '../shared/CareerTestArea'

const features = [
  'Assessment introduction',
  'Assessment questions and session',
  'Assessment results',
  'AI career recommendations'
]

export default function Assessment() {
  return <CareerTestArea title="Assessment" features={features} />
}
