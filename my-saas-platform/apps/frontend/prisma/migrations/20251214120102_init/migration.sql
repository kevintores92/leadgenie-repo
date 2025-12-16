-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivity" TIMESTAMP(3),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);
