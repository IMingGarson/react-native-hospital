import 'expo-dev-client'
import { Slot } from 'expo-router'
import { ThemeProvider } from 'styled-components/native'
import { appTheme } from 'src/config/theme'

export default function AppLayout() {
  return (
    <ThemeProvider theme={appTheme}>
      <Slot />
    </ThemeProvider>
  )
}