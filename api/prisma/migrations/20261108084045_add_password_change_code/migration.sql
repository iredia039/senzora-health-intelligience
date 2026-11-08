-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordCodeAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "passwordCodeExpiresAt" TIMESTAMP(3),
ADD COLUMN     "passwordCodeHash" TEXT,
ADD COLUMN     "passwordCodeSentAt" TIMESTAMP(3),
ADD COLUMN     "pendingHashPassword" TEXT;
