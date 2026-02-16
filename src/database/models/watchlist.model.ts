import mongoose, { type Document, Schema, type Types } from "mongoose";

export interface IWatchlistItem {
  symbol: string;
  companyName: string;
  addedAt: Date;
}

export interface IWatchlist extends Document {
  userId: Types.ObjectId;
  items: IWatchlistItem[];
  createdAt: Date;
  updatedAt: Date;
}

const WatchlistItemSchema = new Schema<IWatchlistItem>(
  {
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
    addedAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  { _id: false },
);

const WatchlistSchema = new Schema<IWatchlist>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: [true, "User ID is required"],
      ref: "User",
      unique: true,
      index: true,
    },
    items: {
      type: [WatchlistItemSchema],
      default: [],
      validate: [
        {
          validator: (items: IWatchlistItem[]) => items.length <= 120,
          message: "Watchlist cannot exceed 120 stocks.",
        },
        {
          validator: (items: IWatchlistItem[]) => {
            // Prevent duplicate symbols within a single watchlist
            const symbols = items.map((item) => item.symbol);
            return new Set(symbols).size === symbols.length;
          },
          message: "Duplicate symbols are not allowed in the watchlist.",
        },
      ],
    },
  },
  {
    timestamps: true,
  },
);

WatchlistSchema.index({ userId: 1, "items.symbol": 1 });

export const Watchlist =
  mongoose.models.Watchlist ||
  mongoose.model<IWatchlist>("Watchlist", WatchlistSchema);
