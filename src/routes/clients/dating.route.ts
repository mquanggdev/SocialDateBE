// routes/dating.routes.ts
import { Router } from "express";
import { authMiddleware } from "../../middlewares/client/auth.middleware";
import {
  getDatingCandidates,
  likeUser,
  getCurrentMatchChat,
  acceptMatch,
  unlikeUser,
  rejectMatch,
  cancelDating,
} from "../../controllers/clients/dating.controller";

const router = Router();

router.get("/candidates", authMiddleware, getDatingCandidates);
router.post("/like", authMiddleware, likeUser);
router.post("/unlike", authMiddleware, unlikeUser);
router.get("/match-chat", authMiddleware, getCurrentMatchChat);
router.post("/accept", authMiddleware, acceptMatch);
router.post("/reject", authMiddleware, rejectMatch);
router.post("/cancel", authMiddleware, cancelDating);

export const datingRoute = router;