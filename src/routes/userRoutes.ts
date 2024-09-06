import { Elysia } from 'elysia'
import userController from '../controllers/userController'

const userRoutes = new Elysia({ prefix: '/api/room' })
  .use(userController)

export default userRoutes