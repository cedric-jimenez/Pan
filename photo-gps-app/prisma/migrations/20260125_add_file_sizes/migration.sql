-- AlterTable: Add croppedFileSize and segmentedFileSize columns to Photo table
ALTER TABLE "Photo" ADD COLUMN "croppedFileSize" INTEGER;
ALTER TABLE "Photo" ADD COLUMN "segmentedFileSize" INTEGER;
