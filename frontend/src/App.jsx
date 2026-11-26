import { lazy, Suspense } from 'react'
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import About from './pages/About'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import PasswordRecovery from './pages/PasswordRecovery'
import LocaleProvider from './lib/LocaleProvider'
import SessionProvider from './session/SessionProvider'
import RequireSession from './session/RequireSession'
import { UserProvider } from './context/UserContext'
import './styles/integration.css'

const MyProfile = lazy(() => import('./pages/MyProfile'))
const Settings = lazy(() => import('./pages/Settings'))

export default function App() {
  return (
    <LocaleProvider>
      <SessionProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/password-recovery" element={<PasswordRecovery />} />
            <Route path="/signup" element={<SignUp />} />
            <Route element={
              <RequireSession>
                <UserProvider>
                  <Suspense fallback={null}>
                    <Outlet />
                  </Suspense>
                </UserProvider>
              </RequireSession>
            }>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route element={<RequireSession registeredOnly />}>
                <Route path="/profile" element={<MyProfile />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </SessionProvider>
    </LocaleProvider>
  )
}
