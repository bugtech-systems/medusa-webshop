// models/Touchpoint.ts
import mongoose, { Document, Schema, Model } from "mongoose";

export interface ITouchpoint extends Document {
    action: string;
    timestamp: Date;
    resourceId: mongoose.Types.ObjectId;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const touchpointSchema: Schema<ITouchpoint> = new mongoose.Schema(
    {
        action: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        resourceId: {
            type: Schema.Types.ObjectId,
            ref: "ResourceTag",
            required: true,
        },
        notes: { type: String },
    },
    { timestamps: true }
);

const Touchpoint: Model<ITouchpoint> =
    mongoose.models.Touchpoint || mongoose.model<ITouchpoint>("Touchpoint", touchpointSchema);

export default Touchpoint;
