import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { PrismaClient } from '@prisma/client'
import app from '../src/index'

const prisma = new PrismaClient()
const PORT = 3000

describe('Register', () => {
  // ... existing setup and teardown

  // ... existing tests

  it('should not register a user with an existing email', async () => {
    // First, register a user
    await app.handle(
      new Request(`http://localhost:${PORT}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'user1',
          password: 'password123',
          email: 'duplicate@example.com',
          firstName: 'First',
          lastName: 'User'
        })
      })
    )

    // Try to register again with the same email
    const response = await app.handle(
      new Request(`http://localhost:${PORT}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'user2',
          password: 'password456',
          email: 'duplicate@example.com',
          firstName: 'Second',
          lastName: 'User'
        })
      })
    )

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.message).toBe('Username or email already exists')
  })

  it('should not register a user with invalid email format', async () => {
    const response = await app.handle(
      new Request(`http://localhost:${PORT}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'invalidemail',
          password: 'password123',
          email: 'invalid-email',
          firstName: 'Invalid',
          lastName: 'Email'
        })
      })
    )

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.message).toBe('Invalid email format')
  })

  it('should not register a user with a short password', async () => {
    const response = await app.handle(
      new Request(`http://localhost:${PORT}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'shortpass',
          password: 'short',
          email: 'short@example.com',
          firstName: 'Short',
          lastName: 'Password'
        })
      })
    )

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.message).toBe('Password must be at least 8 characters long')
  })

  it('should not register a user with missing required fields', async () => {
    const response = await app.handle(
      new Request(`http://localhost:${PORT}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'missingfields',
          password: 'password123'
          // missing email, firstName, and lastName
        })
      })
    )

    expect(response.status).toBe(422)
    const data = await response.json()
    expect(data.message).toBe('Required property')
  })
})