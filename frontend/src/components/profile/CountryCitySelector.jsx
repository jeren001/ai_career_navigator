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
import { useLocale } from '../../lib/locale.js'
import CustomDropdown from '../common/CustomDropdown'


function CountryCitySelector({
  country = '',
  city = '',
  onCountryChange,
  onCityChange,
  disabled = false
}) {

  const { t, locale } = useLocale()

  // 01. LOAD COUNTRY OPTIONS

  const countries = useMemo(() => {

    const names = new Intl.DisplayNames([locale], { type: 'region' })
    return Country.getAllCountries()
      .map(item => ({
        value: item.isoCode,
        label: names.of(item.isoCode) ?? item.name,
        sourceLabel: item.name,
        flag: item.flag
      }))
      .sort((a, b) =>
        a.label.localeCompare(b.label)
      )

  }, [locale])


  // 02. LOAD CITY OPTIONS

  const cities = useMemo(() => {

    if (!country) return []

    const countryCode = countries.find(({ value, label, sourceLabel }) =>
      [value, label, sourceLabel].some((name) => name.toLowerCase() === country.toLowerCase())
    )?.value
    const countryCities = countryCode ? City.getCitiesOfCountry(countryCode) : []

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

  }, [country, countries])


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
        label={t('Country', '国家')}
        options={countries}
        value={country}
        onChange={handleCountryChange}
        placeholder={t('Select your country', '选择国家')}
        searchable={true}
        disabled={disabled}
      />


      {/* City dropdown */}

      <CustomDropdown
        label={t('City', '城市')}
        options={cities}
        value={city}
        onChange={onCityChange}
        placeholder={
          country
            ? t('Select or search your city', '选择或搜索城市')
            : t('Select a country first', '请先选择国家')
        }
        searchable={true}
        allowCustom={true}
        disabled={disabled || !country}
      />

    </>
  )
}

export default CountryCitySelector
