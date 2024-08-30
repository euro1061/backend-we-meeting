import { Elysia } from 'elysia'
import jwt from '@elysiajs/jwt'

const authMiddleware = new Elysia()
  .use(jwt({
    name: 'jwt',
    secret: process.env.JWT_SECRET || 'your-secret-key'
  }))
  .derive({ as: 'scoped' }, async ({ jwt, set, headers }) => {
    const authenticate = async () => {
      const token = headers.authorization?.split(' ')[1]
      if (!token) {
        set.status = 401
        return { success: false, error: 'No token provided' }
      }

      const payload = await jwt.verify(token)
      if (!payload) {
        set.status = 401
        return { success: false, error: 'Invalid token' }
      }

      return { success: true, user: payload }
    }

    return { authenticate }
  })

export default authMiddleware