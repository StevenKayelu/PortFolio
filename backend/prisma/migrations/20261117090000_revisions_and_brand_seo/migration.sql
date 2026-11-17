-- Additive except one index swap: seo_meta routes become unique per brand
-- (the same path, e.g. "/", exists on both sites). No rows are removed.

-- DropIndex
DROP INDEX `seo_meta_route_key` ON `seo_meta`;

-- AlterTable
ALTER TABLE `seo_meta` ADD COLUMN `brandId` VARCHAR(191) NULL,
    ADD COLUMN `noIndex` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `content_revisions` (
    `id` VARCHAR(191) NOT NULL,
    `entityType` ENUM('VENTURE', 'PRODUCT') NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `brandId` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'APPLIED', 'REJECTED') NOT NULL,
    `changes` JSON NOT NULL,
    `previous` JSON NULL,
    `note` TEXT NULL,
    `reviewNote` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedAt` DATETIME(3) NULL,
    `authorId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,

    INDEX `content_revisions_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `content_revisions_status_brandId_idx`(`status`, `brandId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `seo_meta_brandId_route_key` ON `seo_meta`(`brandId`, `route`);

-- AddForeignKey
ALTER TABLE `seo_meta` ADD CONSTRAINT `seo_meta_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `content_revisions` ADD CONSTRAINT `content_revisions_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `content_revisions` ADD CONSTRAINT `content_revisions_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

