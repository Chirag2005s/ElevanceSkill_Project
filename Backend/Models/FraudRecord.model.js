const mongoose = require("mongoose");

const fraudRecordSchema = new mongoose.Schema(
    {
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            required: true,
            unique: true,
            index: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        riskScore: {
            type: Number,
            required: true,
            default: 0,
            index: true,
        },
        riskLevel: {
            type: String,
            enum: ["Low", "Medium", "High"],
            required: true,
            default: "Low",
            index: true,
        },
        reasons: {
            type: [String],
            default: [],
        },
        triggeredRules: [
            {
                ruleCode: { type: String },
                description: { type: String },
                scoreAdded: { type: Number },
            },
        ],
        status: {
            type: String,
            enum: ["clean", "pending_review", "approved", "rejected"],
            default: "pending_review",
            index: true,
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        reviewNote: {
            type: String,
            default: "",
        },
        reviewedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

fraudRecordSchema.index({ status: 1, riskScore: -1, createdAt: -1 });

module.exports = mongoose.models.FraudRecord || mongoose.model("FraudRecord", fraudRecordSchema);

