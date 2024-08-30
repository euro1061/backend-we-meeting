import { Elysia } from 'elysia'
import authController from '../controllers/authController'

const authRoutes = new Elysia({ prefix: '/api/auth' })
  .use(authController)

export default authRoutes