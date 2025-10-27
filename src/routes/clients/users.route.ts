import express from "express";

const router = express.Router();

import * as controller from "../../controllers/clients/users.controller";
import { validateAuth } from "../../middlewares/client/validateAuth.middleware";
import { authMiddleware } from "../../middlewares/client/auth.middleware";

router.post("/login", validateAuth, controller.login);
router.post("/register", validateAuth, controller.register);
router.post("/password/forgot", controller.forgotPassword);
router.post("/password/otp", controller.enterOtp);
router.patch("/password/reset", controller.resetPassword);
router.get("/me",authMiddleware,controller.currentUser) ;
export const userRoutes = router;
