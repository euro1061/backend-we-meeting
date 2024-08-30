import { Elysia } from 'elysia'
import roomController from '../controllers/roomController'

const roomRoutes = new Elysia({ prefix: '/api/room' })
  .use(roomController)

export default roomRoutes