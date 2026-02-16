"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { Alert, type IAlert } from "@/database/models/alerts.model";
import { connectToDatabase } from "@/database/mongoose";
import { getAuthUserId } from "./watchlist.action";

/**
 * Get all alerts for the authenticated user.
 */
export const getUserAlerts = async (): Promise<Alert[]> => {
  try {
    await connectToDatabase();
    const userId = await getAuthUserId();

    const alerts = await Alert.find({ userId })
      .sort({ createdAt: -1 })
      .lean<IAlert[]>();

    return JSON.parse(
      JSON.stringify(
        alerts.map((a) => ({
          id: String(a._id),
          symbol: a.symbol,
          companyName: a.companyName,
          condition: a.condition,
          threshold: a.targetPrice,
          frequency: a.frequency,
          isActive: a.isActive,
          createdAt: a.createdAt,
        })),
      ),
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching alerts:", error);
    }
    throw new Error("Failed to fetch alerts");
  }
};

/**
 * Create a new price alert.
 */
export const createAlert = async (data: {
  symbol: string;
  companyName: string;
  condition: "above" | "below";
  targetPrice: number;
  frequency?: string;
}) => {
  try {
    await connectToDatabase();
    const userId = await getAuthUserId();

    await Alert.create({
      userId,
      symbol: data.symbol.toUpperCase(),
      companyName: data.companyName.trim(),
      condition: data.condition,
      targetPrice: data.targetPrice,
      frequency: data.frequency || "once_per_day",
    });

    revalidatePath("/watchlist");
    return { success: true, message: "Alert created successfully" };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error creating alert:", error);
    }

    // Handle duplicate alert
    if (
      error instanceof mongoose.mongo.MongoServerError &&
      error.code === 11000
    ) {
      return {
        success: false,
        error: "An identical alert already exists for this stock.",
      };
    }

    if (error instanceof mongoose.Error.ValidationError) {
      const firstMessage = Object.values(error.errors)[0]?.message;
      return { success: false, error: firstMessage || "Validation failed" };
    }

    return { success: false, error: "Failed to create alert" };
  }
};

/**
 * Update an existing alert.
 */
export const updateAlert = async (
  alertId: string,
  data: {
    condition?: "above" | "below";
    targetPrice?: number;
    frequency?: string;
    isActive?: boolean;
  },
) => {
  try {
    await connectToDatabase();
    const userId = await getAuthUserId();

    const alert = await Alert.findOneAndUpdate(
      { _id: alertId, userId },
      { $set: data },
      { new: true, runValidators: true },
    );

    if (!alert) {
      return { success: false, error: "Alert not found" };
    }

    revalidatePath("/watchlist");
    return { success: true, message: "Alert updated successfully" };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error updating alert:", error);
    }

    if (error instanceof mongoose.Error.ValidationError) {
      const firstMessage = Object.values(error.errors)[0]?.message;
      return { success: false, error: firstMessage || "Validation failed" };
    }

    return { success: false, error: "Failed to update alert" };
  }
};

/**
 * Delete an alert.
 */
export const deleteAlert = async (alertId: string) => {
  try {
    await connectToDatabase();
    const userId = await getAuthUserId();

    const alert = await Alert.findOneAndDelete({ _id: alertId, userId });

    if (!alert) {
      return { success: false, error: "Alert not found" };
    }

    revalidatePath("/watchlist");
    return { success: true, message: "Alert deleted successfully" };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error deleting alert:", error);
    }
    return { success: false, error: "Failed to delete alert" };
  }
};
