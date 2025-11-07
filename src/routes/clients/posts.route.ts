import express from "express";
const router = express.Router();
import { uploadSingleImage } from "../../middlewares/client/multer.middleware";
import * as controller from "../../controllers/clients/posts.controller";
import { authMiddleware } from "../../middlewares/client/auth.middleware";



router.get("/", authMiddleware, controller.getPosts);
router.post("/create-post", authMiddleware, uploadSingleImage("image_url"),  controller.createPost);
router.patch("/:postId", authMiddleware, controller.deletePost);
export const postsRoutes = router;
