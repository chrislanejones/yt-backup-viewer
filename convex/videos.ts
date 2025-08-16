import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";

function parseScrapedDate(scrapedAt: string, viewDate?: string): string {
  // Prefer viewDate if available, otherwise parse scrapedAt
  if (viewDate) {
    return viewDate;
  }
  try {
    const date = new Date(scrapedAt);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

export const importVideos = mutation({
  args: {
    videos: v.array(
      v.object({
        idx: v.number(),
        title: v.string(),
        url: v.string(),
        channel: v.string(),
        thumbnail: v.string(),
        timeText: v.optional(v.string()),
        duration: v.optional(v.string()),
        viewDate: v.optional(v.string()),
        originalViewDate: v.optional(v.string()),
        sectionDate: v.optional(v.string()),
        scrapedAt: v.string(),
        videoId: v.optional(v.string()),
        isWatched: v.optional(v.boolean()),
      })
    ),
    contentType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to import videos");
    }

    const importId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const importedAt = new Date().toISOString();

    // Get existing videos for this content type to track removals and avoid duplicates
    const contentType = args.contentType || "History";
    const existingVideos = await ctx.db
      .query("videos")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("contentType"), contentType))
      .collect();

    // Create a map of existing videos by URL for quick lookup
    const existingVideoMap = new Map(existingVideos.map(v => [v.url, v]));
    const newVideoUrls = new Set(args.videos.map(v => v.url));

    // Mark videos as removed if they're not in the new import for this content type
    for (const existingVideo of existingVideos) {
      if (!newVideoUrls.has(existingVideo.url) && !existingVideo.isRemoved) {
        await ctx.db.patch(existingVideo._id, {
          isRemoved: true,
        });
      }
    }

    // Process new videos and avoid duplicates within the same content type
    let addedCount = 0;
    let updatedCount = 0;
    
    for (const video of args.videos) {
      const parsedDate = parseScrapedDate(video.scrapedAt, video.viewDate);
      const existingVideo = existingVideoMap.get(video.url);

      if (existingVideo) {
        // Update existing video with latest data
        await ctx.db.patch(existingVideo._id, {
          ...video,
          parsedDate,
          lastSeen: importId,
          isRemoved: false, // Mark as not removed since it's in current import
          contentType: contentType,
        });
        updatedCount++;
      } else {
        // Check if this URL exists for a different content type
        const existingVideoOtherType = await ctx.db
          .query("videos")
          .withIndex("by_user_and_url", (q) => q.eq("userId", userId).eq("url", video.url))
          .first();
        
        if (existingVideoOtherType && existingVideoOtherType.contentType !== contentType) {
          // Video exists with different content type, insert as new entry
          await ctx.db.insert("videos", {
            ...video,
            parsedDate,
            userId,
            lastSeen: importId,
            isRemoved: false,
            contentType: contentType,
          });
          addedCount++;
        } else if (!existingVideoOtherType) {
          // Completely new video
          await ctx.db.insert("videos", {
            ...video,
            parsedDate,
            userId,
            lastSeen: importId,
            isRemoved: false,
            contentType: contentType,
          });
          addedCount++;
        }
      }
    }

    // Record the import
    await ctx.db.insert("imports", {
      userId,
      importedAt,
      videoCount: args.videos.length,
      importId,
    });

    return { 
      imported: args.videos.length,
      added: addedCount,
      updated: updatedCount,
      contentType: contentType
    };
  },
});

export const searchVideos = query({
  args: {
    searchQuery: v.optional(v.string()),
    channelFilter: v.optional(v.string()),
    dateFilter: v.optional(v.string()),
    showRemoved: v.optional(v.boolean()),
    contentTypeFilter: v.optional(v.string()),
    yearFilter: v.optional(v.string()),
    monthFilter: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to search videos");
    }

    if (args.searchQuery && args.searchQuery.trim()) {
      // Use search index for text search
      let query = ctx.db
        .query("videos")
        .withSearchIndex("search_title", (q) => {
          let searchQuery = q.search("title", args.searchQuery!).eq("userId", userId);
          if (args.channelFilter) {
            searchQuery = searchQuery.eq("channel", args.channelFilter);
          }
          return searchQuery;
        });
      
      return await query.paginate(args.paginationOpts);
    } else {
      // Use regular index for non-search queries
      let query = ctx.db
        .query("videos")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc");

      // Apply filters
      if (args.channelFilter || args.dateFilter || args.showRemoved !== undefined || args.contentTypeFilter || args.yearFilter || args.monthFilter) {
        const videos = await ctx.db
          .query("videos")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect();

        let filteredVideos = videos;

        if (args.channelFilter) {
          filteredVideos = filteredVideos.filter(v => v.channel === args.channelFilter);
        }

        if (args.dateFilter) {
          filteredVideos = filteredVideos.filter(v => v.parsedDate === args.dateFilter);
        }

        if (args.showRemoved !== undefined) {
          filteredVideos = filteredVideos.filter(v => !!v.isRemoved === args.showRemoved);
        }

        if (args.contentTypeFilter) {
          filteredVideos = filteredVideos.filter(v => v.contentType === args.contentTypeFilter);
        }

        if (args.yearFilter) {
          filteredVideos = filteredVideos.filter(v => {
            const date = v.parsedDate || parseScrapedDate(v.scrapedAt, v.viewDate);
            return date.startsWith(args.yearFilter!);
          });
        }

        if (args.monthFilter) {
          filteredVideos = filteredVideos.filter(v => {
            const date = v.parsedDate || parseScrapedDate(v.scrapedAt, v.viewDate);
            return date.startsWith(args.monthFilter!);
          });
        }

        // Sort by creation time descending
        filteredVideos.sort((a, b) => b._creationTime - a._creationTime);

        // Manual pagination
        const { numItems, cursor } = args.paginationOpts;
        const startIndex = cursor ? parseInt(cursor) : 0;
        const endIndex = startIndex + numItems;
        const page = filteredVideos.slice(startIndex, endIndex);
        const isDone = endIndex >= filteredVideos.length;
        const continueCursor = isDone ? "" : endIndex.toString();

        return { page, isDone, continueCursor };
      }

      return await query.paginate(args.paginationOpts);
    }
  },
});

export const getChannels = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const videos = await ctx.db
      .query("videos")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.neq(q.field("isRemoved"), true))
      .collect();

    const channels = [...new Set(videos.map((v) => v.channel))].sort();
    return channels;
  },
});

export const getVideoCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return 0;
    }

    const videos = await ctx.db
      .query("videos")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.neq(q.field("isRemoved"), true))
      .collect();

    return videos.length;
  },
});

export const getRemovedVideoCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return 0;
    }

    const removedVideos = await ctx.db
      .query("videos")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isRemoved"), true))
      .collect();

    return removedVideos.length;
  },
});

export const getTimeline = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const videos = await ctx.db
      .query("videos")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.neq(q.field("isRemoved"), true))
      .collect();

    // Group videos by year and month
    const yearGroups = new Map<string, { totalCount: number, months: Map<string, number> }>();
    
    for (const video of videos) {
      const date = video.parsedDate || parseScrapedDate(video.scrapedAt, video.viewDate);
      const year = date.split('-')[0];
      const month = date.substring(0, 7); // YYYY-MM format
      
      if (!yearGroups.has(year)) {
        yearGroups.set(year, { totalCount: 0, months: new Map() });
      }
      
      const yearData = yearGroups.get(year)!;
      yearData.totalCount += 1;
      yearData.months.set(month, (yearData.months.get(month) || 0) + 1);
    }

    // Convert to array and sort by year descending
    const timeline = Array.from(yearGroups.entries())
      .map(([year, data]) => ({
        year,
        count: data.totalCount,
        months: Array.from(data.months.entries())
          .map(([month, count]) => ({ month, count }))
          .sort((a, b) => b.month.localeCompare(a.month))
      }))
      .sort((a, b) => b.year.localeCompare(a.year));

    return timeline;
  },
});