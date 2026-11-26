// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Custom Dropdown
// PURPOSE: Reusable searchable dropdown
// ==========================================

// Import React tools
import { useState, useEffect, useRef, useId } from 'react'

// Import icons
import { useLocale } from '../../lib/locale.js'
import { ChevronDown, Check, Search, Plus } from 'lucide-react'

// Import component styles
import '../../styles/custom-dropdown.css'


function CustomDropdown({
  label,
  options = [],
  value = '',
  onChange,
  placeholder,
  searchable = true,
  allowCustom = false,
  disabled = false
}) {

  // 01. COMPONENT STATE

  const [isOpen, setIsOpen] = useState(false)
  const { t } = useLocale()
  const searchLabel = t(`Search ${label.toLowerCase()}`, `搜索${label}`)
  const [search, setSearch] = useState('')

  const dropdownRef = useRef(null)
  const triggerRef = useRef(null)
  const searchRef = useRef(null)

  const dropdownId = useId()


  // 02. SELECTED OPTION

  const selectedOption = options.find(
    option => option.value === value
  )


  // 03. FILTER OPTIONS

  function normalizeText(text) {

    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()

  }

  const searchTerm = normalizeText(search.trim())
  const filteredOptions = options.filter(({ label, sourceLabel }) =>
    normalizeText(label).includes(searchTerm) || (sourceLabel && normalizeText(sourceLabel).includes(searchTerm))
  )


  // 04. CLOSE WHEN CLICKING OUTSIDE

  useEffect(() => {

    function handleOutsideClick(event) {

      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false)
        setSearch('')
      }

    }

    document.addEventListener(
      'pointerdown',
      handleOutsideClick
    )

    return () => {
      document.removeEventListener(
        'pointerdown',
        handleOutsideClick
      )
    }

  }, [])


  // 05. FOCUS SEARCH FIELD

  useEffect(() => {

    if (isOpen && searchable) {
      searchRef.current?.focus()
    }

  }, [isOpen, searchable])


  // 06. TOGGLE DROPDOWN

  function handleToggle() {

    if (disabled) return

    setIsOpen(previous => !previous)
    setSearch('')

  }


  // 07. SELECT OPTION

  function handleSelect(selectedValue) {

    onChange(selectedValue)

    setIsOpen(false)
    setSearch('')

    triggerRef.current?.focus()

  }


  // 08. KEYBOARD CONTROLS

  function handleKeyDown(event) {

    if (event.key === 'Escape') {

      event.preventDefault()

      setIsOpen(false)
      setSearch('')

      triggerRef.current?.focus()

    }

  }


  // 09. CUSTOM OPTION

  const customValue = search.trim()

  const showCustomOption =
    allowCustom &&
    customValue !== '' &&
    !options.some(option =>
      normalizeText(option.label) ===
      normalizeText(customValue)
    )


  // 10. DROPDOWN INTERFACE

  return (

    <div
      className="custom-dropdown"
      ref={dropdownRef}
      onKeyDown={handleKeyDown}
      onBlur={event => {

        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false)
          setSearch('')
        }

      }}
    >

      {/* Field label */}

      <label htmlFor={dropdownId}>
        {label}
      </label>


      {/* Dropdown trigger */}

      <button
        id={dropdownId}
        ref={triggerRef}
        type="button"
        className={`custom-dropdown-trigger ${
          isOpen ? 'is-open' : ''
        }`}
        onClick={handleToggle}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-controls={
          isOpen && !disabled
            ? `${dropdownId}-menu`
            : undefined
        }
      >

        <span
          className={
            value
              ? 'custom-dropdown-value'
              : 'custom-dropdown-placeholder'
          }
        >

          {selectedOption?.flag && (
            <span className="custom-dropdown-flag">
              {selectedOption.flag}
            </span>
          )}

          {selectedOption?.label || value || placeholder || t('Select an option', '请选择')}

        </span>

        <ChevronDown
          size={17}
          className={`custom-dropdown-arrow ${
            isOpen ? 'rotated' : ''
          }`}
        />

      </button>


      {/* Dropdown menu */}

      {isOpen && !disabled && (

        <div
          id={`${dropdownId}-menu`}
          className="custom-dropdown-menu"
        >

          {/* Search field */}

          {searchable && (

            <div className="custom-dropdown-search">

              <Search size={16} />

              <input
                ref={searchRef}
                type="text"
                value={search}
                placeholder={searchLabel + '…'}
                aria-label={searchLabel}
                onChange={event =>
                  setSearch(event.target.value)
                }
                autoComplete="off"
              />

            </div>

          )}


          {/* Options list */}

          <div className="custom-dropdown-options">

            {filteredOptions.map(option => (

              <button
                key={option.value}
                type="button"
                className={`custom-dropdown-option ${
                  value === option.value ? 'selected' : ''
                }`}
                onClick={() => handleSelect(option.value)}
                aria-pressed={value === option.value}
              >

                <span>

                  {option.flag && (
                    <span className="custom-dropdown-flag">
                      {option.flag}
                    </span>
                  )}

                  {option.label}

                </span>

                {value === option.value && (
                  <Check size={16} />
                )}

              </button>

            ))}


            {/* No results */}

            {filteredOptions.length === 0 &&
              !showCustomOption && (

                <div className="custom-dropdown-empty">
                  {t('No results found', '未找到结果')}
                </div>

            )}


            {/* Manual entry */}

            {showCustomOption && (

              <button
                type="button"
                className="custom-dropdown-option custom-entry"
                onClick={() => handleSelect(customValue)}
              >

                <Plus size={16} />

                <span>
                  {t(`Use “${customValue}”`, `使用“${customValue}”`)}
                </span>

              </button>

            )}

          </div>

        </div>

      )}

    </div>

  )
}

export default CustomDropdown