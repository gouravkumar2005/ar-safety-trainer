// Runs the Android project's Gradle wrapper with the given task, on any OS:
//   node scripts/gradle.mjs assembleDebug
// (Windows needs gradlew.bat, macOS/Linux ./gradlew — npm scripts can't
// express that difference on their own.)

import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const androidDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'android')
const isWindows = process.platform === 'win32'
const gradlew = join(androidDir, isWindows ? 'gradlew.bat' : 'gradlew')

const { status } = spawnSync(gradlew, process.argv.slice(2), {
  cwd: androidDir,
  stdio: 'inherit',
  shell: isWindows,
})
process.exit(status ?? 1)
