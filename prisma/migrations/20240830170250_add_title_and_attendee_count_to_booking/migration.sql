/*
  Warnings:

  - Added the required column `attendeeCount` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Booking` ADD COLUMN `attendeeCount` INTEGER NOT NULL,
    ADD COLUMN `title` VARCHAR(191) NOT NULL;
