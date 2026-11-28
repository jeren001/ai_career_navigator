import { CodeXml, MessagesSquare, BriefcaseBusiness, SlidersHorizontal } from 'lucide-react'

export const interviewTypes = [
  {
    id: 'technical',
    title: 'Technical Interview',
    description: 'Practice technical questions and explain how you solve problems.',
    icon: CodeXml,
    color: 'blue',
    to: '/interview-simulator/technical'
  },
  {
    id: 'behavioral',
    title: 'Behavioral Interview',
    description: 'Practice telling clear stories about teamwork, leadership, and challenges.',
    icon: MessagesSquare,
    color: 'purple',
    to: '/interview-simulator/behavioral'
  },
  {
    id: 'general',
    title: 'General Interview',
    description: 'Prepare for common questions about your experience and goals.',
    icon: BriefcaseBusiness,
    color: 'cyan',
    to: '/interview-simulator/general'
  },
  {
    id: 'custom',
    title: 'Custom Interview',
    description: 'Tailor your practice to a specific role, topic, or opportunity.',
    icon: SlidersHorizontal,
    color: 'violet',
    to: '/interview-simulator/custom'
  }
]
