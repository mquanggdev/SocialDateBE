import express, { Request } from "express";
import multer, { FileFilterCallback } from "multer";
import * as controller from "../../controllers/clients/profiles.controller";
import { authMiddleware } from "../../middlewares/client/auth.middleware";
import { uploadSingle } from "../../middlewares/client/uploadSingle.middleware";

const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = express.Router();

router.get("/me", authMiddleware, controller.profileGET);
router.patch(
  "/edit",
  authMiddleware,
  upload.single("avatar_url"),
  uploadSingle,
  controller.profileUPDATE
);
export const profileRoute = router;
