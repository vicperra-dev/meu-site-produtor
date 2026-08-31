/*
  Warnings:

  - Added the required column `nomeCompleto` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- PostgreSQL: add column (if not exists), backfill, then set NOT NULL
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nomeCompleto" TEXT;
UPDATE "User" SET "nomeCompleto" = COALESCE("nomeArtistico", 'Usuário') WHERE "nomeCompleto" IS NULL;
ALTER TABLE "User" ALTER COLUMN "nomeCompleto" SET NOT NULL;
