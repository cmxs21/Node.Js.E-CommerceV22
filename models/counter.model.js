import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
    business: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Business",
        required: true,
        unique: true,
    },
    sequenceValue: {
        type: Number,
        required: true,
        default: 0,
    },
});

export default mongoose.model("Counter", counterSchema);