-- AlterTable
ALTER TABLE "RoomType" ADD COLUMN "hotelId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "RoomType" ADD CONSTRAINT "RoomType_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
