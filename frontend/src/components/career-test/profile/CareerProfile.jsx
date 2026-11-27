import CareerTestArea from '../shared/CareerTestArea'

const features = [
  'Career profile',
  'Detailed results',
  'Assessment history',
  'Profile evolution'
]

export default function CareerProfile() {
  return <CareerTestArea title="My Career Profile" features={features} />
}
