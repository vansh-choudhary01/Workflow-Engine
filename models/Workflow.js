import mongoose from 'mongoose';

const StepSchema = new mongoose.Schema({
    tool: {
        type: String,
        required: true
    }, 
    input: {
        type: Object,
        required: true
    },
    status: {
        type: String,
        enum: [
            "pending",
            "processing",
            "completed",
            "failed",
        ],
        default: "pending"
    },
    result: {
        type: Object,
        default: null
    },
    error: {
        type: String,
        default: null
    }
}, { _id: false });

const WorkflowSchema = new mongoose.Schema({
    userId: {
        type: Number,
        required: true
    },
    prompt: {
        type: String,
        required: true
    },
    steps: {
        type: [StepSchema],
        default: []
    },
    status: {
        type: String,
        enum: [
            "created",
            "waiting_approval",
            "processing",
            "completed",
            "failed",
            "rejected"
        ],
        default: "created"
    }
}, { timestemps: true });

export default mongoose.model("Workflow", WorkflowSchema);