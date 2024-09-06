# We-Meeting Backend

We-Meeting เป็นระบบจองห้องประชุมออนไลน์ ที่เก็บนี้ประกอบด้วยโค้ด backend สำหรับโปรเจค We-Meeting ซึ่งพัฒนาโดยใช้ Bun

## สารบัญ

- [เทคโนโลยีที่ใช้](#เทคโนโลยีที่ใช้)
- [โครงสร้างโปรเจค](#โครงสร้างโปรเจค)
- [การติดตั้ง](#การติดตั้ง)
- [การตั้งค่า](#การตั้งค่า)
- [การรันแอปพลิเคชัน](#การรันแอปพลิเคชัน)
- [API Endpoints](#api-endpoints)
- [การทดสอบ](#การทดสอบ)
- [การ Deploy](#การ-deploy)
- [การมีส่วนร่วมในการพัฒนา](#การมีส่วนร่วมในการพัฒนา)
- [ลิขสิทธิ์](#ลิขสิทธิ์)

## เทคโนโลยีที่ใช้

- [Bun](https://bun.sh/) (JavaScript runtime และ toolkit)
- [TypeScript](https://www.typescriptlang.org/)
- [Elysia](https://elysiajs.com/) (Web framework)
- [MySQL](https://www.mysql.com/) (ฐานข้อมูล)

## โครงสร้างโปรเจค

```
backend-we-meeting/
├── src/
│   ├── config/
│   │   └── swagger.ts
│   ├── controllers/
│   │   └── reportController.ts
│   ├── routes/
│   │   ├── authRoutes.ts
│   │   ├── bookingRoutes.ts
│   │   └── roomRoutes.ts
│   └── index.ts
├── .env
├── package.json
└── tsconfig.json
```

## การติดตั้ง

1. ติดตั้ง Bun:
   ```
   curl -fsSL https://bun.sh/install | bash
   ```

2. โคลนที่เก็บ:
   ```
   git clone https://github.com/your-username/backend-we-meeting.git
   cd backend-we-meeting
   ```

3. ติดตั้ง dependencies:
   ```
   bun install
   ```

4. ตั้งค่าฐานข้อมูล:
   - สร้างฐานข้อมูล MySQL
   - อัปเดตการตั้งค่าการเชื่อมต่อฐานข้อมูลในไฟล์ `.env`

## การตั้งค่า

สร้างไฟล์ `.env` ในไดเรกทอรีหลักและเพิ่มตัวแปรต่อไปนี้:

```
DATABASE_URL="mysql://username:password@localhost:3306/we_meeting"
JWT_SECRET="your-secret-key"
UPLOAD_DIR="/path/to/upload/directory"
```

## การรันแอปพลิเคชัน

เพื่อรันแอปพลิเคชันในโหมดพัฒนา:

```
bun run dev
```

เซิร์ฟเวอร์จะทำงานที่ `http://localhost:3000` (หรือพอร์ตอื่นที่กำหนดในการตั้งค่า)

## API Endpoints

- `/auth`: เส้นทางสำหรับการรับรองตัวตนและการจัดการผู้ใช้
- `/rooms`: เส้นทางสำหรับการจัดการห้องประชุม
- `/bookings`: เส้นทางสำหรับการจองห้องประชุม
- `/reports`: เส้นทางสำหรับการสร้างรายงาน

สามารถดูรายละเอียด API ทั้งหมดได้ที่ `/swagger` หลังจากรันเซิร์ฟเวอร์

## การทดสอบ

รันชุดการทดสอบด้วยคำสั่ง:

```
bun test
```

## การ Deploy

1. สร้างเวอร์ชันสำหรับใช้งานจริง:
   ```
   bun run build
   ```

2. เริ่มเซิร์ฟเวอร์สำหรับการใช้งานจริง:
   ```
   bun start
   ```

## การมีส่วนร่วมในการพัฒนา

เรายินดีต้อนรับการมีส่วนร่วมในโปรเจค We-Meeting กรุณาอ่านแนวทางการมีส่วนร่วมของเราก่อนส่ง pull requests

## ลิขสิทธิ์

โปรเจคนี้อยู่ภายใต้ [ลิขสิทธิ์ MIT](LICENSE)
