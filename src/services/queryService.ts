import {IQuery} from "../models/Query";
import Query from "../models/Query";


class QueryService{
    static async query(body: IQuery): Promise<void> {
        try {
            const query = new Query(body);
            await query.save();
        } catch (error) {
            throw new Error("Error adding query: " + (error as Error).message);
        }
    }
}

export default QueryService;