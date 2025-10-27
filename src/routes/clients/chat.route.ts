import express from "express";

const router = express.Router();

import * as controller from "../../controllers/clients/chat.controller";
import { authMiddleware } from "../../middlewares/client/auth.middleware";



router.get("/list-recomendation", authMiddleware, controller.listFriends);

export const chatsRoutes = router;
