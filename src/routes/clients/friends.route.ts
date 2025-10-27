import express from "express";

const router = express.Router();

import * as controller from "../../controllers/clients/friends.controller";
import { authMiddleware } from "../../middlewares/client/auth.middleware";



router.get("/list-recomendation", authMiddleware, controller.listRecomendation);
router.get("/list", authMiddleware, controller.listFriends);
router.get("/requests", authMiddleware, controller.listFriendRequests);
router.get("/sent-requests", authMiddleware, controller.listSentRequests);

export const friendsRoutes = router;
