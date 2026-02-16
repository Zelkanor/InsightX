"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Watchlist } from "@/database/models/watchlist.model";
import { connectToDatabase } from "@/database/mongoose";
import { auth } from "@/lib/better-auth/auth";
import { getStocksDetails } from "./finnhub.action";

/**
 * Get the authenticated user's ObjectId or redirect to sign-in.
 * better-auth stores `_id` as ObjectId, but `session.user.id` is a string.
 */
export const getAuthUserId = async (): Promise<string> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) redirect("/sign-in");
  return session.user.id;
};

/**
 * Get all watchlist symbols for a user by email.
 * Used by Inngest cron jobs — no session required.
 */
export const getWatchlistSymbolsByEmail = async (
  email: string,
): Promise<string[]> => {
  if (!email) return [];

  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection not found");

    const user = await db
      .collection("user")
      .findOne<{ _id?: unknown; id?: string; email?: string }>({ email });

    if (!user) return [];

    const userId = (user.id as string) || String(user._id || "");
    if (!userId) return [];

    const items = await Watchlist.find({ userId }, { symbol: 1 }).lean();
    return items.map((i) => String(i.symbol));
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("getWatchlistSymbolsByEmail error:", err);
    }

    return [];
  }
};

/**
 * Check if a symbol is in the authenticated user's watchlist.
 */
export const isInWatchlist = async (symbol: string): Promise<boolean> => {
  try {
    await connectToDatabase();
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) return false;

    const userId = session.user.id;

    const doc = await Watchlist.findOne({
      userId,
      "items.symbol": symbol.toUpperCase(),
    }).lean();

    return !!doc;
  } catch {
    return false;
  }
};

/**
 * Add stock to watchlist
 */
export const addToWatchlist = async (symbol: string, company: string) => {
  try {
    await connectToDatabase();
    const userId = await getAuthUserId();

    // Check if stock already exists in watchlist
    const existingItem = await Watchlist.findOne({
      userId,
      "items.symbol": symbol.toUpperCase(),
    }).lean();

    if (existingItem) {
      return { success: false, error: "Stock already in watchlist" };
    }

    // Upsert: create doc if first stock, push into items array
    await Watchlist.findOneAndUpdate(
      { userId },
      {
        $push: {
          items: {
            symbol: symbol.toUpperCase(),
            companyName: company.trim(),
            addedAt: new Date(),
          },
        },
      },
      { upsert: true, returnDocument: "after", runValidators: true },
    );

    revalidatePath("/watchlist");
    return { success: true, message: "Stock added to watchlist" };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error adding to watchlist:", error);
    }

    // Surface the Mongoose validation message (e.g. "Watchlist cannot exceed 120 stocks")
    if (error instanceof mongoose.Error.ValidationError) {
      const firstMessage = Object.values(error.errors)[0]?.message;
      return { success: false, error: firstMessage || "Validation failed" };
    }

    return { success: false, error: "Failed to add stock to watchlist" };
  }
};

/**
 * Remove stock from watchlist
 */
export const removeFromWatchlist = async (symbol: string) => {
  try {
    await connectToDatabase();
    const userId = await getAuthUserId();

    await Watchlist.findOneAndUpdate(
      { userId },
      { $pull: { items: { symbol: symbol.toUpperCase() } } },
    );
    revalidatePath("/watchlist");

    return { success: true, message: "Stock removed from watchlist" };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error removing from watchlist:", error);
    }
    return { success: false, error: "Failed to remove stock from watchlist" };
  }
};

// Get user's watchlist
export const getUserWatchlist = async () => {
  try {
    await connectToDatabase();
    const userId = await getAuthUserId();

    const doc = await Watchlist.findOne({ userId }).lean();
    if (!doc?.items?.length) return [];

    // Sort by most recently added first
    const sorted = [...doc.items].sort(
      (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime(),
    );

    return JSON.parse(JSON.stringify(sorted));
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching watchlist:", error);
    }
    throw new Error("Failed to fetch watchlist");
  }
};

// Get user's watchlist with stock data
export const getWatchlistWithData = async () => {
  try {
    await connectToDatabase();
    const userId = await getAuthUserId();

    const doc = await Watchlist.findOne({ userId }).lean();
    if (!doc?.items?.length) return [];

    // Sort by most recently added first
    const sorted = [...doc.items].sort(
      (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime(),
    );

    const stocksWithData = await Promise.all(
      sorted.map(async (item) => {
        const stockData = await getStocksDetails(item.symbol);

        // Fallback if Finnhub data is unavailable
        if (!stockData) {
          return {
            symbol: item.symbol,
            companyName: item.companyName,
            addedAt: item.addedAt,
            currentPrice: null,
            priceFormatted: "N/A",
            changeFormatted: "N/A",
            changePercent: null,
            marketCap: "N/A",
            peRatio: null,
          };
        }

        return {
          company: stockData.company,
          symbol: stockData.symbol,
          currentPrice: stockData.currentPrice,
          priceFormatted: stockData.priceFormatted,
          changeFormatted: stockData.changeFormatted,
          changePercent: stockData.changePercent,
          marketCap: stockData.marketCapFormatted,
          peRatio: stockData.peRatio,
          addedAt: item.addedAt,
        };
      }),
    );

    return JSON.parse(JSON.stringify(stocksWithData));
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error loading watchlist:", error);
    }
    throw new Error("Failed to fetch watchlist");
  }
};
