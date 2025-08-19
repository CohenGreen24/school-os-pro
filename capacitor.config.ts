import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'au.yourschool.schoolos',  // unique identifier
  appName: 'School OS',             // will show under the icon
  webDir: 'dist',                   // where Vite puts the build
  server: {
    androidScheme: 'https'
  }
}

export default config
