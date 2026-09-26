-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `username` VARCHAR(191) NULL,
    `passwordHash` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `emailVerified` DATETIME(3) NULL,
    `image` VARCHAR(191) NULL,
    `role` ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_username_key`(`username`),
    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_email_idx`(`email`),
    INDEX `User_username_idx`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Account` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `providerAccountId` VARCHAR(191) NOT NULL,
    `refresh_token` TEXT NULL,
    `access_token` TEXT NULL,
    `expires_at` INTEGER NULL,
    `token_type` VARCHAR(191) NULL,
    `scope` VARCHAR(191) NULL,
    `id_token` TEXT NULL,
    `session_state` VARCHAR(191) NULL,

    UNIQUE INDEX `Account_provider_providerAccountId_key`(`provider`, `providerAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `sessionToken` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Session_sessionToken_key`(`sessionToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VerificationToken` (
    `identifier` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VerificationToken_token_key`(`token`),
    UNIQUE INDEX `VerificationToken_identifier_token_key`(`identifier`, `token`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApiKey` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `provider` ENUM('GEMINI', 'GROQ', 'OPENROUTER', 'RESEND', 'SERPER', 'SMTP', 'REDDIT', 'HUNTER') NOT NULL,
    `label` VARCHAR(191) NULL,
    `ciphertext` TEXT NOT NULL,
    `iv` VARCHAR(191) NOT NULL,
    `authTag` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ApiKey_userId_provider_label_key`(`userId`, `provider`, `label`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `affiliateUrl` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `notes` TEXT NULL,
    `status` ENUM('DRAFT', 'ANALYZING', 'READY', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Product_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductAnalysis` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `summary` TEXT NOT NULL,
    `benefits` JSON NOT NULL,
    `targetAudience` JSON NOT NULL,
    `industries` JSON NOT NULL,
    `pricingTier` VARCHAR(191) NULL,
    `audienceType` ENUM('B2B', 'B2C', 'BOTH') NOT NULL,
    `buyingIntent` VARCHAR(191) NULL,
    `painPoints` JSON NOT NULL,
    `outreachAngles` JSON NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `rawResponse` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ProductAnalysis_productId_key`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Icp` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `persona` TEXT NOT NULL,
    `industry` VARCHAR(191) NULL,
    `companySize` VARCHAR(191) NULL,
    `geo` VARCHAR(191) NULL,
    `keywords` JSON NOT NULL,
    `searchQueries` JSON NOT NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Icp_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Campaign` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `icpId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `dailyLimit` INTEGER NOT NULL DEFAULT 20,
    `minScore` INTEGER NOT NULL DEFAULT 80,
    `autoSend` BOOLEAN NOT NULL DEFAULT false,
    `sendWindowStart` INTEGER NOT NULL DEFAULT 9,
    `sendWindowEnd` INTEGER NOT NULL DEFAULT 17,
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'UTC',
    `senderIdentityId` VARCHAR(191) NULL,
    `targetGeos` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Campaign_userId_idx`(`userId`),
    INDEX `Campaign_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SequenceStep` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `stepOrder` INTEGER NOT NULL,
    `delayDays` INTEGER NOT NULL DEFAULT 3,
    `purpose` VARCHAR(191) NULL,

    UNIQUE INDEX `SequenceStep_campaignId_stepOrder_key`(`campaignId`, `stepOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Lead` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NULL,
    `icpId` VARCHAR(191) NULL,
    `company` VARCHAR(191) NOT NULL,
    `website` VARCHAR(191) NULL,
    `domain` VARCHAR(191) NULL,
    `industry` VARCHAR(191) NULL,
    `companySize` VARCHAR(191) NULL,
    `geo` VARCHAR(191) NULL,
    `source` VARCHAR(191) NOT NULL,
    `sourceUrl` VARCHAR(191) NULL,
    `status` ENUM('DISCOVERED', 'SCORED', 'QUALIFIED', 'DISQUALIFIED', 'CONTACT_FOUND', 'RESEARCHED', 'DRAFTED', 'QUEUED', 'CONTACTED', 'REPLIED', 'BOUNCED', 'UNSUBSCRIBED', 'CONVERTED') NOT NULL DEFAULT 'DISCOVERED',
    `scoreTotal` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Lead_userId_idx`(`userId`),
    INDEX `Lead_campaignId_idx`(`campaignId`),
    INDEX `Lead_status_idx`(`status`),
    UNIQUE INDEX `Lead_userId_domain_key`(`userId`, `domain`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Contact` (
    `id` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `position` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `emailStatus` ENUM('UNKNOWN', 'VALID', 'RISKY', 'INVALID', 'SUPPRESSED') NOT NULL DEFAULT 'UNKNOWN',
    `source` VARCHAR(191) NOT NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Contact_leadId_idx`(`leadId`),
    INDEX `Contact_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeadScore` (
    `id` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `industryMatch` INTEGER NOT NULL DEFAULT 0,
    `companySizeMatch` INTEGER NOT NULL DEFAULT 0,
    `websiteQuality` INTEGER NOT NULL DEFAULT 0,
    `socialActivity` INTEGER NOT NULL DEFAULT 0,
    `technologyMatch` INTEGER NOT NULL DEFAULT 0,
    `painPointMatch` INTEGER NOT NULL DEFAULT 0,
    `total` INTEGER NOT NULL DEFAULT 0,
    `reasoning` TEXT NULL,
    `model` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `LeadScore_leadId_key`(`leadId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProspectResearch` (
    `id` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `services` JSON NULL,
    `aboutSummary` TEXT NULL,
    `recentActivity` JSON NULL,
    `socialLinks` JSON NULL,
    `techStack` JSON NULL,
    `personalizationHooks` JSON NULL,
    `model` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ProspectResearch_leadId_key`(`leadId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SenderIdentity` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `fromName` VARCHAR(191) NOT NULL,
    `fromEmail` VARCHAR(191) NOT NULL,
    `replyTo` VARCHAR(191) NULL,
    `channel` ENUM('RESEND', 'SMTP') NOT NULL DEFAULT 'RESEND',
    `mailingAddress` VARCHAR(191) NULL,
    `warmupStage` INTEGER NOT NULL DEFAULT 0,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SenderIdentity_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailMessage` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `contactId` VARCHAR(191) NULL,
    `senderIdentityId` VARCHAR(191) NULL,
    `stepOrder` INTEGER NOT NULL DEFAULT 0,
    `subject` VARCHAR(191) NOT NULL,
    `bodyHtml` TEXT NOT NULL,
    `bodyText` TEXT NOT NULL,
    `model` VARCHAR(191) NULL,
    `status` ENUM('DRAFTED', 'PENDING_APPROVAL', 'APPROVED', 'QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED', 'BOUNCED', 'COMPLAINED', 'UNSUBSCRIBED', 'FAILED', 'CANCELED') NOT NULL DEFAULT 'DRAFTED',
    `channel` ENUM('RESEND', 'SMTP') NOT NULL DEFAULT 'RESEND',
    `providerMessageId` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `scheduledAt` DATETIME(3) NULL,
    `sentAt` DATETIME(3) NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `lastError` TEXT NULL,
    `openedAt` DATETIME(3) NULL,
    `openCount` INTEGER NOT NULL DEFAULT 0,
    `clickedAt` DATETIME(3) NULL,
    `clickCount` INTEGER NOT NULL DEFAULT 0,
    `repliedAt` DATETIME(3) NULL,
    `bouncedAt` DATETIME(3) NULL,
    `complainedAt` DATETIME(3) NULL,
    `unsubscribedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EmailMessage_userId_idx`(`userId`),
    INDEX `EmailMessage_campaignId_idx`(`campaignId`),
    INDEX `EmailMessage_status_idx`(`status`),
    INDEX `EmailMessage_scheduledAt_idx`(`scheduledAt`),
    INDEX `EmailMessage_providerMessageId_idx`(`providerMessageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailEvent` (
    `id` VARCHAR(191) NOT NULL,
    `emailId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `payload` JSON NULL,
    `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EmailEvent_emailId_idx`(`emailId`),
    INDEX `EmailEvent_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Suppression` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Suppression_userId_idx`(`userId`),
    UNIQUE INDEX `Suppression_userId_email_key`(`userId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CampaignMetric` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `discovered` INTEGER NOT NULL DEFAULT 0,
    `qualified` INTEGER NOT NULL DEFAULT 0,
    `sent` INTEGER NOT NULL DEFAULT 0,
    `delivered` INTEGER NOT NULL DEFAULT 0,
    `opened` INTEGER NOT NULL DEFAULT 0,
    `clicked` INTEGER NOT NULL DEFAULT 0,
    `replied` INTEGER NOT NULL DEFAULT 0,
    `bounced` INTEGER NOT NULL DEFAULT 0,
    `converted` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `CampaignMetric_campaignId_date_key`(`campaignId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UsageCounter` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `scope` VARCHAR(191) NOT NULL,
    `windowKey` VARCHAR(191) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `UsageCounter_userId_scope_windowKey_key`(`userId`, `scope`, `windowKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NULL,
    `entityId` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `ip` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_userId_idx`(`userId`),
    INDEX `AuditLog_action_idx`(`action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AgentRun` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `campaignId` VARCHAR(191) NULL,
    `trigger` VARCHAR(191) NOT NULL,
    `status` ENUM('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED') NOT NULL DEFAULT 'RUNNING',
    `stats` JSON NULL,
    `error` TEXT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finishedAt` DATETIME(3) NULL,

    INDEX `AgentRun_userId_idx`(`userId`),
    INDEX `AgentRun_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserCapability` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `skills` JSON NOT NULL,
    `services` JSON NOT NULL,
    `portfolioLinks` JSON NULL,
    `hourlyRateMin` INTEGER NULL,
    `hourlyRateMax` INTEGER NULL,
    `bio` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UserCapability_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductProfile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `offer` TEXT NULL,
    `category` VARCHAR(191) NULL,
    `subcategories` JSON NULL,
    `problemsSolved` JSON NULL,
    `painPoints` JSON NULL,
    `useCases` JSON NULL,
    `targetIndustries` JSON NULL,
    `targetCompanyTypes` JSON NULL,
    `targetCompanySizes` JSON NULL,
    `targetGeographies` JSON NULL,
    `buyerPersonas` JSON NULL,
    `decisionMakerRoles` JSON NULL,
    `strongDemandSignals` JSON NULL,
    `mediumDemandSignals` JSON NULL,
    `weakDemandSignals` JSON NULL,
    `negativeSignals` JSON NULL,
    `technologies` JSON NULL,
    `platforms` JSON NULL,
    `competitors` JSON NULL,
    `keywords` JSON NULL,
    `semanticConcepts` JSON NULL,
    `generatedSearchQueries` JSON NULL,
    `recommendedCommunities` JSON NULL,
    `status` ENUM('DRAFT', 'ANALYZING', 'ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ProductProfile_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Opportunity` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `productProfileId` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `sourceUrl` VARCHAR(191) NOT NULL,
    `sourceExternalId` VARCHAR(191) NULL,
    `platform` ENUM('REDDIT', 'X', 'WEB', 'FORUM') NOT NULL DEFAULT 'WEB',
    `authorName` VARCHAR(191) NULL,
    `authorUsername` VARCHAR(191) NULL,
    `authorProfileUrl` VARCHAR(191) NULL,
    `companyName` VARCHAR(191) NULL,
    `companyDomain` VARCHAR(191) NULL,
    `companyUrl` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `publishedAt` DATETIME(3) NULL,
    `discoveredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `originalText` TEXT NOT NULL,
    `extractedText` TEXT NULL,
    `detectedNeed` TEXT NULL,
    `detectedProblem` TEXT NULL,
    `currentWorkflow` TEXT NULL,
    `requestedSolution` TEXT NULL,
    `opportunityType` ENUM('PAID_PROJECT', 'CUSTOM_SOFTWARE', 'SAAS_MVP', 'AI_PROJECT', 'AI_AUTOMATION', 'INTERNAL_TOOL', 'WEBSITE_PROJECT', 'MOBILE_APP', 'EXISTING_SOFTWARE_DEVELOPMENT', 'BUG_FIX', 'TECHNICAL_COFOUNDER', 'EQUITY_PROJECT', 'IDEA_ONLY', 'JOB', 'NOT_RELEVANT') NOT NULL DEFAULT 'CUSTOM_SOFTWARE',
    `intentLevel` ENUM('EXPLICIT', 'HIGH', 'MEDIUM', 'LOW', 'NONE') NOT NULL DEFAULT 'MEDIUM',
    `intentScore` INTEGER NOT NULL DEFAULT 0,
    `commercialScore` INTEGER NOT NULL DEFAULT 0,
    `capabilityMatchScore` INTEGER NOT NULL DEFAULT 0,
    `recencyScore` INTEGER NOT NULL DEFAULT 0,
    `confidenceScore` INTEGER NOT NULL DEFAULT 0,
    `overallScore` INTEGER NOT NULL DEFAULT 0,
    `evidence` JSON NULL,
    `whyThisIsAnOpportunity` TEXT NULL,
    `recommendedOffer` TEXT NULL,
    `recommendedApproach` TEXT NULL,
    `suggestedMessage` TEXT NULL,
    `status` ENUM('NEW', 'SAVED', 'CONTACTED', 'IGNORED', 'CONVERTED') NOT NULL DEFAULT 'NEW',
    `email` VARCHAR(191) NULL,
    `emailConfidence` ENUM('NONE', 'GUESSED', 'ROLE_BASED', 'VERIFIED') NOT NULL DEFAULT 'NONE',
    `contactUrl` VARCHAR(191) NULL,
    `contactedAt` DATETIME(3) NULL,
    `leadId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Opportunity_userId_idx`(`userId`),
    INDEX `Opportunity_productProfileId_idx`(`productProfileId`),
    INDEX `Opportunity_status_idx`(`status`),
    INDEX `Opportunity_overallScore_idx`(`overallScore`),
    INDEX `Opportunity_opportunityType_idx`(`opportunityType`),
    UNIQUE INDEX `Opportunity_userId_sourceUrl_key`(`userId`, `sourceUrl`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SearchRun` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `productProfileId` VARCHAR(191) NULL,
    `provider` VARCHAR(191) NOT NULL,
    `query` VARCHAR(191) NOT NULL,
    `resultsFound` INTEGER NOT NULL DEFAULT 0,
    `resultsAccepted` INTEGER NOT NULL DEFAULT 0,
    `estimatedCost` DOUBLE NOT NULL DEFAULT 0,
    `quotaConsumed` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SearchRun_userId_idx`(`userId`),
    INDEX `SearchRun_productProfileId_idx`(`productProfileId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Account` ADD CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApiKey` ADD CONSTRAINT `ApiKey_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductAnalysis` ADD CONSTRAINT `ProductAnalysis_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Icp` ADD CONSTRAINT `Icp_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Campaign` ADD CONSTRAINT `Campaign_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Campaign` ADD CONSTRAINT `Campaign_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Campaign` ADD CONSTRAINT `Campaign_icpId_fkey` FOREIGN KEY (`icpId`) REFERENCES `Icp`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Campaign` ADD CONSTRAINT `Campaign_senderIdentityId_fkey` FOREIGN KEY (`senderIdentityId`) REFERENCES `SenderIdentity`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SequenceStep` ADD CONSTRAINT `SequenceStep_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_icpId_fkey` FOREIGN KEY (`icpId`) REFERENCES `Icp`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contact` ADD CONSTRAINT `Contact_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadScore` ADD CONSTRAINT `LeadScore_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProspectResearch` ADD CONSTRAINT `ProspectResearch_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SenderIdentity` ADD CONSTRAINT `SenderIdentity_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailMessage` ADD CONSTRAINT `EmailMessage_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailMessage` ADD CONSTRAINT `EmailMessage_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailMessage` ADD CONSTRAINT `EmailMessage_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailMessage` ADD CONSTRAINT `EmailMessage_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `Contact`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailMessage` ADD CONSTRAINT `EmailMessage_senderIdentityId_fkey` FOREIGN KEY (`senderIdentityId`) REFERENCES `SenderIdentity`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailEvent` ADD CONSTRAINT `EmailEvent_emailId_fkey` FOREIGN KEY (`emailId`) REFERENCES `EmailMessage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CampaignMetric` ADD CONSTRAINT `CampaignMetric_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UsageCounter` ADD CONSTRAINT `UsageCounter_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserCapability` ADD CONSTRAINT `UserCapability_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductProfile` ADD CONSTRAINT `ProductProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductProfile` ADD CONSTRAINT `ProductProfile_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Opportunity` ADD CONSTRAINT `Opportunity_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Opportunity` ADD CONSTRAINT `Opportunity_productProfileId_fkey` FOREIGN KEY (`productProfileId`) REFERENCES `ProductProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Opportunity` ADD CONSTRAINT `Opportunity_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SearchRun` ADD CONSTRAINT `SearchRun_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SearchRun` ADD CONSTRAINT `SearchRun_productProfileId_fkey` FOREIGN KEY (`productProfileId`) REFERENCES `ProductProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO `User` (`id`, `username`, `name`, `role`, `passwordHash`, `updatedAt`) VALUES ('admin12345', 'admin', 'Admin', 'ADMIN', '$2b$10$sMNlyKM9I7ch/ZOJNYxVvOVC5Tqb.IkU82l4tLZgm0anMjlDAM1S2', NOW(3));
