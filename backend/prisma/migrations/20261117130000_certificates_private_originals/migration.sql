-- AlterTable
ALTER TABLE `certificates` ADD COLUMN `expiresAt` DATETIME(3) NULL,
    ADD COLUMN `isPublished` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `originalKey` VARCHAR(191) NULL,
    ADD COLUMN `originalMime` VARCHAR(191) NULL,
    ADD COLUMN `originalName` VARCHAR(191) NULL,
    ADD COLUMN `originalSize` INTEGER NULL,
    ADD COLUMN `showCredentialId` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `type` ENUM('CERTIFICATION', 'COURSE', 'ACADEMIC', 'AWARD') NOT NULL DEFAULT 'COURSE';


-- Remove the template placeholder certificates that were live as if real.
-- Matched by their placeholder credential IDs only; real certificates are untouched.
DELETE FROM `certificates`
WHERE (`credentialId` = 'AWS-000000' AND `title` = 'AWS Certified Solutions Architect')
   OR (`credentialId` = 'PSM-000000' AND `title` = 'Professional Scrum Master I');
