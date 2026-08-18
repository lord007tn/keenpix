-- Token: add display prefix + unique constraint on hashedSecret + projectId index
ALTER TABLE "Token" ADD COLUMN "prefix" TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX "Token_hashedSecret_key" ON "Token"("hashedSecret");
CREATE INDEX "Token_projectId_idx" ON "Token"("projectId");
