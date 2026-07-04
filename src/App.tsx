import { Navigate, Route, Routes } from 'react-router-dom'
import { DynamicLinksAppFrame } from './components/DynamicLinksAppFrame/DynamicLinksAppFrame'
import { RequireAuth } from './routing/RequireAuth'
import { AuthScreen } from './screens/AuthScreen/AuthScreen'
import { HomeScreen } from './screens/HomeScreen/HomeScreen'
import { ProfileScreen } from './screens/ProfileScreen/ProfileScreen'
import { AuthContextProvider } from './contexts/AuthContext'

export const App = () => (
  <AuthContextProvider>
    <Routes>
      <Route path="/sign-in" element={<AuthScreen />} />
      <Route element={<RequireAuth />}>
        <Route element={<DynamicLinksAppFrame />}>
          <Route index element={<HomeScreen />} />
          <Route path="profile" element={<ProfileScreen />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </AuthContextProvider>
)
