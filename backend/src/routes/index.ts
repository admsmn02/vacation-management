import { Router } from "express";
import authRouter from "./auth.routes";
import vacationRequestsRouter from "./vacation-requests.routes";

const router = Router();

router.use("/auth", authRouter);
router.use("/vacation-requests", vacationRequestsRouter);

router.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

export default router;
