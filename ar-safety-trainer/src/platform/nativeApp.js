// Android-app-only setup, run once at startup. Does nothing in a browser.
//  - hardware Back button walks back through screens, exits on home
//  - status bar matches the app's dark theme
//  - splash screen hides once the first screen is drawn
//  - AR buttons open Google Scene Viewer (see arLauncher.js)

import { App } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { isNativeApp } from './index.js'
import { interceptModelViewerArButtons } from './arLauncher.js'

const HOME_HASHES = ['', '#', '#/']

export function initNativeApp() {
  if (!isNativeApp()) return

  App.addListener('backButton', ({ canGoBack }) => {
    if (HOME_HASHES.includes(window.location.hash)) App.exitApp()
    else if (canGoBack) window.history.back()
    else window.location.hash = '#/'
  })

  StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
  StatusBar.setBackgroundColor({ color: '#0b3d91' }).catch(() => {})

  interceptModelViewerArButtons()

  requestAnimationFrame(() => SplashScreen.hide().catch(() => {}))
}
