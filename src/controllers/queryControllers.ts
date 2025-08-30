import { Request, Response } from "express";
import  QueryService  from "../services/queryService";

export class queryController {
  static async query(req: Request, res: Response): Promise<void> {
    try {
      const result = await QueryService.query(req.body);
      console.log(result);
      res.status(200).json({ message: "Query Added successfully", result });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  }
}
