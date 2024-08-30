import { Elysia } from 'elysia'
import jwt from '@elysiajs/jwt'

const authMiddleware = new Elysia()
  .use(jwt({
    name: 'jwt',
    secret: process.env.JWT_SECRET || 'your-secret-key'
  }))
  .derive(({ jwt, set }) => ({
    auth: async () => {
      // ดึง token จาก Authorization header
      const token = set.headers.authorization?.split(' ')[1]
      if (!token) {
        set.status = 401
        return 'Unauthorized'
      }
      // ตรวจสอบความถูกต้องของ token
      const payload = await jwt.verify(token)
      if (!payload) {
        set.status = 401
        return 'Invalid token'
      }
      // ส่งคืนข้อมูลผู้ใช้ที่อยู่ใน token
      return payload
    }
  }))

export default authMiddleware