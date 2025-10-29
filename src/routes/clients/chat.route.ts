import express from "express";

const router = express.Router();

import * as controller from "../../controllers/clients/chat.controller";
import { authMiddleware } from "../../middlewares/client/auth.middleware";



router.get("/rooms", authMiddleware, controller.getRoom);
router.get(`/message/:roomId`, authMiddleware, controller.getMessage);

export const chatsRoutes = router;
