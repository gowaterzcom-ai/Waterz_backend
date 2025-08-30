import mongoose from "mongoose";

export interface IQuery extends mongoose.Document {
    name: string;
    email: string;
    message: string;
    messageResponse?: string;
}

const querySchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
    messageResponse: { type: String, required: false },
});

const Query = mongoose.model<IQuery>("Query", querySchema);
export default Query;