// Regenerates the Android launcher icons and splash screens from the SVG
// sources in assets/ (icon-foreground.svg + icon-background.svg):
//   node scripts/generate-icons.mjs      (or: npm run android:icons)
// Step 1 renders the PNG inputs @capacitor/assets expects; step 2 runs it
// to produce every density under android/app/src/main/res/.

import { execSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const assets = join(root, 'assets')
const BG = '#0b0f17' // app background, also the splash colour
const SIZE = 1024
const SPLASH = 2732

const fg = join(assets, 'icon-foreground.svg')
const bg = join(assets, 'icon-background.svg')

// Adaptive-icon layers.
await sharp(fg).resize(SIZE, SIZE).png().toFile(join(assets, 'icon-foreground.png'))
await sharp(bg).resize(SIZE, SIZE).png().toFile(join(assets, 'icon-background.png'))

// Legacy (pre-Android 8) icon: foreground flattened onto the background.
await sharp(bg)
  .resize(SIZE, SIZE)
  .composite([{ input: await sharp(fg).resize(SIZE, SIZE).png().toBuffer() }])
  .png()
  .toFile(join(assets, 'icon-only.png'))

// Splash: the helmet centred on the app's dark background.
const splashLogo = await sharp(fg).resize(900, 900).png().toBuffer()
for (const name of ['splash.png', 'splash-dark.png']) {
  await sharp({ create: { width: SPLASH, height: SPLASH, channels: 4, background: BG } })
    .composite([{ input: splashLogo, gravity: 'center' }])
    .png()
    .toFile(join(assets, name))
}

execSync('npx capacitor-assets generate --android', { cwd: root, stdio: 'inherit' })
