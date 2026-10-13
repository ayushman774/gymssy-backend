import { Router } from "express";
import { getStates } from "../../controllers/cities/state.controller.js";
const router = Router();
router.get("/", getStates);
export default router;
