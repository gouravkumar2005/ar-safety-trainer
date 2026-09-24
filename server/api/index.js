// Entry point when the server runs on Vercel (serverless). Vercel sends
// every request here (see ../vercel.json) and calls the Express app for
// it; there's no app.listen(). Locally and on Render, src/index.js is used.
import { config } from '../src/config.js'
import { createApp } from '../src/app.js'

const { app } = await createApp(config)

export default app
