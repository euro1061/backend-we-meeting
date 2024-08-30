import { Elysia, t } from 'elysia'
import { PrismaClient } from '@prisma/client'
import jwt from '@elysiajs/jwt'

const prisma = new PrismaClient()

const authController = new Elysia()
  .use(jwt({
    name: 'jwt',
    secret: process.env.JWT_SECRET || 'your-secret-key'
  }))
  .post('/register', async ({ body, set }) => {
    const { username, password, email, firstName, lastName } = body

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      set.status = 400
      return { message: 'Invalid email format' }
    }

    // Password length validation
    if (password.length < 8) {
      set.status = 400
      return { message: 'Password must be at least 8 characters long' }
    }

    // Check for existing user
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] }
    })

    if (existingUser) {
      set.status = 400
      return { message: 'Username or email already exists' }
    }

    // Create new user
    try {
      const hashedPassword = await Bun.password.hash(password)
      const newUser = await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          email,
          firstName,
          lastName
        }
      })

      return { message: 'User registered successfully', userId: newUser.id }
    } catch (error) {
      console.error('Registration error:', error)
      set.status = 500
      return { message: 'Internal server error' }
    }
  }, {
    body: t.Object({
      username: t.String(),
      password: t.String(),
      email: t.String(),
      firstName: t.String(),
      lastName: t.String()
    }),
    response: {
      200: t.Object({
        message: t.String(),
        userId: t.Number()
      }),
      400: t.Object({
        message: t.String()
      }),
      500: t.Object({
        message: t.String()
      })
    },
    detail: {
      tags: ['Authentication'],
      summary: 'Register a new user',
      description: 'Create a new user account with the provided details',
      responses: {
        '200': { description: 'User registered successfully' },
        '400': { description: 'Invalid input or user already exists' },
        '500': { description: 'Internal server error' }
      }
    }
  })
  .post('/login', async ({ body, set, jwt }) => {
    const { username, password } = body

    const user = await prisma.user.findUnique({ where: { username } })

    if (!user) {
      set.status = 401
      return { message: 'Invalid username or password' }
    }

    const isValidPassword = await Bun.password.verify(password, user.password)

    if (!isValidPassword) {
      set.status = 401
      return { message: 'Invalid username or password' }
    }

    const token = await jwt.sign({ userId: user.id, username: user.username, role: user.role, email: user.email })

    return { message: 'Login successful', token }
  }, {
    body: t.Object({
      username: t.String(),
      password: t.String()
    }),
    response: {
      200: t.Object({
        message: t.String(),
        token: t.String()
      }),
      401: t.Object({
        message: t.String()
      }),
      422: t.Object({
        message: t.String()
      })
    },
    detail: {
      tags: ['Authentication'],
      summary: 'User login',
      description: 'Authenticate a user and return a JWT token',
      responses: {
        '200': { description: 'Login successful, returns JWT token' },
        '401': { description: 'Invalid username or password' },
        '422': { description: 'Invalid input' }
      }
    }
  })

export default authController