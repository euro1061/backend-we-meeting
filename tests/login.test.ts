import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { PrismaClient } from '@prisma/client'
import app from '../src/index'

const prisma = new PrismaClient()
const PORT = 3000

describe('Login', () => {
  beforeAll(async () => {
    // Create a test user
    const hashedPassword = await Bun.password.hash('correctpassword')
    await prisma.user.create({
      data: {
        username: 'testuser',
        password: hashedPassword,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      }
    })
  })

  afterAll(async () => {
    // Clean up the database after tests
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  it('should login successfully with correct credentials', async () => {
    const response = await app.handle(
      new Request(`http://localhost:${PORT}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          password: 'correctpassword'
        })
      })
    )

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.message).toBe('Login successful')
    expect(data.token).toBeDefined()
  })

  it('should not login with incorrect password', async () => {
    const response = await app.handle(
      new Request(`http://localhost:${PORT}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          password: 'wrongpassword'
        })
      })
    )

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.message).toBe('Invalid username or password')
  })

  it('should not login with non-existent username', async () => {
    const response = await app.handle(
      new Request(`http://localhost:${PORT}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'nonexistentuser',
          password: 'somepassword'
        })
      })
    )

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.message).toBe('Invalid username or password')
  })

  it('should not login with missing credentials', async () => {
    const response = await app.handle(
      new Request(`http://localhost:${PORT}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Missing username and password
        })
      })
    )

    expect(response.status).toBe(422)
    const data = await response.json()
    expect(data.message).toBe('Required property')
  })
})