-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED', 'LOCKED');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('PERSONAL', 'SHARED_TEMPORARY', 'SERVICE');

-- CreateEnum
CREATE TYPE "Department" AS ENUM ('MANAGEMENT', 'FINANCE', 'RETAIL_SALES', 'PROJECT_SALES', 'DESIGN', 'ORDER_COORDINATION', 'IT');

-- CreateEnum
CREATE TYPE "RoleKey" AS ENUM ('MANAGER', 'FINANCE', 'ORDER_COORDINATOR', 'PROJECT_MANAGER', 'PROJECT_SALES', 'RETAIL_SALES', 'DESIGNER', 'CEO_VIEWER', 'SYSTEM_ADMIN');

-- CreateEnum
CREATE TYPE "DataScope" AS ENUM ('OWN', 'ASSIGNED', 'ALL');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "OpportunityTrack" AS ENUM ('RETAIL', 'PROJECT');

-- CreateEnum
CREATE TYPE "OpportunityStage" AS ENUM ('NEW_ENQUIRY', 'CONTACTED', 'QUALIFIED', 'PREPARATION', 'QUOTATION', 'NEGOTIATION', 'DEPOSIT_PENDING', 'WON', 'LOST', 'ON_HOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('INDIVIDUAL', 'COMPANY', 'CONTRACTOR', 'CONSULTANT', 'GOVERNMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "DataQualityStatus" AS ENUM ('VERIFIED', 'NEEDS_VERIFICATION');

-- CreateEnum
CREATE TYPE "OpportunityMemberRole" AS ENUM ('DESIGN_OWNER', 'QUOTATION_OWNER', 'PROJECT_OWNER', 'COLLABORATOR', 'WATCHER');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('NOTE', 'CALL', 'EMAIL', 'MEETING', 'WHATSAPP', 'FOLLOW_UP', 'STATUS_CHANGE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TO_DO', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'WAITING_INTERNAL', 'BLOCKED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ASSIGNMENT', 'MENTION', 'APPROVAL_REQUIRED', 'DEPOSIT_CONFIRMED', 'ETA_CHANGED', 'OVERDUE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('CUSTOMER_DOCUMENT', 'MEASUREMENT', 'REQUIREMENTS', 'DESIGN', 'DESIGN_SOURCE_FILE', 'DESIGN_SUPPLIER_QUOTATION', 'ELEMENT_LIST', 'APPLIANCES_LIST', 'ORDER_CHECKLIST', 'CUSTOMER_QUOTATION', 'AGREEMENT', 'DEPOSIT_PROOF', 'ERP_PO', 'SUPPLIER_INVOICE', 'CUSTOMER_INVOICE', 'DELIVERY_ACCEPTANCE', 'PROJECT_COSTING', 'SUPPLIER_ORDER_CONFIRMATION', 'CHECKLIST_EVIDENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentConfidentiality" AS ENUM ('STANDARD', 'INTERNAL', 'FINANCE_RESTRICTED');

-- CreateEnum
CREATE TYPE "MeasurementStatus" AS ENUM ('REQUIRED', 'SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DesignJobStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'REVISION_REQUESTED', 'APPROVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DesignPackageStatus" AS ENUM ('NOT_STARTED', 'INCOMPLETE', 'READY', 'VERIFIED');

-- CreateEnum
CREATE TYPE "PricingCaseType" AS ENUM ('RETAIL', 'PROJECT');

-- CreateEnum
CREATE TYPE "PricingStatus" AS ENUM ('DRAFT', 'FINANCE_REVIEW', 'CHANGES_REQUESTED', 'FINANCE_CONFIRMED', 'MANAGER_APPROVAL', 'APPROVED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "PricingLineCategory" AS ENUM ('DESIGN_FURNITURE', 'TRADE_GOODS', 'APPLIANCE', 'WORKTOP', 'SINK_MIXER', 'INSTALLATION', 'FREIGHT', 'CUSTOMS', 'CLEARANCE', 'INSURANCE', 'STAFF_COST', 'OVERHEAD', 'CONTINGENCY', 'OTHER');

-- CreateEnum
CREATE TYPE "PricingReviewDecision" AS ENUM ('CONFIRMED', 'CHANGES_REQUESTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ApprovalType" AS ENUM ('RETAIL_EXCEPTION', 'PROJECT_FINAL_PRICE', 'SPECIAL_TERMS', 'RECORD_ARCHIVE', 'RECORD_REOPEN');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('SUBMITTED', 'CONFIRMED', 'NOT_RECEIVED', 'AMOUNT_MISMATCH', 'NEEDS_CLARIFICATION', 'REVERSED');

-- CreateEnum
CREATE TYPE "HandoverStatus" AS ENUM ('PACKAGE_RECEIVED', 'MISSING_FILES', 'READY', 'SENT_TO_SUPPLIER', 'PO_PENDING', 'PO_CREATED', 'PO_SENT', 'ETA_ENTERED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChecklistStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'NOT_APPLICABLE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'ARCHIVE', 'RESTORE', 'LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_CHANGE', 'SESSION_REVOKE', 'ROLE_CHANGE', 'STAGE_CHANGE', 'ASSIGN', 'APPROVE', 'REJECT', 'FINANCE_CONFIRM', 'DEPOSIT_CONFIRM', 'WON_CONVERSION', 'FILE_UPLOAD', 'QUOTATION_SENT', 'ETA_CHANGE', 'PO_UPDATE');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "initials" TEXT,
    "passwordHash" TEXT NOT NULL,
    "department" "Department" NOT NULL,
    "dataScope" "DataScope" NOT NULL DEFAULT 'OWN',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "accountType" "AccountType" NOT NULL DEFAULT 'PERSONAL',
    "forcePasswordChange" BOOLEAN NOT NULL DEFAULT true,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "sessionVersion" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "key" "RoleKey" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "ReferenceSequence" (
    "id" UUID NOT NULL,
    "companyCode" VARCHAR(16) NOT NULL,
    "brandCode" VARCHAR(32) NOT NULL,
    "trackCode" VARCHAR(8) NOT NULL,
    "typeCode" VARCHAR(16) NOT NULL,
    "year" INTEGER NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "track" "OpportunityTrack",
    "name" TEXT NOT NULL,
    "mobile" TEXT,
    "email" TEXT,
    "source" TEXT,
    "channel" TEXT,
    "campaign" TEXT,
    "interestCategory" TEXT,
    "notes" TEXT,
    "nextFollowUpAt" TIMESTAMP(3),
    "dataQualityStatus" "DataQualityStatus" NOT NULL DEFAULT 'NEEDS_VERIFICATION',
    "ownerId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "convertedAt" TIMESTAMP(3),
    "convertedCustomerId" UUID,
    "convertedOpportunityId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CustomerType" NOT NULL DEFAULT 'INDIVIDUAL',
    "mobile" TEXT,
    "email" TEXT,
    "legacyReference" TEXT,
    "erpCustomerCode" TEXT,
    "dataQualityStatus" "DataQualityStatus" NOT NULL DEFAULT 'NEEDS_VERIFICATION',
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "roleTitle" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "track" "OpportunityTrack" NOT NULL,
    "stage" "OpportunityStage" NOT NULL DEFAULT 'NEW_ENQUIRY',
    "customerId" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "legacyReference" TEXT,
    "designReference" TEXT,
    "tenderSystemReference" TEXT,
    "clientTenderReference" TEXT,
    "siteAddress" TEXT,
    "requirementsSummary" TEXT,
    "estimatedValue" DECIMAL(18,2),
    "wonValue" DECIMAL(18,2),
    "financeInvoiceReference" TEXT,
    "financeInvoiceDate" TIMESTAMP(3),
    "financeInvoiceTotal" DECIMAL(18,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'AED',
    "probabilityPct" DECIMAL(5,2),
    "nextFollowUpAt" TIMESTAMP(3),
    "wonAt" TIMESTAMP(3),
    "lostReason" TEXT,
    "dataQualityStatus" "DataQualityStatus" NOT NULL DEFAULT 'NEEDS_VERIFICATION',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityMember" (
    "opportunityId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "OpportunityMemberRole" NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityMember_pkey" PRIMARY KEY ("opportunityId","userId","role")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" UUID NOT NULL,
    "type" "ActivityType" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT,
    "actionUrl" TEXT,
    "metadata" JSONB,
    "customerId" UUID,
    "opportunityId" UUID,
    "createdById" UUID NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TO_DO',
    "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',
    "opportunityId" UUID,
    "assignedToId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "dueAt" TIMESTAMP(3),
    "blockedReason" TEXT,
    "sectionKey" TEXT,
    "automationKey" TEXT,
    "actionUrl" TEXT,
    "metadata" JSONB,
    "autoCreated" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskComment" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),

    CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskWatcher" (
    "taskId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskWatcher_pkey" PRIMARY KEY ("taskId","userId")
);

-- CreateTable
CREATE TABLE "Mention" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "commentId" UUID,
    "mentionedUserId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Mention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatterMessage" (
    "id" UUID NOT NULL,
    "opportunityId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatterMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatterMention" (
    "id" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "opportunityId" UUID NOT NULL,
    "mentionedUserId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "ChatterMention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "recipientId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "href" TEXT,
    "actionLabel" TEXT,
    "actorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "confidentiality" "DocumentConfidentiality" NOT NULL DEFAULT 'STANDARD',
    "customerId" UUID,
    "opportunityId" UUID,
    "taskId" UUID,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "currentVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "archivedById" UUID,
    "archiveReason" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentVersion" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "originalName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "checksumSha256" TEXT,
    "notes" TEXT,
    "uploadedById" UUID NOT NULL,
    "immutable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Measurement" (
    "id" UUID NOT NULL,
    "opportunityId" UUID NOT NULL,
    "status" "MeasurementStatus" NOT NULL DEFAULT 'REQUIRED',
    "assignedToId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Measurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignJob" (
    "id" UUID NOT NULL,
    "opportunityId" UUID NOT NULL,
    "assignedToId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "status" "DesignJobStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "dueAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignVersion" (
    "id" UUID NOT NULL,
    "designJobId" UUID NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "label" TEXT,
    "notes" TEXT,
    "documentVersionId" UUID,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DesignVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignPackage" (
    "id" UUID NOT NULL,
    "opportunityId" UUID NOT NULL,
    "status" "DesignPackageStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "designReference" TEXT,
    "revisionLabel" TEXT,
    "designFurnitureEur" DECIMAL(18,2),
    "designAuxiliaryEur" DECIMAL(18,2),
    "supplierPointFactor" DECIMAL(18,6) DEFAULT 6.75,
    "submittedAt" TIMESTAMP(3),
    "submittedById" UUID,
    "readyAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingCase" (
    "id" UUID NOT NULL,
    "opportunityId" UUID NOT NULL,
    "type" "PricingCaseType" NOT NULL,
    "status" "PricingStatus" NOT NULL DEFAULT 'DRAFT',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "sourceCurrency" VARCHAR(3),
    "sellingCurrency" VARCHAR(3) NOT NULL DEFAULT 'AED',
    "sellingRate" DECIMAL(18,6),
    "exchangeRate" DECIMAL(18,6),
    "companyMarkupPct" DECIMAL(7,4),
    "priceBeforeDiscount" DECIMAL(18,2),
    "customerDiscountAed" DECIMAL(18,2),
    "formulaVersion" TEXT,
    "estimatedCost" DECIMAL(18,2),
    "approvedSellingPrice" DECIMAL(18,2),
    "grossProfit" DECIMAL(18,2),
    "grossMarginPct" DECIMAL(7,4),
    "financeNotes" TEXT,
    "preparedById" UUID,
    "financeConfirmedAt" TIMESTAMP(3),
    "managerApprovedAt" TIMESTAMP(3),
    "overrideReason" TEXT,
    "sourceEvidenceNotes" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingLine" (
    "id" UUID NOT NULL,
    "pricingCaseId" UUID NOT NULL,
    "category" "PricingLineCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 1,
    "supplierUnitPrice" DECIMAL(18,4),
    "supplierCurrency" VARCHAR(3),
    "appliedRate" DECIMAL(18,6),
    "markupPct" DECIMAL(7,4),
    "costAed" DECIMAL(18,2),
    "sellingPriceAed" DECIMAL(18,2),
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingReview" (
    "id" UUID NOT NULL,
    "pricingCaseId" UUID NOT NULL,
    "reviewerId" UUID NOT NULL,
    "decision" "PricingReviewDecision" NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quotation" (
    "id" UUID NOT NULL,
    "opportunityId" UUID NOT NULL,
    "internalReference" TEXT NOT NULL,
    "businessReference" TEXT NOT NULL,
    "legacyReference" TEXT,
    "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "currentVersion" INTEGER NOT NULL DEFAULT 0,
    "salesInitials" TEXT NOT NULL,
    "trackSnapshot" "OpportunityTrack" NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationVersion" (
    "id" UUID NOT NULL,
    "quotationId" UUID NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "pricingCaseId" UUID,
    "preVatAmount" DECIMAL(18,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'AED',
    "notes" TEXT,
    "validUntil" TIMESTAMP(3),
    "paymentTerms" TEXT,
    "contentSnapshot" JSONB,
    "pdfDocumentVersionId" UUID,
    "createdById" UUID NOT NULL,
    "sentById" UUID,
    "sentAt" TIMESTAMP(3),
    "immutable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotationVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" UUID NOT NULL,
    "type" "ApprovalType" NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "opportunityId" UUID NOT NULL,
    "pricingCaseId" UUID,
    "quotationId" UUID,
    "requestedById" UUID NOT NULL,
    "decidedById" UUID,
    "requestReason" TEXT,
    "decisionNotes" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistDefinition" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "track" "OpportunityTrack",
    "responsibleRole" "RoleKey",
    "required" BOOLEAN NOT NULL DEFAULT true,
    "autoRule" TEXT,
    "evidenceCategory" "DocumentCategory",
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityChecklistItem" (
    "id" UUID NOT NULL,
    "opportunityId" UUID NOT NULL,
    "definitionId" UUID NOT NULL,
    "labelSnapshot" TEXT NOT NULL,
    "status" "ChecklistStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "completedById" UUID,
    "completedAt" TIMESTAMP(3),
    "comment" TEXT,
    "blockedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpportunityChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deposit" (
    "id" UUID NOT NULL,
    "reference" TEXT,
    "opportunityId" UUID NOT NULL,
    "status" "DepositStatus" NOT NULL DEFAULT 'SUBMITTED',
    "expectedAmount" DECIMAL(18,2),
    "submittedAmount" DECIMAL(18,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'AED',
    "paymentReference" TEXT,
    "evidenceDocumentVersionId" UUID,
    "submittedById" UUID NOT NULL,
    "reviewedById" UUID,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,

    CONSTRAINT "Deposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderHandover" (
    "id" UUID NOT NULL,
    "opportunityId" UUID NOT NULL,
    "status" "HandoverStatus" NOT NULL DEFAULT 'PACKAGE_RECEIVED',
    "assignedToId" UUID NOT NULL,
    "sentToSupplierAt" TIMESTAMP(3),
    "supplierReference" TEXT,
    "erpPoNumber" TEXT,
    "poDate" TIMESTAMP(3),
    "poDocumentVersionId" UUID,
    "poSentAt" TIMESTAMP(3),
    "currentEta" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderHandover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ETAHistory" (
    "id" UUID NOT NULL,
    "handoverId" UUID NOT NULL,
    "oldDate" TIMESTAMP(3),
    "newDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "changedById" UUID NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ETAHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "opportunityId" UUID,
    "taskId" UUID,
    "actionUrl" TEXT,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NumberSequence" (
    "key" TEXT NOT NULL,
    "currentValue" BIGINT NOT NULL DEFAULT 0,
    "padding" INTEGER NOT NULL DEFAULT 6,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NumberSequence_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_initials_key" ON "User"("initials");

-- CreateIndex
CREATE INDEX "User_department_status_idx" ON "User"("department", "status");

-- CreateIndex
CREATE INDEX "User_archivedAt_idx" ON "User"("archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "Session_expiresAt_revokedAt_idx" ON "Session"("expiresAt", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Role_key_key" ON "Role"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "ReferenceSequence_year_trackCode_typeCode_idx" ON "ReferenceSequence"("year", "trackCode", "typeCode");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceSequence_companyCode_brandCode_trackCode_typeCode__key" ON "ReferenceSequence"("companyCode", "brandCode", "trackCode", "typeCode", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_reference_key" ON "Lead"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_convertedCustomerId_key" ON "Lead"("convertedCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_convertedOpportunityId_key" ON "Lead"("convertedOpportunityId");

-- CreateIndex
CREATE INDEX "Lead_ownerId_status_idx" ON "Lead"("ownerId", "status");

-- CreateIndex
CREATE INDEX "Lead_mobile_idx" ON "Lead"("mobile");

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "Lead"("email");

-- CreateIndex
CREATE INDEX "Lead_nextFollowUpAt_idx" ON "Lead"("nextFollowUpAt");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_reference_key" ON "Customer"("reference");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE INDEX "Customer_mobile_idx" ON "Customer"("mobile");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_erpCustomerCode_idx" ON "Customer"("erpCustomerCode");

-- CreateIndex
CREATE INDEX "Contact_customerId_isPrimary_idx" ON "Contact"("customerId", "isPrimary");

-- CreateIndex
CREATE INDEX "Contact_mobile_idx" ON "Contact"("mobile");

-- CreateIndex
CREATE INDEX "Contact_email_idx" ON "Contact"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_reference_key" ON "Opportunity"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_tenderSystemReference_key" ON "Opportunity"("tenderSystemReference");

-- CreateIndex
CREATE INDEX "Opportunity_ownerId_stage_idx" ON "Opportunity"("ownerId", "stage");

-- CreateIndex
CREATE INDEX "Opportunity_customerId_idx" ON "Opportunity"("customerId");

-- CreateIndex
CREATE INDEX "Opportunity_track_stage_idx" ON "Opportunity"("track", "stage");

-- CreateIndex
CREATE INDEX "Opportunity_nextFollowUpAt_idx" ON "Opportunity"("nextFollowUpAt");

-- CreateIndex
CREATE INDEX "Opportunity_designReference_idx" ON "Opportunity"("designReference");

-- CreateIndex
CREATE INDEX "Opportunity_clientTenderReference_idx" ON "Opportunity"("clientTenderReference");

-- CreateIndex
CREATE INDEX "OpportunityMember_userId_role_idx" ON "OpportunityMember"("userId", "role");

-- CreateIndex
CREATE INDEX "Activity_customerId_occurredAt_idx" ON "Activity"("customerId", "occurredAt");

-- CreateIndex
CREATE INDEX "Activity_opportunityId_occurredAt_idx" ON "Activity"("opportunityId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "Task_reference_key" ON "Task"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Task_automationKey_key" ON "Task"("automationKey");

-- CreateIndex
CREATE INDEX "Task_assignedToId_status_dueAt_idx" ON "Task"("assignedToId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "Task_opportunityId_idx" ON "Task"("opportunityId");

-- CreateIndex
CREATE INDEX "Task_sectionKey_idx" ON "Task"("sectionKey");

-- CreateIndex
CREATE INDEX "TaskComment_taskId_createdAt_idx" ON "TaskComment"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "Mention_mentionedUserId_readAt_idx" ON "Mention"("mentionedUserId", "readAt");

-- CreateIndex
CREATE INDEX "ChatterMessage_opportunityId_createdAt_idx" ON "ChatterMessage"("opportunityId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatterMessage_authorId_createdAt_idx" ON "ChatterMessage"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatterMention_mentionedUserId_readAt_createdAt_idx" ON "ChatterMention"("mentionedUserId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "ChatterMention_opportunityId_createdAt_idx" ON "ChatterMention"("opportunityId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatterMention_messageId_mentionedUserId_key" ON "ChatterMention"("messageId", "mentionedUserId");

-- CreateIndex
CREATE INDEX "Notification_recipientId_readAt_createdAt_idx" ON "Notification"("recipientId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Document_customerId_category_idx" ON "Document"("customerId", "category");

-- CreateIndex
CREATE INDEX "Document_opportunityId_category_idx" ON "Document"("opportunityId", "category");

-- CreateIndex
CREATE INDEX "Document_taskId_idx" ON "Document"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentVersion_storageKey_key" ON "DocumentVersion"("storageKey");

-- CreateIndex
CREATE INDEX "DocumentVersion_uploadedById_createdAt_idx" ON "DocumentVersion"("uploadedById", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentVersion_documentId_versionNo_key" ON "DocumentVersion"("documentId", "versionNo");

-- CreateIndex
CREATE INDEX "Measurement_assignedToId_status_scheduledAt_idx" ON "Measurement"("assignedToId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "DesignJob_assignedToId_status_dueAt_idx" ON "DesignJob"("assignedToId", "status", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "DesignVersion_documentVersionId_key" ON "DesignVersion"("documentVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "DesignVersion_designJobId_versionNo_key" ON "DesignVersion"("designJobId", "versionNo");

-- CreateIndex
CREATE UNIQUE INDEX "DesignPackage_opportunityId_key" ON "DesignPackage"("opportunityId");

-- CreateIndex
CREATE INDEX "PricingCase_status_type_idx" ON "PricingCase"("status", "type");

-- CreateIndex
CREATE UNIQUE INDEX "PricingCase_opportunityId_revision_key" ON "PricingCase"("opportunityId", "revision");

-- CreateIndex
CREATE INDEX "PricingLine_pricingCaseId_sortOrder_idx" ON "PricingLine"("pricingCaseId", "sortOrder");

-- CreateIndex
CREATE INDEX "PricingReview_pricingCaseId_createdAt_idx" ON "PricingReview"("pricingCaseId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_internalReference_key" ON "Quotation"("internalReference");

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_businessReference_key" ON "Quotation"("businessReference");

-- CreateIndex
CREATE INDEX "Quotation_opportunityId_status_idx" ON "Quotation"("opportunityId", "status");

-- CreateIndex
CREATE INDEX "Quotation_legacyReference_idx" ON "Quotation"("legacyReference");

-- CreateIndex
CREATE UNIQUE INDEX "QuotationVersion_pdfDocumentVersionId_key" ON "QuotationVersion"("pdfDocumentVersionId");

-- CreateIndex
CREATE INDEX "QuotationVersion_pricingCaseId_idx" ON "QuotationVersion"("pricingCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "QuotationVersion_quotationId_versionNo_key" ON "QuotationVersion"("quotationId", "versionNo");

-- CreateIndex
CREATE INDEX "Approval_status_type_requestedAt_idx" ON "Approval"("status", "type", "requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistDefinition_key_key" ON "ChecklistDefinition"("key");

-- CreateIndex
CREATE INDEX "ChecklistDefinition_track_isActive_sortOrder_idx" ON "ChecklistDefinition"("track", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "OpportunityChecklistItem_opportunityId_status_idx" ON "OpportunityChecklistItem"("opportunityId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunityChecklistItem_opportunityId_definitionId_key" ON "OpportunityChecklistItem"("opportunityId", "definitionId");

-- CreateIndex
CREATE UNIQUE INDEX "Deposit_reference_key" ON "Deposit"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Deposit_evidenceDocumentVersionId_key" ON "Deposit"("evidenceDocumentVersionId");

-- CreateIndex
CREATE INDEX "Deposit_opportunityId_status_idx" ON "Deposit"("opportunityId", "status");

-- CreateIndex
CREATE INDEX "Deposit_status_submittedAt_idx" ON "Deposit"("status", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrderHandover_opportunityId_key" ON "OrderHandover"("opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderHandover_poDocumentVersionId_key" ON "OrderHandover"("poDocumentVersionId");

-- CreateIndex
CREATE INDEX "OrderHandover_assignedToId_status_idx" ON "OrderHandover"("assignedToId", "status");

-- CreateIndex
CREATE INDEX "OrderHandover_erpPoNumber_idx" ON "OrderHandover"("erpPoNumber");

-- CreateIndex
CREATE INDEX "ETAHistory_handoverId_changedAt_idx" ON "ETAHistory"("handoverId", "changedAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_opportunityId_createdAt_idx" ON "AuditLog"("opportunityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_taskId_createdAt_idx" ON "AuditLog"("taskId", "createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_convertedCustomerId_fkey" FOREIGN KEY ("convertedCustomerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_convertedOpportunityId_fkey" FOREIGN KEY ("convertedOpportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityMember" ADD CONSTRAINT "OpportunityMember_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityMember" ADD CONSTRAINT "OpportunityMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskWatcher" ADD CONSTRAINT "TaskWatcher_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskWatcher" ADD CONSTRAINT "TaskWatcher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mention" ADD CONSTRAINT "Mention_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mention" ADD CONSTRAINT "Mention_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "TaskComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mention" ADD CONSTRAINT "Mention_mentionedUserId_fkey" FOREIGN KEY ("mentionedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mention" ADD CONSTRAINT "Mention_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatterMessage" ADD CONSTRAINT "ChatterMessage_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatterMessage" ADD CONSTRAINT "ChatterMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatterMention" ADD CONSTRAINT "ChatterMention_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatterMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatterMention" ADD CONSTRAINT "ChatterMention_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatterMention" ADD CONSTRAINT "ChatterMention_mentionedUserId_fkey" FOREIGN KEY ("mentionedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatterMention" ADD CONSTRAINT "ChatterMention_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Measurement" ADD CONSTRAINT "Measurement_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Measurement" ADD CONSTRAINT "Measurement_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Measurement" ADD CONSTRAINT "Measurement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignJob" ADD CONSTRAINT "DesignJob_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignJob" ADD CONSTRAINT "DesignJob_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignJob" ADD CONSTRAINT "DesignJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignVersion" ADD CONSTRAINT "DesignVersion_designJobId_fkey" FOREIGN KEY ("designJobId") REFERENCES "DesignJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignVersion" ADD CONSTRAINT "DesignVersion_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "DocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignVersion" ADD CONSTRAINT "DesignVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignPackage" ADD CONSTRAINT "DesignPackage_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignPackage" ADD CONSTRAINT "DesignPackage_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignPackage" ADD CONSTRAINT "DesignPackage_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingCase" ADD CONSTRAINT "PricingCase_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingCase" ADD CONSTRAINT "PricingCase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingCase" ADD CONSTRAINT "PricingCase_preparedById_fkey" FOREIGN KEY ("preparedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingLine" ADD CONSTRAINT "PricingLine_pricingCaseId_fkey" FOREIGN KEY ("pricingCaseId") REFERENCES "PricingCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingReview" ADD CONSTRAINT "PricingReview_pricingCaseId_fkey" FOREIGN KEY ("pricingCaseId") REFERENCES "PricingCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingReview" ADD CONSTRAINT "PricingReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationVersion" ADD CONSTRAINT "QuotationVersion_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationVersion" ADD CONSTRAINT "QuotationVersion_pricingCaseId_fkey" FOREIGN KEY ("pricingCaseId") REFERENCES "PricingCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationVersion" ADD CONSTRAINT "QuotationVersion_pdfDocumentVersionId_fkey" FOREIGN KEY ("pdfDocumentVersionId") REFERENCES "DocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationVersion" ADD CONSTRAINT "QuotationVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationVersion" ADD CONSTRAINT "QuotationVersion_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_pricingCaseId_fkey" FOREIGN KEY ("pricingCaseId") REFERENCES "PricingCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityChecklistItem" ADD CONSTRAINT "OpportunityChecklistItem_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityChecklistItem" ADD CONSTRAINT "OpportunityChecklistItem_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "ChecklistDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityChecklistItem" ADD CONSTRAINT "OpportunityChecklistItem_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_evidenceDocumentVersionId_fkey" FOREIGN KEY ("evidenceDocumentVersionId") REFERENCES "DocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderHandover" ADD CONSTRAINT "OrderHandover_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderHandover" ADD CONSTRAINT "OrderHandover_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderHandover" ADD CONSTRAINT "OrderHandover_poDocumentVersionId_fkey" FOREIGN KEY ("poDocumentVersionId") REFERENCES "DocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ETAHistory" ADD CONSTRAINT "ETAHistory_handoverId_fkey" FOREIGN KEY ("handoverId") REFERENCES "OrderHandover"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ETAHistory" ADD CONSTRAINT "ETAHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
