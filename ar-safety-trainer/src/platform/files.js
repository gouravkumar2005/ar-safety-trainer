// Saving a generated text file (admin data export, audit report).
// Browser: a normal download. Android app: WebViews ignore <a download>, so
// the file is written to the app's cache and handed to the Android share
// sheet, where the user can save it to Files, Drive, WhatsApp, etc.
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { isNativeApp } from './index.js'

export async function saveTextFile(text, filename, mime) {
  if (isNativeApp()) {
    const { uri } = await Filesystem.writeFile({
      path: filename,
      data: text,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    })
    await Share.share({ title: filename, url: uri })
    return
  }

  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
