
// ==========================================
// PROJECT: AI CAREER
// COMPONENT: CV Month Year Picker
// PURPOSE: Reusable month and year selection
// ==========================================


// ==========================================
// 01. MONTH CONFIGURATION
// ==========================================

const months = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' }
]


// ==========================================
// 02. MONTH YEAR PICKER COMPONENT
// ==========================================

function CVMonthYearPicker({
  id,
  label = 'Date',
  value = '',
  onChange,
  required = false,
  disabled = false,
  minYear = 1950,
  maxYear = new Date().getFullYear()
}) {

  // Extract year and month from the stored value

  const [year = '', month = ''] = (value || '').split('-')


  // Generate available years in descending order

  const years = Array.from(
    { length: Math.max(0, maxYear - minYear + 1) },
    (_, index) => maxYear - index
  )


  // ==========================================
  // 03. UPDATE DATE VALUE
  // ==========================================

  function handleDateChange(newYear, newMonth) {

    if (!newYear && !newMonth) {
      onChange('')
      return
    }

    // Preserve partial selections until both are selected

    onChange(`${newYear}-${newMonth}`)

  }


  // ==========================================
  // 04. COMPONENT INTERFACE
  // ==========================================

  return (

    <div className="cv-month-year-picker">

      {/* MONTH SELECTOR */}

      <select
        id={`${id}-month`}
        className="cv-month-select"
        aria-label={`${label} month`}
        value={month}
        disabled={disabled}
        required={required && !disabled}
        onChange={event =>
          handleDateChange(year, event.target.value)
        }
      >

        <option value="">Month</option>

        {months.map(item => (

          <option
            key={item.value}
            value={item.value}
          >
            {item.label}
          </option>

        ))}

      </select>


      {/* YEAR SELECTOR */}

      <select
        id={`${id}-year`}
        className="cv-year-select"
        aria-label={`${label} year`}
        value={year}
        disabled={disabled}
        required={required && !disabled}
        onChange={event =>
          handleDateChange(event.target.value, month)
        }
      >

        <option value="">Year</option>

        {years.map(item => (

          <option
            key={item}
            value={String(item)}
          >
            {item}
          </option>

        ))}

      </select>

    </div>

  )

}

export default CVMonthYearPicker
