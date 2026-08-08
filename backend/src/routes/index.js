import { Router } from "express";
import authRoutes from "./auth.routes.js";
import projectRoutes from "./project.routes.js";
import blogRoutes from "./blog.routes.js";
import serviceRoutes from "./service.routes.js";
import experienceRoutes from "./experience.routes.js";
import certificateRoutes from "./certificate.routes.js";
import skillRoutes from "./skill.routes.js";
import galleryRoutes from "./gallery.routes.js";
import achievementRoutes from "./achievement.routes.js";
import faqRoutes from "./faq.routes.js";
import testimonialRoutes from "./testimonial.routes.js";
import contactRoutes from "./contact.routes.js";
import newsletterRoutes from "./newsletter.routes.js";
import resumeRoutes from "./resume.routes.js";
import siteSettingRoutes from "./siteSetting.routes.js";
import adminRoutes from "./admin.routes.js";

const router = Router();

router.get("/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

router.use("/auth", authRoutes);
router.use("/projects", projectRoutes);
router.use("/blog", blogRoutes);
router.use("/services", serviceRoutes);
router.use("/experience", experienceRoutes);
router.use("/certificates", certificateRoutes);
router.use("/skills", skillRoutes);
router.use("/gallery", galleryRoutes);
router.use("/achievements", achievementRoutes);
router.use("/faq", faqRoutes);
router.use("/testimonials", testimonialRoutes);
router.use("/contact", contactRoutes);
router.use("/newsletter", newsletterRoutes);
router.use("/resume", resumeRoutes);
router.use("/site-settings", siteSettingRoutes);
router.use("/admin", adminRoutes);

export default router;
