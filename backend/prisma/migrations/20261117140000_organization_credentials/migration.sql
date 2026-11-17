-- CreateTable
CREATE TABLE `organization_credentials` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `type` ENUM('PACRA_REGISTRATION', 'ZICTA_LICENCE', 'DATA_PROTECTION_REGISTRATION', 'OTHER') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `authority` VARCHAR(191) NOT NULL,
    `referenceNumber` VARCHAR(191) NOT NULL,
    `issuedAt` DATETIME(3) NOT NULL,
    `expiresAt` DATETIME(3) NULL,
    `verificationUrl` VARCHAR(191) NULL,
    `verificationNote` TEXT NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `originalKey` VARCHAR(191) NULL,
    `originalName` VARCHAR(191) NULL,
    `originalMime` VARCHAR(191) NULL,
    `originalSize` INTEGER NULL,
    `reminder60SentAt` DATETIME(3) NULL,
    `reminder30SentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `organization_credentials_organizationId_idx`(`organizationId`),
    INDEX `organization_credentials_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `organization_credentials` ADD CONSTRAINT `organization_credentials_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

