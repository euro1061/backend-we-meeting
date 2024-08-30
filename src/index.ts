import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import authRoutes from './routes/authRoutes'
import roomRoutes from './routes/roomRoutes'
import bookingRoutes from './routes/bookingRoutes'
import { swaggerConfig } from './config/swagger'
import { useLoggers } from './config/loggers'
import { readFile } from 'fs/promises'
import { extname } from 'path'
import reportController from './controllers/reportController'
const UPLOAD_DIR = 'uploads'

const app = new Elysia({ name: "backend-we-meeting" })
  .use(useLoggers)
  .use(cors())
  .use(swagger(swaggerConfig))
  .use(authRoutes)
  .use(roomRoutes)
  .use(reportController)
  .use(bookingRoutes)
  .onStart((app) => {
    console.log('Available routes:')
    app.routes.forEach(route => {
      console.log(`${route.method} ${route.path}`)
    })
    console.log(`-------------------------------------------------`)
  })
  .get('/uploads/:filename', async ({ params, set }) => {
    try {
      const filePath = `${UPLOAD_DIR}/${params.filename}`
      const file = await readFile(filePath)
      const ext = extname(filePath).toLowerCase()
      const mimeType = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif'
      }[ext] || 'application/octet-stream'

      set.headers['Content-Type'] = mimeType
      return file
    } catch (error) {
      set.status = 404
      return 'File not found'
    }
  }, {
    detail: {
      tags: ['Images'],
      summary: 'Get Image',
      description: 'Get Image From Folder ./uploads',
    }
  })
  .onError(({ code, error, set }) => {
    if (code === 'NOT_FOUND') {
      set.status = 404
      return { message: 'Not Found!' }
    }
    if (code === 'VALIDATION' || code === 'PARSE') {
      set.status = 422
      return { message: 'Bad Request: ' + error.message }
    }
    console.error(error)
    set.status = 500
    return { message: 'Internal Server Error' }
  })
  .listen(3000)

export default app