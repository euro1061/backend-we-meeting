import { Elysia, t } from 'elysia'
import { PrismaClient } from '@prisma/client'
import authMiddleware from '../middlewares/authMiddleware'

const prisma = new PrismaClient()

const bookingController = new Elysia()
    .use(authMiddleware)
    // Create a new booking
    .post('/bookings', async ({ body, set, authenticate }) => {
        const auth = await authenticate()
        if (!auth.success) return auth

        const { roomId, startTime, endTime, title, description, attendeeCount } = body
        const start = new Date(startTime)
        const end = new Date(endTime)

        try {
            // Check for overlapping bookings
            const overlappingBooking = await prisma.booking.findFirst({
                where: {
                    roomId: roomId,
                    OR: [
                        {
                            AND: [
                                { startTime: { lte: start } },
                                { endTime: { gt: start } }
                            ]
                        },
                        {
                            AND: [
                                { startTime: { lt: end } },
                                { endTime: { gte: end } }
                            ]
                        },
                        {
                            AND: [
                                { startTime: { gte: start } },
                                { endTime: { lte: end } }
                            ]
                        }
                    ]
                }
            })

            if (overlappingBooking) {
                set.status = 409 // Conflict
                return { error: 'This room is already booked for the specified time period.' }
            }

            // If no overlapping booking, create the new booking
            const booking = await prisma.booking.create({
                data: {
                    userId: Number(auth.user?.userId),
                    roomId,
                    startTime: start,
                    endTime: end,
                    title,
                    description,
                    attendeeCount
                }
            })
            set.status = 201
            return booking
        } catch (error) {
            console.error('Booking creation error:', error)
            set.status = 400
            return { error: 'Unable to create booking. Please check your input.' }
        }
    }, {
        body: t.Object({
            roomId: t.Number(),
            startTime: t.String(),
            endTime: t.String(),
            title: t.String(),
            description: t.Optional(t.String()),
            attendeeCount: t.Number()
        }),
        detail: {
            tags: ['Bookings'],
            summary: 'Create a new booking',
            description: 'Create a new booking for a room (requires authentication)'
        }
    })

    // Get all bookings (all member)
    .get('/bookings', async ({ authenticate, set }) => {
        const auth = await authenticate()
        if (!auth.success) return auth

        return await prisma.booking.findMany({
            include: { user: true, room: true }
        })
    }, {
        detail: {
            tags: ['Bookings'],
            summary: 'Get all bookings',
            description: 'Retrieve a list of all bookings (admin only, requires authentication)'
        }
    })

    // Get a specific booking
    .get('/bookings/:id', async ({ params, set, authenticate }) => {
        const auth = await authenticate()
        if (!auth.success) return auth

        const booking = await prisma.booking.findUnique({
            where: { id: parseInt(params.id) },
            include: { user: true, room: true }
        })
        if (!booking) {
            set.status = 404
            return { error: 'Booking not found' }
        }
        if (booking.userId !== auth.user?.userId) {
            set.status = 403
            return { error: 'Access denied. You can only view your own bookings.' }
        }
        return booking
    }, {
        detail: {
            tags: ['Bookings'],
            summary: 'Get a specific booking',
            description: 'Retrieve details of a specific booking by ID (requires authentication)'
        }
    })

    // Update a booking
    .put('/bookings/:id', async ({ params, body, set, authenticate }) => {
        const auth = await authenticate()
        if (!auth.success) return auth

        const { startTime, endTime, description, title, attendeeCount } = body

        const start = new Date(startTime)
        const end = new Date(endTime)

        try {
            const booking = await prisma.booking.findUnique({
                where: { id: parseInt(params.id) }
            })
            if (!booking) {
                set.status = 404
                return { error: 'Booking not found' }
            }
            if (booking.userId !== auth.user?.userId) {
                set.status = 403
                return { error: 'Access denied. You can only update your own bookings.' }
            }

            // Check for overlapping bookings
            const overlappingBooking = await prisma.booking.findFirst({
                where: {
                    id: { not: parseInt(params.id) }, // Exclude the current booking
                    roomId: booking.roomId,
                    OR: [
                        {
                            AND: [
                                { startTime: { lte: start } },
                                { endTime: { gt: start } }
                            ]
                        },
                        {
                            AND: [
                                { startTime: { lt: end } },
                                { endTime: { gte: end } }
                            ]
                        },
                        {
                            AND: [
                                { startTime: { gte: start } },
                                { endTime: { lte: end } }
                            ]
                        }
                    ]
                }
            })

            if (overlappingBooking) {
                set.status = 409 // Conflict
                return { error: 'This room is already booked for the specified time period.' }
            }

            const updatedBooking = await prisma.booking.update({
                where: { id: parseInt(params.id) },
                data: {
                    title,
                    description,
                    attendeeCount,
                    startTime: start,
                    endTime: end
                }
            })
            return updatedBooking
        } catch (error) {
            console.error('Booking update error:', error)
            set.status = 400
            return { error: 'Update failed. Please check your input.' }
        }
    }, {
        body: t.Object({
            startTime: t.String(),
            endTime: t.String(),
            description: t.Optional(t.String()),
            title: t.String(),
            attendeeCount: t.Number()
        }),
        detail: {
            tags: ['Bookings'],
            summary: 'Update a booking',
            description: 'Update details of a specific booking by ID (requires authentication)'
        }
    })

    // Delete a booking
    .delete('/bookings/:id', async ({ params, set, authenticate }) => {
        const auth = await authenticate()
        if (!auth.success) return auth

        try {
            const isAdmin = auth.user?.role === 'ADMIN'
            const booking = await prisma.booking.findUnique({
                where: { id: parseInt(params.id) }
            })
            
            if (!booking) {
                set.status = 404
                return { error: 'Booking not found' }
            }
            if (booking.userId !== auth.user?.userId && !isAdmin) {
                set.status = 403
                return { error: 'Access denied. You can only delete your own bookings.' }
            }

            await prisma.booking.delete({
                where: { id: parseInt(params.id) }
            })
            set.status = 200
            return { success: true, message: 'Booking deleted' }
        } catch (error) {
            console.error('Error deleting booking:', error)
            set.status = 400
            return { error: 'Delete failed' }
        }
    }, {
        detail: {
            tags: ['Bookings'],
            summary: 'Delete a booking',
            description: 'Delete a specific booking by ID (requires authentication)'
        }
    })

    // Get bookings for the authenticated user
    .get('/my-bookings', async ({ authenticate }) => {
        const auth = await authenticate()
        if (!auth.success) return auth
        console.log(auth)
        return await prisma.booking.findMany({
            where: { userId: Number(auth.user?.userId) },
            include: { room: true }
        })
    }, {
        detail: {
            tags: ['Bookings'],
            summary: 'Get my bookings',
            description: 'Retrieve all bookings for the authenticated user'
        }
    })

    .get('/available-rooms', async ({ query, set, authenticate }) => {
        const auth = await authenticate()
        if (!auth.success) return auth

        const { startTime, endTime } = query
        const start = new Date(startTime)
        const end = new Date(endTime)

        try {
            // Get all rooms
            const allRooms = await prisma.room.findMany()

            // Get bookings that overlap with the specified time period
            const overlappingBookings = await prisma.booking.findMany({
                where: {
                    OR: [
                        {
                            AND: [
                                { startTime: { lte: start } },
                                { endTime: { gt: start } }
                            ]
                        },
                        {
                            AND: [
                                { startTime: { lt: end } },
                                { endTime: { gte: end } }
                            ]
                        },
                        {
                            AND: [
                                { startTime: { gte: start } },
                                { endTime: { lte: end } }
                            ]
                        }
                    ]
                }
            })

            // Create a set of booked room IDs
            const bookedRoomIds = new Set(overlappingBookings.map(booking => booking.roomId))

            // Filter out booked rooms
            const availableRooms = allRooms.filter(room => !bookedRoomIds.has(room.id))

            return availableRooms
        } catch (error) {
            console.error('Error fetching available rooms:', error)
            set.status = 500
            return { error: 'An error occurred while fetching available rooms.' }
        }
    }, {
        query: t.Object({
            startTime: t.String(),
            endTime: t.String()
        }),
        detail: {
            tags: ['Bookings'],
            summary: 'Get available rooms',
            description: 'Retrieve a list of available rooms for a specific time period'
        }
    })

    // Check room availability (no authentication required)
    .get('/rooms/:roomId/availability', async ({ params, query }) => {
        const { startTime, endTime } = query
        const bookings = await prisma.booking.findMany({
            where: {
                roomId: parseInt(params.roomId),
                OR: [
                    {
                        startTime: {
                            gte: new Date(startTime as string),
                            lt: new Date(endTime as string)
                        }
                    },
                    {
                        endTime: {
                            gt: new Date(startTime as string),
                            lte: new Date(endTime as string)
                        }
                    }
                ]
            }
        })
        return { isAvailable: bookings.length === 0, conflictingBookings: bookings }
    }, {
        query: t.Object({
            startTime: t.String(),
            endTime: t.String()
        }),
        detail: {
            tags: ['Bookings'],
            summary: 'Check room availability',
            description: 'Check if a room is available for a specific time period'
        }
    })

export default bookingController