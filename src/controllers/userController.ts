import { Elysia, t } from 'elysia'
import { PrismaClient } from '@prisma/client'
import authMiddleware from '../middlewares/authMiddleware'

interface MenuItem {
    id: string
    label: string
    icon: string
    to?: string
    children?: MenuItem[]
    roles?: string[]
}

const prisma = new PrismaClient()

const menuItems: MenuItem[] = 
[
    {
        id: 'calendar',
        label: 'หน้าแรก',
        icon: 'mdi:home',
        to: '/',
        roles: ['user', 'admin']
    },
    {
        id: 'booking',
        label: 'จองห้องประชุม',
        icon: 'mdi:calendar-plus',
        to: '/booking',
        roles: ['user', 'admin']
    },
    {
        id: 'my-booking',
        label: 'รายการจองของฉัน',
        icon: 'mdi:calendar-clock',
        to: '/my-booking',
        roles: ['user', 'admin']
    },
    {
        id: 'my-profile',
        label: 'ข้อมูลส่วนตัว',
        icon: 'mdi:account',
        to: '/profile',
        roles: ['user', 'admin']
    },
    {
        id: 'change-password',
        label: 'เปลี่ยนรหัสผ่าน',
        icon: 'mdi:key',
        to: '/change-password',
        roles: ['user', 'admin']
    },
    {
        id: 'admin',
        label: 'Admin Management',
        icon: 'mdi:account-cog',
        children: [
            { id: 'room-manage', label: 'จัดการห้องประชุม', icon: 'mdi:cog', to: '/admin/manageRoom' },
        ],
        roles: ['admin']
    },
    {
        id: 'logout',
        label: 'ออกจากระบบ',
        icon: 'mdi:logout',
        to: '/logout',
        roles: ['user', 'admin']
    }
]

const userController = new Elysia()
    .use(authMiddleware)
    .put('/update-profile', async ({ body, set, authenticate }) => {
        const auth = await authenticate()
        if (!auth) {
            set.status = 401
            return { message: 'Unauthorized' }
        }

        const { email, firstName, lastName, nickname, phone } = body
        const id = Number(auth.user?.userId)
        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            set.status = 400
            return { message: 'Invalid email format' }
        }

        // Check for existing user
        const existingUser = await prisma.user.findFirst({
            where: { id }
        })

        if (!existingUser) {
            set.status = 400
            return { message: 'User not found' }
        }

        // Update user
        try {
            await prisma.user.update({
                where: { id },
                data: {
                    email,
                    firstName,
                    lastName,
                    nickname,
                    phone
                }
            })

            return { message: 'User updated successfully' }
        } catch (error) {
            console.error('Update error:', error)
            set.status = 500
            return { message: 'Internal server error' }
        }
    }, {
        body: t.Object({
            email: t.String(),
            firstName: t.String(),
            lastName: t.String(),
            nickname: t.String(),
            phone: t.String()
        }),
        detail: {
            tags: ['User'],
            description: 'Update user information',
            summary: 'Update user'
        },
        response: {
            200: t.Object({
                message: t.String()
            }),
            400: t.Object({
                message: t.String()
            })
        }
    })
    .get('/me', async ({ set, authenticate }) => {
        const auth = await authenticate()
        if (!auth) {
            set.status = 401
            return { message: 'Unauthorized' }
        }

        const id = Number(auth.user?.userId)

        try {
            const user = await prisma.user.findUnique({
                where: { id },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    nickname: true,
                    phone: true,
                    role: true
                }
            })

            if (!user) {
                set.status = 404
                return { message: 'User not found' }
            }

            return user
        } catch (error) {
            console.error('Error fetching user info:', error)
            set.status = 500
            return { message: 'Internal server error' }
        }
    }, {
        detail: {
            tags: ['User'],
            description: 'Get current user information',
            summary: 'Get user info'
        }
    })
    .get('/meMenu', async ({ set, authenticate }) => {
        const auth = await authenticate()
        if (!auth) {
            set.status = 401
            return { message: 'Unauthorized' }
        }

        const id = Number(auth.user?.userId)

        try {
            const user = await prisma.user.findUnique({
                where: { id },
                select: {
                    role: true
                }
            })

            if (!user) {
                set.status = 404
                return { message: 'User not found' }
            }

            const mappedMenu = menuItems.filter(item => {
                if (item.roles) {
                    return item.roles.includes(String(user.role).toLocaleLowerCase())
                }
                return true
            })

            return mappedMenu
        } catch (error) {
            console.error('Error fetching user info:', error)
            set.status = 500
            return { message: 'Internal server error' }
        }
    }, {
        detail: {
            tags: ['User'],
            description: 'Get current user menu',
            summary: 'Get user menu'
        }
    })
    .put('/change-password', async ({ body, set, authenticate }) => {
        const auth = await authenticate()
        if (!auth) {
            set.status = 401
            return { message: 'Unauthorized' }
        }

        const { currentPassword, newPassword } = body
        const id = Number(auth.user?.userId)

        try {
            // Fetch the user
            const user = await prisma.user.findUnique({ where: { id } })
            if (!user) {
                set.status = 404
                return { message: 'User not found' }
            }

            // Verify current password
            const isPasswordValid = await Bun.password.verify(currentPassword, user.password)
            if (!isPasswordValid) {
                set.status = 400
                return { message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' }
            }

            // // Password complexity check (example: at least 8 characters, 1 uppercase, 1 lowercase, 1 number)
            // const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/
            // if (!passwordRegex.test(newPassword)) {
            //     set.status = 400
            //     return { message: 'New password does not meet complexity requirements' }
            // }

            // Hash the new password
            const hashedPassword = await Bun.password.hash(newPassword)

            // Update the password
            await prisma.user.update({
                where: { id },
                data: { password: hashedPassword, passwordChanged: true }
            })

            return { message: 'Password changed successfully' }
        } catch (error) {
            console.error('Password change error:', error)
            set.status = 500
            return { message: 'Internal server error' }
        }
    }, {
        body: t.Object({
            currentPassword: t.String(),
            newPassword: t.String()
        }),
        detail: {
            tags: ['User'],
            description: 'Change user password',
            summary: 'Change password'
        },
        response: {
            200: t.Object({
                message: t.String()
            }),
            400: t.Object({
                message: t.String()
            }),
            401: t.Object({
                message: t.String()
            }),
            404: t.Object({
                message: t.String()
            }),
            500: t.Object({
                message: t.String()
            })
        }
    })

export default userController