# Elysia with Bun runtime

## วิธีติดตั้ง Package และ Run โปรเจค
ต้องติดตั้งเป็น Runtime Bun ก่อน See: https://bun.sh/ เมื่อติดตั้งเสร็จแล้วรันคำสั่งดังนี้
```bash
bun install
bunx prisma db pull --schema=./prisma/sehema.prisma
bunx prisma generate

bun dev
```

## Database
ฐานข้อมูลใช้อะไรก็ได้ในโปรเจคนี้ใช้เป็น Mysql:
```bash
.env

DATABASE_URL="mysql://root:admin123456@localhost:3306/we_meeting?schema=public"
```