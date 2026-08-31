-- Analytics de visitação por página (first-party). Sem IP, fingerprint ou query string.

CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "visitSessionId" TEXT NOT NULL,
    "userId" TEXT,
    "path" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'WEB',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PageView_createdAt_idx" ON "PageView"("createdAt");
CREATE INDEX "PageView_visitorId_createdAt_idx" ON "PageView"("visitorId", "createdAt");
CREATE INDEX "PageView_path_createdAt_idx" ON "PageView"("path", "createdAt");
CREATE INDEX "PageView_visitSessionId_idx" ON "PageView"("visitSessionId");
CREATE INDEX "PageView_userId_createdAt_idx" ON "PageView"("userId", "createdAt");
CREATE INDEX "PageView_source_createdAt_idx" ON "PageView"("source", "createdAt");
