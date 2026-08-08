import { Router } from "express";
import { subscribeNewsletter } from "../controllers/contact.controller.js";

const router = Router();
router.post("/", subscribeNewsletter);

export default router;
