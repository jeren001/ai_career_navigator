// ==========================================
// PROJECT: AI CAREER
// COMPONENT: User Context
// PURPOSE: Manage and share global user data
// ==========================================

// Import React tools
import { createContext, useContext, useEffect, useState } from 'react'
import { resetInterviewWorkspace } from '../services/interviewSessionDatabase'
import { clearCVWorkspace, getCVWorkspace, workspaceRevocationPrefix } from '../services/cvWorkspace'


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

  const [cvWorkspace, setCVWorkspace] = useState(getCVWorkspace)
  const [profile, setProfile] = useState(initialProfile)

  useEffect(() => {
    function handleWorkspaceRevocation(event) {
      if (cvWorkspace && event.key === workspaceRevocationPrefix + cvWorkspace && event.newValue) {
        setProfile({ ...initialProfile })
        setCVWorkspace(getCVWorkspace())
      }
    }

    window.addEventListener('storage', handleWorkspaceRevocation)
    return () => window.removeEventListener('storage', handleWorkspaceRevocation)
  }, [cvWorkspace])


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
    resetInterviewWorkspace()
    clearCVWorkspace()
    setCVWorkspace(getCVWorkspace())

    setProfile({ ...initialProfile })

  }


  // Shared user data and functions

  return (

    <UserContext.Provider
      value={{
        profile,
        cvWorkspace,
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