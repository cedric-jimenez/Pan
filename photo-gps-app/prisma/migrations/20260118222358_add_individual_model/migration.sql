-- CreateTable: Individual
CREATE TABLE "Individual" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Individual_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add individualId to Photo
ALTER TABLE "Photo" ADD COLUMN "individualId" TEXT;

-- CreateIndex: Individual userId
CREATE INDEX "Individual_userId_idx" ON "Individual"("userId");

-- CreateIndex: Individual unique name per user
CREATE UNIQUE INDEX "Individual_userId_name_key" ON "Individual"("userId", "name");

-- CreateIndex: Photo individualId
CREATE INDEX "Photo_individualId_idx" ON "Photo"("individualId");

-- AddForeignKey: Individual to User
ALTER TABLE "Individual" ADD CONSTRAINT "Individual_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Photo to Individual
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_individualId_fkey" FOREIGN KEY ("individualId") REFERENCES "Individual"("id") ON DELETE SET NULL ON UPDATE CASCADE;
