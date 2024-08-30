import { Elysia } from 'elysia'
import bookingController from '../controllers/bookingController'

const bookingRoutes = new Elysia({ prefix: '/api/booking' })
    .use(bookingController)

export default bookingRoutes