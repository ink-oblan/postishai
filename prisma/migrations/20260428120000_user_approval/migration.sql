ALTER TABLE "User"
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "approvalToken" TEXT,
  ADD COLUMN "approvalDetails" TEXT,
  ADD COLUMN "approvalNotifiedAt" TIMESTAMP(3);

UPDATE "User"
SET "approvedAt" = COALESCE("approvedAt", NOW());

CREATE UNIQUE INDEX "User_approvalToken_key" ON "User"("approvalToken");
