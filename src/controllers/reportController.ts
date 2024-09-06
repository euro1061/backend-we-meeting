import { Elysia, t } from 'elysia'
import { PrismaClient } from '@prisma/client'
import authMiddleware from '../middlewares/authMiddleware'

const prisma = new PrismaClient()

interface Booking {
    startTime: Date;
    endTime: Date;
}

interface TimeSlot {
    start: string;
    end: string;
}

const reportController = new Elysia()
    .use(authMiddleware)
    .get('/api/reports/room-usage', async ({ query, set, authenticate }) => {
        const auth = await authenticate()
        if (!auth.success) return auth

        const { startDate, endDate } = query

        const roomUsage = await prisma.booking.groupBy({
            by: ['roomId'],
            where: {
                startTime: { gte: new Date(startDate as string) },
                endTime: { lte: new Date(endDate as string) }
            },
            _count: { id: true },
            _sum: { attendeeCount: true }
        })

        const roomDetails = await prisma.room.findMany()

        const report = roomDetails.map(room => {
            const usage = roomUsage.find(u => u.roomId === room.id)
            return {
                roomId: room.id,
                roomName: room.name,
                bookingCount: usage?._count.id || 0,
                totalAttendees: usage?._sum.attendeeCount || 0
            }
        })

        return report
    }, {
        query: t.Object({
            startDate: t.String(),
            endDate: t.String()
        }),
        detail: {
            tags: ['Reports'],
            summary: 'Room usage report',
            description: 'Get a report of room usage within a specified date range'
        }
    })
    .get('/api/reports/user-bookings', async ({ query, set, authenticate }) => {
        const auth = await authenticate()
        if (!auth.success) return auth

        const { startDate, endDate } = query

        const userBookings = await prisma.booking.groupBy({
            by: ['userId'],
            where: {
                startTime: { gte: new Date(startDate as string) },
                endTime: { lte: new Date(endDate as string) }
            },
            _count: { id: true }
        })

        const userDetails = await prisma.user.findMany()

        const report = userDetails.map(user => {
            const bookings = userBookings.find(b => b.userId === user.id)
            return {
                userId: user.id,
                userName: `${user.firstName} ${user.lastName}`,
                bookingCount: bookings?._count.id || 0
            }
        })

        return report
    }, {
        query: t.Object({
            startDate: t.String(),
            endDate: t.String()
        }),
        detail: {
            tags: ['Reports'],
            summary: 'User bookings report',
            description: 'Get a report of bookings made by users within a specified date range'
        }
    })
    .get('/api/reports/available-rooms', async ({ query, set, authenticate }) => {
        const auth = await authenticate()
        if (!auth.success) return auth

        const { startDate, endDate } = query
        const start = new Date(startDate as string)
        const end = new Date(endDate as string)

        // ตรวจสอบความถูกต้องของวันที่
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
            set.status = 400
            return { error: 'Invalid date range' }
        }

        // หาการจองทั้งหมดในช่วงเวลาที่ระบุ
        const bookings = await prisma.booking.findMany({
            where: {
                OR: [
                    { startTime: { gte: start, lt: end } },
                    { endTime: { gt: start, lte: end } },
                    { startTime: { lte: start }, endTime: { gte: end } }
                ]
            },
            select: {
                roomId: true,
                startTime: true,
                endTime: true
            }
        })

        // หาห้องทั้งหมด
        const allRooms = await prisma.room.findMany()

        // สร้างรายงานห้องว่าง
        const availabilityReport = allRooms.map(room => {
            const roomBookings = bookings.filter(b => b.roomId === room.id)
            const availability = []
            let currentDate = new Date(start)

            while (currentDate < end) {
                const dayBookings = roomBookings.filter(b =>
                    (b.startTime <= currentDate && b.endTime > currentDate) ||
                    (b.startTime.toDateString() === currentDate.toDateString())
                )

                if (dayBookings.length === 0) {
                    availability.push({
                        date: currentDate.toISOString().split('T')[0],
                        isAvailable: true
                    })
                } else {
                    // หาช่วงเวลาว่างในวันนี้
                    const dayStart = new Date(currentDate.setHours(0, 0, 0, 0))
                    const dayEnd = new Date(currentDate.setHours(23, 59, 59, 999))
                    const freeSlots = findFreeTimeSlots(dayBookings, dayStart, dayEnd)

                    availability.push({
                        date: currentDate.toISOString().split('T')[0],
                        isAvailable: freeSlots.length > 0,
                        freeSlots: freeSlots
                    })
                }

                currentDate.setDate(currentDate.getDate() + 1)
            }

            return {
                roomId: room.id,
                roomName: room.name,
                availability: availability
            }
        })

        return availabilityReport
    }, {
        query: t.Object({
            startDate: t.String(),
            endDate: t.String()
        }),
        detail: {
            tags: ['Reports'],
            summary: 'Available rooms report',
            description: 'Get a list of available rooms for a specific date range'
        }
    })
    .get('/api/reports/monthly-summary', async ({ query, set, authenticate }) => {
        const auth = await authenticate()
        if (!auth.success) return auth

        const { year, month } = query
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
        const endDate = new Date(parseInt(year), parseInt(month), 0)

        const bookings = await prisma.booking.findMany({
            where: {
                startTime: { gte: startDate },
                endTime: { lte: endDate }
            },
            include: { room: true }
        })

        const summary: {
            totalBookings: number,
            totalAttendees: number,
            roomUsage: { [key: string]: number },
            topBookedRooms: { name: string, count: number }[]
        } = {
            totalBookings: bookings.length,
            totalAttendees: bookings.reduce((sum, b) => sum + b.attendeeCount, 0),
            roomUsage: {},
            topBookedRooms: []
        }

        bookings.forEach(booking => {
            if (!summary.roomUsage[booking.room.name]) {
                summary.roomUsage[booking.room.name] = 0
            }
            summary.roomUsage[booking.room.name]++
        })

        summary.topBookedRooms = Object.entries(summary.roomUsage)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }))

        return summary
    }, {
        query: t.Object({
            year: t.String(),
            month: t.String()
        }),
        detail: {
            tags: ['Reports'],
            summary: 'Monthly booking summary',
            description: 'Get a summary of bookings for a specific month'
        }
    })
    .get('/api/reports/monthly-bookings', async ({ query, set, authenticate }) => {
        const auth = await authenticate()
        if (!auth.success) return auth

        const { year, month } = query
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
        const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999)

        try {
            const bookings = await prisma.booking.findMany({
                where: {
                    startTime: { gte: startDate },
                    endTime: { lte: endDate }
                },
                select: {
                    id: true,
                    title: true,
                    attendeeCount: true,
                    startTime: true,
                    endTime: true,
                    room: {
                        select: {
                            name: true
                        }
                    },
                    user: {
                        select: {
                            firstName: true,
                            lastName: true
                        }
                    }
                },
                orderBy: {
                    startTime: 'asc'
                }
            })

            const formattedBookings = bookings.map(booking => ({
                id: booking.id,
                title: booking.title,
                attendeeCount: booking.attendeeCount,
                roomName: booking.room.name,
                startTime: formatTime(booking.startTime),
                endTime: formatTime(booking.endTime),
                bookingDate: booking.startTime,
                bookingBy: `${booking.user.firstName} ${booking.user.lastName}`,
                titleDisplay: `${booking.room.name} ตั้งแต่ ${formatTime(booking.startTime)} น. - ${formatTime(booking.endTime)} น.`
            }))

            return formattedBookings
        } catch (error) {
            console.error('Error fetching monthly bookings:', error)
            set.status = 500
            return { error: 'An error occurred while fetching monthly bookings' }
        }
    }, {
        query: t.Object({
            year: t.String(),
            month: t.String()
        }),
        detail: {
            tags: ['Reports'],
            summary: 'Monthly bookings report',
            description: 'Get a list of bookings for a specific month'
        }
    })
    .get('/api/reports/most-used-rooms', async ({ query, set, authenticate }) => {
        const auth = await authenticate()
        if (!auth.success) return auth

        const { startDate, endDate, limit = '10' } = query
        const start = new Date(startDate as string)
        const end = new Date(endDate as string)
        const roomLimit = parseInt(limit as string)

        // Validate date range and limit
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end || isNaN(roomLimit) || roomLimit <= 0) {
            set.status = 400
            return { error: 'Invalid date range or limit' }
        }

        try {
            // Count bookings for each room within the date range
            const roomUsage = await prisma.booking.groupBy({
                by: ['roomId'],
                where: {
                    startTime: { gte: start },
                    endTime: { lte: end }
                },
                _count: { id: true }
            })

            // Get room details
            const roomDetails = await prisma.room.findMany({
                where: {
                    id: { in: roomUsage.map(usage => usage.roomId) }
                },
                select: {
                    id: true,
                    name: true
                }
            })

            // Calculate total bookings
            const totalBookings = roomUsage.reduce((sum, room) => sum + room._count.id, 0)

            // Combine usage data with room details, calculate percentages, and sort by usage count
            let mostUsedRooms: Array<{
                roomId: string | number;
                bookingCount: number;
                roomName: string;
                percentage: string;
            }> = roomUsage
                .map(usage => ({
                    roomId: usage.roomId,
                    bookingCount: usage._count.id,
                    roomName: roomDetails.find(room => room.id === usage.roomId)?.name || 'Unknown Room',
                    percentage: (usage._count.id / totalBookings * 100).toFixed(2)
                }))
                .sort((a, b) => b.bookingCount - a.bookingCount)

            // Limit the number of rooms and add an "Others" category if necessary
            if (mostUsedRooms.length > roomLimit) {
                const topRooms = mostUsedRooms.slice(0, roomLimit - 1)
                const otherRooms = mostUsedRooms.slice(roomLimit - 1)
                const otherBookings = otherRooms.reduce((sum, room) => sum + room.bookingCount, 0)
                const otherPercentage = (otherBookings / totalBookings * 100).toFixed(2)

                mostUsedRooms = [
                    ...topRooms,
                    {
                        roomId: 'others',
                        bookingCount: otherBookings,
                        roomName: 'Others',
                        percentage: otherPercentage
                    }
                ]
            }

            return {
                totalBookings,
                roomUsage: mostUsedRooms
            }
        } catch (error) {
            console.error('Error fetching most used rooms:', error)
            set.status = 500
            return { error: 'An error occurred while fetching most used rooms' }
        }
    }, {
        query: t.Object({
            startDate: t.String(),
            endDate: t.String(),
            limit: t.Optional(t.String())
        }),
        detail: {
            tags: ['Reports'],
            summary: 'Most used rooms report for pie chart',
            description: 'Get a report of the most frequently used rooms within a specified date range, suitable for pie chart visualization'
        }
    })

function findFreeTimeSlots(bookings: Booking[], dayStart: Date, dayEnd: Date): TimeSlot[] {
    const sortedBookings = bookings.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    const freeSlots: TimeSlot[] = [];
    let lastEndTime: Date = new Date(dayStart);

    for (const booking of sortedBookings) {
        if (booking.startTime > lastEndTime) {
            freeSlots.push({
                start: lastEndTime.toISOString(),
                end: booking.startTime.toISOString()
            });
        }
        lastEndTime = booking.endTime > lastEndTime ? new Date(booking.endTime) : lastEndTime;
    }

    if (lastEndTime < dayEnd) {
        freeSlots.push({
            start: lastEndTime.toISOString(),
            end: dayEnd.toISOString()
        });
    }

    return freeSlots;
}

function formatTime(date: Date): string {
    // Create a new Date object and subtract 7 hours
    const adjustedDate = new Date(date.getTime() - 7 * 60 * 60 * 1000);

    // Format the adjusted time
    return adjustedDate.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false // Ensure 24-hour format
    });
}

export default reportController