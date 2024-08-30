import { Elysia, t } from 'elysia'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'
import { writeFile } from 'fs/promises'
import path from 'path'
import { unlink } from 'fs/promises'
import authMiddleware from '../middlewares/authMiddleware'

const prisma = new PrismaClient()

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')

const roomController = new Elysia()
  .use(authMiddleware)
  // Create a room
  .post('/rooms', async ({ request, set, authenticate }) => {
    const auth = await authenticate()
    if (!auth.success) return auth

    const formData = await request.formData()
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const capacity = parseInt(formData.get('capacity') as string)
    const image = formData.get('image') as File | null

    let imageUrl = null
    if (image && image instanceof File && image.type.startsWith('image/')) {
      const fileExt = image.name.split('.').pop()
      const fileName = `${randomUUID()}.${fileExt}`
      const filePath = path.join(UPLOAD_DIR, fileName)

      const arrayBuffer = await image.arrayBuffer()
      await writeFile(filePath, Buffer.from(arrayBuffer))
      imageUrl = `/uploads/${fileName}`
    }

    const room = await prisma.room.create({
      data: { name, description, capacity, imageUrl }
    })

    set.status = 201
    return room
  }, {
    detail: {
      tags: ['Rooms'],
      summary: 'Create a new room',
      description: 'Create a new room with the provided details and optional image upload',
      requestBody: {
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                capacity: { type: 'string' },
                image: { type: 'string', format: 'binary' }
              }
            }
          }
        }
      }
    }
  })

  // Get all rooms
  .get('/rooms', async () => {
    return await prisma.room.findMany()
  }, {
    detail: {
      tags: ['Rooms'],
      summary: 'Get all rooms',
      description: 'Retrieve a list of all rooms'
    }
  })

  // Get a specific room
  .get('/rooms/:id', async ({ params, set }) => {
    const room = await prisma.room.findUnique({
      where: { id: parseInt(params.id) }
    })
    if (!room) {
      set.status = 404
      return { error: 'Room not found' }
    }
    return room
  }, {
    detail: {
      tags: ['Rooms'],
      summary: 'Get a specific room',
      description: 'Retrieve details of a specific room by ID'
    }
  })

  // Update a room
  .put('/rooms/:id', async ({ params, request, set, authenticate }) => {
    const auth = await authenticate()
    if (!auth.success) return auth

    const formData = await request.formData()
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const capacity = parseInt(formData.get('capacity') as string)
    const image = formData.get('image') as File | null

    try {
      // Get the current room data
      const currentRoom = await prisma.room.findUnique({
        where: { id: parseInt(params.id) }
      })

      if (!currentRoom) {
        set.status = 404
        return { error: 'Room not found' }
      }

      let imageUrl = currentRoom.imageUrl // Keep the current image URL by default

      if (image && image instanceof File && image.type.startsWith('image/')) {
        // If there's a new image uploaded

        // Delete the old image if it exists
        if (currentRoom.imageUrl) {
          const oldImagePath = path.join(process.cwd(), currentRoom.imageUrl.slice(1))
          await unlink(oldImagePath).catch(error => {
            console.error('Error deleting old image:', error)
          })
        }

        // Upload the new image
        const fileExt = image.name.split('.').pop()
        const fileName = `${randomUUID()}.${fileExt}`
        const filePath = path.join(UPLOAD_DIR, fileName)

        const arrayBuffer = await image.arrayBuffer()
        await writeFile(filePath, Buffer.from(arrayBuffer))
        imageUrl = `/uploads/${fileName}`
      }

      // Update the room in the database
      const updatedRoom = await prisma.room.update({
        where: { id: parseInt(params.id) },
        data: {
          name,
          description,
          capacity,
          imageUrl
        }
      })

      return updatedRoom
    } catch (error) {
      console.error('Error updating room:', error)
      set.status = 500
      return { error: 'An error occurred while updating the room' }
    }
  }, {
    detail: {
      tags: ['Rooms'],
      summary: 'Update a room',
      description: 'Update details of a specific room by ID, including optional image upload. If a new image is uploaded, the old image will be deleted.',
      requestBody: {
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                capacity: { type: 'string' },
                image: { type: 'string', format: 'binary' }
              }
            }
          }
        }
      }
    }
  })

  // Delete a room
  .delete('/rooms/:id', async ({ params, set, authenticate }) => {
    try {
      const auth = await authenticate()
      if (!auth.success) return auth
      // First, find the room to get the image URL
      const room = await prisma.room.findUnique({
        where: { id: parseInt(params.id) }
      })

      if (!room) {
        set.status = 404
        return { error: 'Room not found' }
      }

      // If the room has an image, delete it
      if (room.imageUrl) {
        const imagePath = path.join(process.cwd(), room.imageUrl.slice(1))
        await unlink(imagePath).catch(error => {
          console.error('Error deleting room image:', error)
          // We'll continue with deletion even if image deletion fails
        })
      }

      // Now delete the room from the database
      await prisma.room.delete({
        where: { id: parseInt(params.id) }
      })

      set.status = 204
      return
    } catch (error) {
      console.error('Error deleting room:', error)
      set.status = 500
      return { error: 'An error occurred while deleting the room' }
    }
  }, {
    detail: {
      tags: ['Rooms'],
      summary: 'Delete a room',
      description: 'Delete a specific room by ID and its associated image file'
    }
  })

export default roomController