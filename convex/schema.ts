import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  videos: defineTable({
    idx: v.number(),
    title: v.string(),
    url: v.string(),
    channel: v.string(),
    thumbnail: v.string(), // Always string from scrapers (can be empty)
    timeText: v.optional(v.string()),
    duration: v.optional(v.string()), // Always string from scrapers (can be empty)
    viewDate: v.optional(v.string()), // Can be "Unknown" or date string
    originalViewDate: v.optional(v.string()),
    sectionDate: v.optional(v.union(v.string(), v.null())), // Can be null from scrapers
    scrapedAt: v.string(),
    videoId: v.optional(v.string()),
    isWatched: v.optional(v.boolean()),
    parsedDate: v.optional(v.string()), // YYYY-MM-DD format for grouping
    userId: v.id("users"),
    isRemoved: v.optional(v.boolean()), // Track if video was removed
    lastSeen: v.optional(v.string()), // Last import where this video was seen
    contentType: v.optional(v.string()), // History, Likes, Watch Later
  })
    .index("by_user", ["userId"])
    .index("by_channel", ["channel"])
    .index("by_user_and_date", ["userId", "parsedDate"])
    .index("by_user_removed", ["userId", "isRemoved"])
    .index("by_user_and_url", ["userId", "url"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["channel", "userId"],
    }),
  
  imports: defineTable({
    userId: v.id("users"),
    importedAt: v.string(),
    videoCount: v.number(),
    importId: v.string(), // Unique identifier for each import
  })
    .index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});