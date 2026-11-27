
// ==========================================
// PROJECT: AI CAREER
// COMPONENT: CommandBar
// PURPOSE: Global search and quick navigation
// ==========================================

// Import React hooks
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

// Import icons from Lucide React
import {
  Search,
  LayoutDashboard,
  Compass,
  GraduationCap,
  FileText,
  MessageCircle,
  Map,
  Settings,
  ClipboardList,
  House,
  Info,
  X
} from 'lucide-react'

// Import component styles
import '../styles/commandbar.css'


// ==========================================
// 01. SEARCHABLE COMMANDS
// ==========================================

// List of available pages and features
// Keywords help users find features using different words
const commands = [
  {
    name: 'Home',
    description: 'Return to the Home Page',
    keywords: 'home start main',
    icon: House,
    path: '/'
  },
  {
    name: 'Dashboard',
    description: 'View your personal dashboard',
    keywords: 'dashboard progress overview',
    icon: LayoutDashboard,
    path: '/dashboard'
  },
  {
    name: 'Career Assessment',
    description: 'Discover your strengths and interests',
    keywords: 'test quiz assessment personality',
    icon: ClipboardList,
    path: '/career-test/assessment'
  },
  {
    name: 'Explore Careers',
    description: 'Discover different career opportunities',
    keywords: 'jobs career profession work',
    icon: Compass,
    path: '/careers'
  },
  {
    name: 'Roadmap',
    description: 'View your personalized career plan',
    keywords: 'plan future goals steps',
    icon: Map,
    path: '/roadmap'
  },
  {
    name: 'Learning Hub',
    description: 'Discover courses and learning resources',
    keywords: 'study learn courses skills education',
    icon: GraduationCap,
    path: '/learning'
  },
  {
    name: 'My Resume',
    description: 'Create and edit your resume',
    keywords: 'cv resume curriculum',
    icon: FileText,
    path: '/resume'
  },
  {
    name: 'AI Assistant',
    description: 'Chat with your AI career assistant',
    keywords: 'ai chat assistant advice help',
    icon: MessageCircle,
    path: '/ai-assistant'
  },
  {
    name: 'Settings',
    description: 'Manage your account preferences',
    keywords: 'settings language account preferences',
    icon: Settings,
    path: '/settings'
  },
  {
    name: 'About',
    description: 'Learn more about AI CAREER',
    keywords: 'about information platform',
    icon: Info,
    path: '/about'
  }
]


// ==========================================
// 02. MAIN COMPONENT
// ==========================================

function CommandBar() {
  const navigate = useNavigate()

  // Store the text entered by the user
  const [query, setQuery] = useState('')

  // Control whether search results are visible
  const [isOpen, setIsOpen] = useState(false)

  // Track the selected search result
  const [activeIndex, setActiveIndex] = useState(0)

  // Reference to the search input
  const inputRef = useRef(null)

  // Reference to the entire search component
  const containerRef = useRef(null)


  // ==========================================
  // 03. SEARCH LOGIC
  // ==========================================

  // Filter commands using names, descriptions and keywords
  const filteredCommands = commands.filter((command) => {

    const searchableText = `
      ${command.name}
      ${command.description}
      ${command.keywords}
    `.toLowerCase()

    return searchableText.includes(
      query.trim().toLowerCase()
    )
  })


  // ==========================================
  // 04. GLOBAL KEYBOARD SHORTCUTS
  // ==========================================

  useEffect(() => {

    function handleShortcut(event) {

      // Open search with Command + K or Ctrl + K
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === 'k'
      ) {
        event.preventDefault()
        setIsOpen(true)
        inputRef.current?.focus()
      }

      // Close search with Escape
      if (event.key === 'Escape') {
        setIsOpen(false)
        inputRef.current?.blur()
      }
    }

    document.addEventListener('keydown', handleShortcut)

    // Remove the listener when the component is removed
    return () => {
      document.removeEventListener('keydown', handleShortcut)
    }

  }, [])


  // ==========================================
  // 05. CLOSE WHEN CLICKING OUTSIDE
  // ==========================================

  useEffect(() => {

    function handleOutsideClick(event) {

      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false)
      }

    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick
      )
    }

  }, [])


  // ==========================================
  // 06. EXECUTE SELECTED COMMAND
  // ==========================================

  function executeCommand(command) {

    // Clear the search and close the results
    setQuery('')
    setIsOpen(false)
    setActiveIndex(0)

    // Navigate to the selected page
    navigate(command.path)
  }


  // ==========================================
  // 07. KEYBOARD NAVIGATION
  // ==========================================

  function handleKeyDown(event) {

    if (!isOpen || filteredCommands.length === 0) return

    // Move down through the results
    if (event.key === 'ArrowDown') {
      event.preventDefault()

      setActiveIndex((previous) =>
        (previous + 1) % filteredCommands.length
      )
    }

    // Move up through the results
    if (event.key === 'ArrowUp') {
      event.preventDefault()

      setActiveIndex((previous) =>
        (previous - 1 + filteredCommands.length) %
        filteredCommands.length
      )
    }

    // Open the selected result
    if (event.key === 'Enter') {
      event.preventDefault()

      executeCommand(filteredCommands[activeIndex])
    }
  }


  // ==========================================
  // 08. USER INTERFACE
  // ==========================================

  return (

    <div className="command-container" ref={containerRef}>

      {/* Main search bar */}
      <div className="command-bar">

        {/* Search icon */}
        <Search size={20} />

        {/* Search input */}
        <input
          ref={inputRef}
          type="search"
          aria-label="Search features and commands"
          placeholder="Search anything..."
          value={query}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          onChange={(event) => {
            setQuery(event.target.value)
            setActiveIndex(0)
            setIsOpen(true)
          }}
        />

        {/* Clear search button */}
        {query && (
          <button
            className="command-clear"
            aria-label="Clear search"
            onClick={() => {
              setQuery('')
              setActiveIndex(0)
              inputRef.current?.focus()
            }}
          >
            <X size={16} />
          </button>
        )}

        {/* Keyboard shortcut indicator */}
        <kbd className="command-shortcut">
          ⌘ K
        </kbd>

      </div>


      {/* Search results dropdown */}
      {isOpen && (

        <div className="command-results">

          {/* Results section title */}
          <div className="command-results-title">
            {query ? 'Search results' : 'Quick actions'}
          </div>

          {/* Display matching commands */}
          {filteredCommands.map((command, index) => {

            const Icon = command.icon

            return (
              <button
                key={command.name}
                className={`command-item ${
                  index === activeIndex ? 'active' : ''
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => executeCommand(command)}
              >

                {/* Feature icon */}
                <div className="command-item-icon">
                  <Icon size={20} />
                </div>

                {/* Feature name and description */}
                <div className="command-item-text">
                  <span>{command.name}</span>
                  <small>{command.description}</small>
                </div>

              </button>
            )
          })}

          {/* Message when no results are found */}
          {filteredCommands.length === 0 && (
            <div className="command-empty">
              No results found.
            </div>
          )}

        </div>
      )}

    </div>
  )
}

// Export the component for use on other pages
export default CommandBar
