-- AlterTable
ALTER TABLE `projects` ADD COLUMN `outcome` TEXT NULL,
    ADD COLUMN `ownerName` VARCHAR(191) NULL,
    ADD COLUMN `ownershipStatus` ENUM('NEEDS_REVIEW', 'CONFIRMED', 'NOT_OWNED') NOT NULL DEFAULT 'NEEDS_REVIEW',
    ADD COLUMN `publicationPermission` ENUM('UNKNOWN', 'GRANTED', 'NOT_REQUIRED', 'DENIED') NOT NULL DEFAULT 'UNKNOWN',
    ADD COLUMN `showcaseBrandId` VARCHAR(191) NULL,
    ADD COLUMN `visibility` ENUM('PUBLIC', 'UNLISTED', 'PRIVATE') NOT NULL DEFAULT 'PUBLIC';

-- CreateTable
CREATE TABLE `organizations` (
    `id` VARCHAR(191) NOT NULL,
    `legalName` VARCHAR(191) NOT NULL,
    `tradingName` VARCHAR(191) NULL,
    `registrationType` VARCHAR(191) NULL,
    `registry` VARCHAR(191) NULL,
    `registrationNumber` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `verificationStatus` ENUM('UNVERIFIED', 'PENDING', 'VERIFIED') NOT NULL DEFAULT 'UNVERIFIED',
    `verifiedAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `brands` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `kind` ENUM('PERSONAL', 'UMBRELLA', 'SERVICE', 'VENTURE') NOT NULL,
    `tagline` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `logoUrl` VARCHAR(191) NULL,
    `domains` JSON NULL,
    `theme` JSON NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `organizationId` VARCHAR(191) NULL,

    UNIQUE INDEX `brands_key_key`(`key`),
    UNIQUE INDEX `brands_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `brand_relationships` (
    `id` VARCHAR(191) NOT NULL,
    `parentBrandId` VARCHAR(191) NOT NULL,
    `childBrandId` VARCHAR(191) NOT NULL,
    `relationType` ENUM('UMBRELLA_OF', 'FOUNDER_OF', 'ASSOCIATED_WITH') NOT NULL,
    `verificationStatus` ENUM('UNVERIFIED', 'PENDING', 'VERIFIED') NOT NULL DEFAULT 'UNVERIFIED',
    `publicNote` TEXT NULL,
    `internalNote` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `brand_relationships_childBrandId_idx`(`childBrandId`),
    UNIQUE INDEX `brand_relationships_parentBrandId_childBrandId_relationType_key`(`parentBrandId`, `childBrandId`, `relationType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ventures` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `summary` TEXT NOT NULL,
    `description` TEXT NULL,
    `stage` ENUM('IDEA', 'BUILDING', 'OPERATING', 'PAUSED') NOT NULL DEFAULT 'IDEA',
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `verificationStatus` ENUM('UNVERIFIED', 'PENDING', 'VERIFIED') NOT NULL DEFAULT 'UNVERIFIED',
    `website` VARCHAR(191) NULL,
    `logoUrl` VARCHAR(191) NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `brandId` VARCHAR(191) NULL,
    `organizationId` VARCHAR(191) NULL,

    UNIQUE INDEX `ventures_slug_key`(`slug`),
    INDEX `ventures_brandId_idx`(`brandId`),
    INDEX `ventures_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `summary` TEXT NULL,
    `website` VARCHAR(191) NULL,
    `lifecycle` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `ownershipStatus` ENUM('NEEDS_REVIEW', 'CONFIRMED', 'NOT_OWNED') NOT NULL DEFAULT 'NEEDS_REVIEW',
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `ventureId` VARCHAR(191) NULL,
    `projectId` VARCHAR(191) NULL,

    UNIQUE INDEX `products_slug_key`(`slug`),
    INDEX `products_ventureId_idx`(`ventureId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_contributors` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `organizationName` VARCHAR(191) NULL,
    `role` VARCHAR(191) NOT NULL,
    `contribution` TEXT NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `project_contributors_projectId_idx`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_brand_roles` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `scope` ENUM('ADMIN', 'EDITOR', 'LEAD_MANAGER') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_brand_roles_brandId_idx`(`brandId`),
    UNIQUE INDEX `user_brand_roles_userId_brandId_key`(`userId`, `brandId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leads` (
    `id` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NOT NULL,
    `type` ENUM('CAREER', 'COLLABORATION', 'QUOTE', 'PARTNERSHIP', 'GENERAL') NOT NULL,
    `status` ENUM('NEW', 'QUALIFIED', 'CONTACTED', 'PROPOSAL', 'WON', 'LOST', 'ARCHIVED', 'SPAM') NOT NULL DEFAULT 'NEW',
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `organization` VARCHAR(191) NULL,
    `message` TEXT NOT NULL,
    `details` JSON NULL,
    `source` VARCHAR(191) NULL,
    `consentAt` DATETIME(3) NULL,
    `ipHash` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `brandId` VARCHAR(191) NOT NULL,
    `assignedToId` VARCHAR(191) NULL,
    `contactMessageId` VARCHAR(191) NULL,

    UNIQUE INDEX `leads_reference_key`(`reference`),
    UNIQUE INDEX `leads_contactMessageId_key`(`contactMessageId`),
    INDEX `leads_brandId_status_idx`(`brandId`, `status`),
    INDEX `leads_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lead_activities` (
    `id` VARCHAR(191) NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `kind` ENUM('CREATED', 'NOTE', 'STATUS_CHANGE', 'ASSIGNMENT') NOT NULL,
    `body` TEXT NULL,
    `fromStatus` ENUM('NEW', 'QUALIFIED', 'CONTACTED', 'PROPOSAL', 'WON', 'LOST', 'ARCHIVED', 'SPAM') NULL,
    `toStatus` ENUM('NEW', 'QUALIFIED', 'CONTACTED', 'PROPOSAL', 'WON', 'LOST', 'ARCHIVED', 'SPAM') NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `lead_activities_leadId_idx`(`leadId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `projects_showcaseBrandId_idx` ON `projects`(`showcaseBrandId`);

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_showcaseBrandId_fkey` FOREIGN KEY (`showcaseBrandId`) REFERENCES `brands`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brands` ADD CONSTRAINT `brands_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brand_relationships` ADD CONSTRAINT `brand_relationships_parentBrandId_fkey` FOREIGN KEY (`parentBrandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brand_relationships` ADD CONSTRAINT `brand_relationships_childBrandId_fkey` FOREIGN KEY (`childBrandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ventures` ADD CONSTRAINT `ventures_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ventures` ADD CONSTRAINT `ventures_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_ventureId_fkey` FOREIGN KEY (`ventureId`) REFERENCES `ventures`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_contributors` ADD CONSTRAINT `project_contributors_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_brand_roles` ADD CONSTRAINT `user_brand_roles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_brand_roles` ADD CONSTRAINT `user_brand_roles_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `leads_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `leads_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_activities` ADD CONSTRAINT `lead_activities_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_activities` ADD CONSTRAINT `lead_activities_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
