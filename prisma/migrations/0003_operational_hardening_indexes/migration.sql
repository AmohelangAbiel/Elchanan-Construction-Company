CREATE INDEX IF NOT EXISTS "ContactEnquiry_deletedAt_createdAt_idx"
  ON "ContactEnquiry"("deletedAt", "createdAt");

CREATE INDEX IF NOT EXISTS "QuoteRequest_deletedAt_createdAt_idx"
  ON "QuoteRequest"("deletedAt", "createdAt");

CREATE INDEX IF NOT EXISTS "Review_status_deletedAt_createdAt_idx"
  ON "Review"("status", "deletedAt", "createdAt");

CREATE INDEX IF NOT EXISTS "ForumCategory_published_deletedAt_sortOrder_idx"
  ON "ForumCategory"("published", "deletedAt", "sortOrder");

CREATE INDEX IF NOT EXISTS "ForumThread_status_deletedAt_isPinned_updatedAt_idx"
  ON "ForumThread"("status", "deletedAt", "isPinned", "updatedAt");

CREATE INDEX IF NOT EXISTS "ForumThread_categoryId_status_deletedAt_idx"
  ON "ForumThread"("categoryId", "status", "deletedAt");

CREATE INDEX IF NOT EXISTS "ForumReply_threadId_status_deletedAt_createdAt_idx"
  ON "ForumReply"("threadId", "status", "deletedAt", "createdAt");

CREATE INDEX IF NOT EXISTS "Service_published_deletedAt_sortOrder_idx"
  ON "Service"("published", "deletedAt", "sortOrder");

CREATE INDEX IF NOT EXISTS "Project_status_published_deletedAt_sortOrder_idx"
  ON "Project"("status", "published", "deletedAt", "sortOrder");

CREATE INDEX IF NOT EXISTS "PricingPlan_published_deletedAt_sortOrder_idx"
  ON "PricingPlan"("published", "deletedAt", "sortOrder");
