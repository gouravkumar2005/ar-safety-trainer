// Copying text to the clipboard. The browser Clipboard API is unreliable
// inside an Android WebView, so the app uses the native clipboard instead.
// Throws if copying isn't possible — callers show a selectable fallback.
import { Clipboard } from '@capacitor/clipboard'
import { isNativeApp } from './index.js'

export async function copyText(text) {
  if (isNativeApp()) {
    await Clipboard.write({ string: text })
    return
  }
  await navigator.clipboard.writeText(text)
}
