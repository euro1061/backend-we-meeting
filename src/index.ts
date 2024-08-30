import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import authRoutes from './routes/authRoutes'
import roomRoutes from './routes/roomRoutes'
import { swaggerConfig } from './config/swagger'
import { useLoggers } from './config/loggers'

const app = new Elysia({
  name: "backend-we-meeting"
})
  .use(useLoggers)
  .use(cors())
  .use(swagger(swaggerConfig))
  .use(authRoutes)
  .use(roomRoutes)
  .onStart((app) => {
    console.log('Available routes:')
    app.routes.forEach(route => {
      console.log(`${route.method} ${route.path}`)
    })
    console.log(`-------------------------------------------------`)
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