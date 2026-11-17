-- Values the live site already uses (added there after the template).
ALTER TYPE "SkillCategory" ADD VALUE IF NOT EXISTS 'MOBILE';
ALTER TYPE "SkillCategory" ADD VALUE IF NOT EXISTS 'OTHER';
ALTER TYPE "ExperienceType" ADD VALUE IF NOT EXISTS 'STUDENT_DEVELOPER';
