-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WikiRevision" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "rev" INTEGER NOT NULL DEFAULT 0,
    "content" TEXT NOT NULL,
    "comment" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pageId" INTEGER NOT NULL,
    "authorId" INTEGER,
    CONSTRAINT "WikiRevision_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WikiPage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WikiRevision_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_WikiRevision" ("authorId", "comment", "content", "createdAt", "id", "ipAddress", "pageId") SELECT "authorId", "comment", "content", "createdAt", "id", "ipAddress", "pageId" FROM "WikiRevision";
DROP TABLE "WikiRevision";
ALTER TABLE "new_WikiRevision" RENAME TO "WikiRevision";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
