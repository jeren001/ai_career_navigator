// ==========================================
// PROJECT: AI CAREER
// COMPONENT: User Context
// PURPOSE: Manage and share global user data
// ==========================================

// Import React tools
import { createContext, useContext, useState } from 'react'


// 01. CREATE USER CONTEXT

const UserContext = createContext(null)


// 02. INITIAL USER DATA

// 02. INITIAL USER DATA

const initialProfile = {

  firstName: '',
  lastName: '',
  username: '',
  email: '',

  dateOfBirth: '',
  country: '',
  city: '',

  currentStatus: '',
  careerGoal: '',
  aboutMe: '',

  profilePhoto: null

}


// 03. USER PROVIDER

export function UserProvider({ children }) {

  const [profile, setProfile] = useState(initialProfile)


  // Update multiple profile fields

  function updateProfile(updatedData) {

    setProfile(previous => ({
      ...previous,
      ...updatedData
    }))

  }


  // Update profile photo

  function updateProfilePhoto(photo) {

    setProfile(previous => ({
      ...previous,
      profilePhoto: photo
    }))

  }


  // Reset user profile

  function resetProfile() {

    setProfile({ ...initialProfile })

  }


  // Shared user data and functions

  return (

    <UserContext.Provider
      value={{
        profile,
        setProfile,
        updateProfile,
        updateProfilePhoto,
        resetProfile
      }}
    >

      {children}

    </UserContext.Provider>

  )

}


// 04. CUSTOM USER HOOK

export function useUser() {

  const context = useContext(UserContext)

  if (!context) {

    throw new Error(
      'useUser must be used within a UserProvider'
    )

  }

  return context

}