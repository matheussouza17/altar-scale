ALTER TABLE "users"
  ADD COLUMN "password_reset_token" TEXT,
  ADD COLUMN "password_reset_expiry" TIMESTAMP(3);
