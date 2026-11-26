// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Country City Selector
// PURPOSE: Dynamic country and city selection
// ==========================================

// Import React tools
import { useMemo } from 'react'

// Import geographical data
import { Country, City } from 'country-state-city'

// Import reusable dropdown
import CustomDropdown from '../common/CustomDropdown'


function CountryCitySelector({
  country = '',
  city = '',
  onCountryChange,
  onCityChange,
  disabled = false
}) {

  // 01. LOAD COUNTRY OPTIONS

  const countries = useMemo(() => {

    return Country.getAllCountries()
      .map(item => ({
        value: item.isoCode,
        label: item.name,
        flag: item.flag
      }))
      .sort((a, b) =>
        a.label.localeCompare(b.label)
      )

  }, [])


  // 02. LOAD CITY OPTIONS

  const cities = useMemo(() => {

    if (!country) return []

    const countryCities =
      City.getCitiesOfCountry(country) || []

    const uniqueCities = [
      ...new Set(
        countryCities.map(item => item.name)
      )
    ]

    return uniqueCities
      .map(name => ({
        value: name,
        label: name
      }))
      .sort((a, b) =>
        a.label.localeCompare(b.label)
      )

  }, [country])


  // 03. HANDLE COUNTRY CHANGE

  function handleCountryChange(value) {

    if (value === country) return

    onCountryChange(value)

    // Reset city when country changes
    onCityChange('')

  }


  // 04. COUNTRY AND CITY INTERFACE

  return (
    <>

      {/* Country dropdown */}

      <CustomDropdown
        label="Country"
        options={countries}
        value={country}
        onChange={handleCountryChange}
        placeholder="Select your country"
        searchable={true}
        disabled={disabled}
      />


      {/* City dropdown */}

      <CustomDropdown
        label="City"
        options={cities}
        value={city}
        onChange={onCityChange}
        placeholder={
          country
            ? 'Select or search your city'
            : 'Select a country first'
        }
        searchable={true}
        allowCustom={true}
        disabled={disabled || !country}
      />

    </>
  )
}

export default CountryCitySelector