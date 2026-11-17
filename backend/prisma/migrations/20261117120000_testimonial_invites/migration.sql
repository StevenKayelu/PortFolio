-- AlterTable
ALTER TABLE `testimonials` ADD COLUMN `brandId` VARCHAR(191) NULL,
    ADD COLUMN `clientEmail` VARCHAR(191) NULL,
    ADD COLUMN `consentContactAt` DATETIME(3) NULL,
    ADD COLUMN `consentPublishAt` DATETIME(3) NULL,
    ADD COLUMN `consentText` TEXT NULL,
    ADD COLUMN `inviteId` VARCHAR(191) NULL,
    ADD COLUMN `projectId` VARCHAR(191) NULL,
    ADD COLUMN `relationship` VARCHAR(191) NULL,
    ADD COLUMN `verified` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `withdrawnAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `testimonial_invites` (
    `id` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `clientName` VARCHAR(191) NOT NULL,
    `clientEmail` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `submittedAt` DATETIME(3) NULL,
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `brandId` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,

    UNIQUE INDEX `testimonial_invites_tokenHash_key`(`tokenHash`),
    INDEX `testimonial_invites_brandId_idx`(`brandId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `testimonials_inviteId_key` ON `testimonials`(`inviteId`);

-- CreateIndex
CREATE INDEX `testimonials_isApproved_withdrawnAt_idx` ON `testimonials`(`isApproved`, `withdrawnAt`);

-- AddForeignKey
ALTER TABLE `testimonials` ADD CONSTRAINT `testimonials_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `testimonials` ADD CONSTRAINT `testimonials_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `testimonials` ADD CONSTRAINT `testimonials_inviteId_fkey` FOREIGN KEY (`inviteId`) REFERENCES `testimonial_invites`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `testimonial_invites` ADD CONSTRAINT `testimonial_invites_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `testimonial_invites` ADD CONSTRAINT `testimonial_invites_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `testimonial_invites` ADD CONSTRAINT `testimonial_invites_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

