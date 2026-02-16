import mongoose, { type Document, Schema, type Types } from "mongoose";

export type AlertCondition = "above" | "below";
export type AlertFrequency =
  | "once"
  | "once_per_minute"
  | "once_per_hour"
  | "once_per_day";

export interface IAlert extends Document {
  userId: Types.ObjectId;
  symbol: string;
  companyName: string;
  condition: AlertCondition;
  targetPrice: number;
  frequency: AlertFrequency;
  isActive: boolean;
  lastTriggeredAt: Date | null;
  triggerCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const AlertSchema = new Schema<IAlert>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    symbol: {
      type: String,
      required: [true, "Stock symbol is required"],
      uppercase: true,
      trim: true,
      maxlength: [10, "Symbol cannot exceed 10 characters"],
    },
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      maxlength: [200, "Company name cannot exceed 200 characters"],
    },
    condition: {
      type: String,
      enum: {
        values: ["above", "below"],
        message: "Condition must be either 'above' or 'below'",
      },
      required: [true, "Alert condition is required"],
    },
    targetPrice: {
      type: Number,
      required: [true, "Target price is required"],
      min: [0.01, "Target price must be greater than 0"],
    },
    frequency: {
      type: String,
      enum: {
        values: ["once", "once_per_minute", "once_per_hour", "once_per_day"],
        message: "Invalid alert frequency",
      },
      default: "once_per_day",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastTriggeredAt: {
      type: Date,
      default: null,
    },
    triggerCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    collection: "alerts",
  },
);

// User's alerts list — used by getUserAlerts()
AlertSchema.index({ userId: 1, isActive: 1 });

// Cron job lookup — "all active alerts for AAPL across all users"
AlertSchema.index({ isActive: 1, symbol: 1 });

// Prevent exact duplicate alerts (same user, symbol, condition, target)
AlertSchema.index(
  { userId: 1, symbol: 1, condition: 1, targetPrice: 1 },
  { unique: true },
);

export const Alert =
  mongoose.models.Alert || mongoose.model<IAlert>("Alert", AlertSchema);
