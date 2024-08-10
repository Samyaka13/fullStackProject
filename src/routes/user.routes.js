import { Router } from "express";
import {
  loginUser,
  logOutUser,
  refreshAccessToken,
  registerUser,
} from "../controllers/user.controllers.js";
import { upload } from "../middlewarers/multer.middlewar.js";
import { verifyJWT } from "../middlewarers/auth.middleware.js";
const router = Router();
router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),

  registerUser
);
router.route("/login").post(loginUser);
//secured routes
router.route("/logout").post(verifyJWT, /* oneMoreMiddleware, */ logOutUser); // the next() method used tells that now the next method should be running that is why we use next in the code of middleware
router.route("/refresh-token").post(refreshAccessToken);
export default router;
