-- CreateEnum

CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED');



-- CreateEnum

CREATE TYPE "QuoteStatus" AS ENUM ('NEW', 'REVIEWING', 'RESPONDED', 'WON', 'LOST', 'ARCHIVED');



-- CreateEnum

CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');



-- CreateEnum

CREATE TYPE "ThreadStatus" AS ENUM ('OPEN', 'LOCKED', 'HIDDEN');



-- CreateEnum

CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');



-- CreateTable

CREATE TABLE "AdminUser" (

    "id" TEXT NOT NULL,

    "email" TEXT NOT NULL,

    "password" TEXT NOT NULL,

    "name" TEXT NOT NULL,

    "role" TEXT NOT NULL DEFAULT 'ADMIN',

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "updatedAt" TIMESTAMP(3) NOT NULL,



    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")

);



-- CreateTable

CREATE TABLE "CompanyProfile" (

    "id" TEXT NOT NULL,

    "companyName" TEXT NOT NULL,

    "tagline" TEXT NOT NULL,

    "description" TEXT NOT NULL,

    "phone" TEXT NOT NULL,

    "email" TEXT NOT NULL,

    "whatsapp" TEXT,

    "address" TEXT NOT NULL,

    "hours" JSONB NOT NULL,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "updatedAt" TIMESTAMP(3) NOT NULL,



    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")

);



-- CreateTable

CREATE TABLE "ContactEnquiry" (

    "id" TEXT NOT NULL,

    "fullName" TEXT NOT NULL,

    "email" TEXT NOT NULL,

    "phone" TEXT NOT NULL,

    "subject" TEXT NOT NULL,

    "serviceInterest" TEXT,

    "preferredContactMethod" TEXT,

    "location" TEXT,

    "message" TEXT NOT NULL,

    "consentGiven" BOOLEAN NOT NULL DEFAULT false,

    "referenceCode" TEXT NOT NULL,

    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',

    "notes" TEXT,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "updatedAt" TIMESTAMP(3) NOT NULL,



    CONSTRAINT "ContactEnquiry_pkey" PRIMARY KEY ("id")

);



-- CreateTable

CREATE TABLE "QuoteRequest" (

    "id" TEXT NOT NULL,

    "fullName" TEXT NOT NULL,

    "email" TEXT NOT NULL,

    "phone" TEXT NOT NULL,

    "serviceType" TEXT NOT NULL,

    "projectType" TEXT,

    "location" TEXT,

    "estimatedBudget" TEXT,

    "preferredStartDate" TIMESTAMP(3),

    "siteVisitRequired" BOOLEAN NOT NULL DEFAULT false,

    "projectDescription" TEXT NOT NULL,

    "attachmentUrl" TEXT,

    "consentGiven" BOOLEAN NOT NULL DEFAULT false,

    "referenceCode" TEXT NOT NULL,

    "status" "QuoteStatus" NOT NULL DEFAULT 'NEW',

    "internalNotes" TEXT,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "updatedAt" TIMESTAMP(3) NOT NULL,



    CONSTRAINT "QuoteRequest_pkey" PRIMARY KEY ("id")

);



-- CreateTable

CREATE TABLE "Review" (

    "id" TEXT NOT NULL,

    "name" TEXT NOT NULL,

    "email" TEXT,

    "rating" INTEGER NOT NULL,

    "projectContext" TEXT,

    "title" TEXT,

    "message" TEXT NOT NULL,

    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',

    "featured" BOOLEAN NOT NULL DEFAULT false,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "updatedAt" TIMESTAMP(3) NOT NULL,



    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")

);



-- CreateTable

CREATE TABLE "ForumCategory" (

    "id" TEXT NOT NULL,

    "name" TEXT NOT NULL,

    "slug" TEXT NOT NULL,

    "description" TEXT NOT NULL,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "updatedAt" TIMESTAMP(3) NOT NULL,



    CONSTRAINT "ForumCategory_pkey" PRIMARY KEY ("id")

);



-- CreateTable

CREATE TABLE "ForumThread" (

    "id" TEXT NOT NULL,

    "categoryId" TEXT,

    "title" TEXT NOT NULL,

    "slug" TEXT NOT NULL,

    "content" TEXT NOT NULL,

    "authorName" TEXT NOT NULL,

    "authorEmail" TEXT,

    "status" "ThreadStatus" NOT NULL DEFAULT 'OPEN',

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "updatedAt" TIMESTAMP(3) NOT NULL,



    CONSTRAINT "ForumThread_pkey" PRIMARY KEY ("id")

);



-- CreateTable

CREATE TABLE "ForumReply" (

    "id" TEXT NOT NULL,

    "threadId" TEXT NOT NULL,

    "authorName" TEXT NOT NULL,

    "authorEmail" TEXT,

    "content" TEXT NOT NULL,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "updatedAt" TIMESTAMP(3) NOT NULL,



    CONSTRAINT "ForumReply_pkey" PRIMARY KEY ("id")

);



-- CreateTable

CREATE TABLE "Service" (

    "id" TEXT NOT NULL,

    "title" TEXT NOT NULL,

    "slug" TEXT NOT NULL,

    "summary" TEXT NOT NULL,

    "details" TEXT[],

    "description" TEXT NOT NULL,

    "image" TEXT,

    "published" BOOLEAN NOT NULL DEFAULT true,

    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "updatedAt" TIMESTAMP(3) NOT NULL,



    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")

);



-- CreateTable

CREATE TABLE "Project" (

    "id" TEXT NOT NULL,

    "title" TEXT NOT NULL,

    "slug" TEXT NOT NULL,

    "category" TEXT NOT NULL,

    "description" TEXT NOT NULL,

    "image" TEXT NOT NULL,

    "status" "ProjectStatus" NOT NULL DEFAULT 'PUBLISHED',

    "published" BOOLEAN NOT NULL DEFAULT true,

    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "updatedAt" TIMESTAMP(3) NOT NULL,



    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")

);



-- CreateTable

CREATE TABLE "PricingPlan" (

    "id" TEXT NOT NULL,

    "title" TEXT NOT NULL,

    "slug" TEXT NOT NULL,

    "range" TEXT NOT NULL,

    "description" TEXT NOT NULL,

    "items" TEXT[],

    "published" BOOLEAN NOT NULL DEFAULT true,

    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "updatedAt" TIMESTAMP(3) NOT NULL,



    CONSTRAINT "PricingPlan_pkey" PRIMARY KEY ("id")

);



-- CreateTable

CREATE TABLE "MediaAsset" (

    "id" TEXT NOT NULL,

    "name" TEXT NOT NULL,

    "url" TEXT NOT NULL,

    "type" TEXT NOT NULL,

    "description" TEXT,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "updatedAt" TIMESTAMP(3) NOT NULL,



    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")

);



-- CreateTable

CREATE TABLE "AuditLog" (

    "id" TEXT NOT NULL,

    "actor" TEXT NOT NULL,

    "action" TEXT NOT NULL,

    "entity" TEXT NOT NULL,

    "entityId" TEXT NOT NULL,

    "details" JSONB,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,



    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")

);



-- CreateTable

CREATE TABLE "NewsletterSubscriber" (

    "id" TEXT NOT NULL,

    "email" TEXT NOT NULL,

    "source" TEXT,

    "subscribed" BOOLEAN NOT NULL DEFAULT true,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "updatedAt" TIMESTAMP(3) NOT NULL,



    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")

);



-- CreateIndex

CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");



-- CreateIndex

CREATE UNIQUE INDEX "CompanyProfile_email_key" ON "CompanyProfile"("email");



-- CreateIndex

CREATE UNIQUE INDEX "ContactEnquiry_referenceCode_key" ON "ContactEnquiry"("referenceCode");



-- CreateIndex

CREATE UNIQUE INDEX "QuoteRequest_referenceCode_key" ON "QuoteRequest"("referenceCode");



-- CreateIndex

CREATE UNIQUE INDEX "ForumCategory_slug_key" ON "ForumCategory"("slug");



-- CreateIndex

CREATE UNIQUE INDEX "ForumThread_slug_key" ON "ForumThread"("slug");



-- CreateIndex

CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");



-- CreateIndex

CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");



-- CreateIndex

CREATE UNIQUE INDEX "PricingPlan_slug_key" ON "PricingPlan"("slug");



-- CreateIndex

CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");



-- AddForeignKey

ALTER TABLE "ForumThread" ADD CONSTRAINT "ForumThread_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ForumCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- AddForeignKey

ALTER TABLE "ForumReply" ADD CONSTRAINT "ForumReply_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ForumThread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;



