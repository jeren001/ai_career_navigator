import { ClipboardList, Compass, IdCard } from 'lucide-react'
import CareerTestFeatureCard from './CareerTestFeatureCard'
import CareerTestHero from './CareerTestHero'

const areas = [
  {
    path: 'assessment',
    title: 'Assessment',
    featureLabel: 'Test + AI Recommendations',
    description: 'Take a career test to discover your interests and receive personalized recommendations.',
    accent: 'assessment',
    icon: ClipboardList
  },
  {
    path: 'profile',
    title: 'My Career Profile',
    featureLabel: 'Profile + History',
    description: 'Explore your career profile, see detailed results and track your evolution over time.',
    accent: 'profile',
    icon: IdCard
  },
  {
    path: 'guidance',
    title: 'Career Guidance',
    featureLabel: 'Next Steps + AI Support',
    description: 'Get personalized guidance, explore career options and plan your next steps.',
    accent: 'guidance',
    icon: Compass
  }
]

export default function CareerTestHome() {
  return (
    <>
      <CareerTestHero />
      <ul className="career-test-cards">
        {areas.map(({ path, ...card }) => (
          <li key={path}>
            <CareerTestFeatureCard to={path} {...card} />
          </li>
        ))}
      </ul>
    </>
  )
}
