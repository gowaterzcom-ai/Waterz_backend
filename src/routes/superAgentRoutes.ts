import express from "express";
import authenticateToken, { authenticateAdmin, authenticateSuperAgent } from "../middleware/authMiddleware";
import { userController } from "../controllers/userController";
import { YatchController } from "../controllers/yachtController";

const router = express.Router();


router.get("/me", authenticateToken, authenticateSuperAgent,userController.meSuperAgent);
router.post("/updateProfile",authenticateToken,authenticateSuperAgent, userController.updateSuperAgentProfile);
router.get("/list-All-Yatchs", authenticateToken, authenticateSuperAgent,YatchController.listAll);
router.post("/create-refferal", authenticateToken, authenticateSuperAgent,userController.agentnRefferal);
router.get("/list-all-agent", authenticateToken, authenticateSuperAgent,userController.listAllAgent);
router.get("/agent-detail/:id", authenticateToken, authenticateSuperAgent,userController.AgentDetail);
router.post("/updateProfile", authenticateToken, authenticateSuperAgent,userController.updateSuperAgentProfile);
router.delete("/remove-agent/:id", authenticateToken, authenticateSuperAgent,userController.deleteAgent);
router.post("/list-filtered-agent", authenticateToken, authenticateSuperAgent,userController.listFilteredAgent);
router.post("/list-filtered-earnings", authenticateToken, authenticateSuperAgent,userController.listFilteredEarnings);
router.get("/topYatch",YatchController.topYatch)
router.get("/listAll", YatchController.listAll);

export default router;
