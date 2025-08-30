import express from "express";
import { queryController } from "../controllers/queryControllers";
const router = express.Router();


router.post("/",queryController.query);


export default router;