-- Task 2: enums, Decimal para dinero, FKs con Restrict, notes, timestamps e índices

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('DISPONIBLE', 'OCUPADA', 'LIMPIEZA', 'MANTENIMIENTO');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('CONFIRMADA', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELADA');

-- CreateEnum
CREATE TYPE "ReservationOrigin" AS ENUM ('ADMIN', 'WEB');

-- AlterTable: Room.status TEXT -> enum
ALTER TABLE "Room" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Room" ALTER COLUMN "status" TYPE "RoomStatus" USING "status"::"RoomStatus";
ALTER TABLE "Room" ALTER COLUMN "status" SET DEFAULT 'DISPONIBLE';

-- AlterTable: Reservation.status / origin TEXT -> enum
ALTER TABLE "Reservation" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Reservation" ALTER COLUMN "status" TYPE "ReservationStatus" USING "status"::"ReservationStatus";
ALTER TABLE "Reservation" ALTER COLUMN "status" SET DEFAULT 'CONFIRMADA';
ALTER TABLE "Reservation" ALTER COLUMN "origin" DROP DEFAULT;
ALTER TABLE "Reservation" ALTER COLUMN "origin" TYPE "ReservationOrigin" USING "origin"::"ReservationOrigin";
ALTER TABLE "Reservation" ALTER COLUMN "origin" SET DEFAULT 'ADMIN';

-- AlterTable: dinero Float -> Decimal(10,2)
ALTER TABLE "RoomType" ALTER COLUMN "priceBase" TYPE DECIMAL(10, 2) USING "priceBase"::DECIMAL(10, 2);
ALTER TABLE "Reservation" ALTER COLUMN "total" TYPE DECIMAL(10, 2) USING "total"::DECIMAL(10, 2);

-- AlterTable: columna notes
ALTER TABLE "Reservation" ADD COLUMN "notes" TEXT;

-- AlterTable: timestamps
ALTER TABLE "Hotel" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "User" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "User" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "RoomType" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "RoomType" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Room" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Room" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Client" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Client" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Reservation" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "License" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "License" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: User.hotelId FK de SET NULL a RESTRICT
ALTER TABLE "User" DROP CONSTRAINT "User_hotelId_fkey";
ALTER TABLE "User" ADD CONSTRAINT "User_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: Reservation -> Room / Client
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "User_hotelId_idx" ON "User"("hotelId");
CREATE INDEX "RoomType_hotelId_idx" ON "RoomType"("hotelId");
CREATE INDEX "Room_hotelId_idx" ON "Room"("hotelId");
CREATE INDEX "Room_hotelId_status_idx" ON "Room"("hotelId", "status");
CREATE INDEX "Client_hotelId_idx" ON "Client"("hotelId");
CREATE INDEX "Reservation_hotelId_idx" ON "Reservation"("hotelId");
CREATE INDEX "Reservation_hotelId_checkIn_idx" ON "Reservation"("hotelId", "checkIn");
CREATE INDEX "Reservation_roomId_checkIn_checkOut_idx" ON "Reservation"("roomId", "checkIn", "checkOut");
CREATE INDEX "License_hotelId_idx" ON "License"("hotelId");
