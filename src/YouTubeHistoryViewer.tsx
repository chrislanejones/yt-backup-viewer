import { useState, useRef } from "react";
import { useMutation, useQuery, usePaginatedQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

export function YouTubeHistoryViewer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [showRemoved, setShowRemoved] = useState(false);
  const [showTimeline, setShowTimeline] = useState(true);
  const [contentTypeFilter, setContentTypeFilter] = useState("");
  const [currentContentType, setCurrentContentType] = useState("History");
  const [yearFilter, setYearFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importVideos = useMutation(api.videos.importVideos);
  const channels = useQuery(api.videos.getChannels) || [];
  const videoCount = useQuery(api.videos.getVideoCount) || 0;
  const removedVideoCount = useQuery(api.videos.getRemovedVideoCount) || 0;
  const timeline = useQuery(api.videos.getTimeline) || [];

  const {
    results: videos,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.videos.searchVideos,
    {
      searchQuery: searchQuery.trim() || undefined,
      channelFilter: channelFilter || undefined,
      dateFilter: dateFilter || undefined,
      showRemoved: showRemoved || undefined,
      contentTypeFilter: contentTypeFilter || undefined,
      yearFilter: yearFilter || undefined,
      monthFilter: monthFilter || undefined,
    },
    { initialNumItems: 20 }
  );

  const detectContentType = (filename: string): string => {
    const lower = filename.toLowerCase();
    if (lower.includes("history")) return "History";
    if (lower.includes("likes") || lower.includes("liked")) return "Likes";
    if (lower.includes("watch-later") || lower.includes("watchlater"))
      return "Watch Later";
    return "History"; // default
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!Array.isArray(data)) {
        throw new Error("Invalid JSON format - expected an array");
      }

      // Detect content type from filename
      const detectedType = detectContentType(file.name);
      setCurrentContentType(detectedType);

      const result = await importVideos({ videos: data, contentType: detectedType });
      
      if (result.added === 0 && result.updated === 0) {
        toast.info(
          `No new videos to import - all ${data.length} ${detectedType.toLowerCase()} videos already exist.`
        );
      } else {
        const messages = [];
        if (result.added > 0) messages.push(`${result.added} new`);
        if (result.updated > 0) messages.push(`${result.updated} updated`);
        
        toast.success(
          `Successfully imported ${result.imported} ${detectedType.toLowerCase()} videos (${messages.join(', ')})!`
        );
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import videos. Please check the JSON format.");
    }
  };

  const openVideo = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDayHeader = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatMonthName = (monthString: string) => {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const monthNum = parseInt(monthString.split("-")[1]) - 1;
    return monthNames[monthNum] || monthString.split("-")[1];
  };

  const clearFilters = () => {
    setSearchQuery("");
    setChannelFilter("");
    setDateFilter("");
    setShowRemoved(false);
    setYearFilter("");
    setMonthFilter("");
  };

  // Group videos by date
  const groupVideosByDate = (videos: any[]) => {
    const groups = new Map<string, any[]>();

    videos.forEach((video) => {
      const date =
        video.parsedDate || video.viewDate || video.scrapedAt.split("T")[0];
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)!.push(video);
    });

    // Convert to array and sort by date descending
    return Array.from(groups.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, videos]) => ({ date, videos }));
  };

  const videoGroups = groupVideosByDate(videos);

  return (
    <div className="flex gap-6 h-full">
      {/* Main Content */}
      <div className={`flex-1 space-y-6 ${showTimeline ? "pr-6" : ""}`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-100">
              Your YouTube {contentTypeFilter || "Content"}
            </h1>
            <p className="text-gray-400 mt-1">
              <span className="text-emerald-400 font-medium">{videoCount}</span>{" "}
              videos total
              {removedVideoCount > 0 && (
                <span className="text-red-600 ml-2">
                  •{" "}
                  <span className="text-red-400 font-medium">
                    {removedVideoCount}
                  </span>{" "}
                  removed
                </span>
              )}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowTimeline(!showTimeline)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              {showTimeline ? "Hide Timeline" : "Show Timeline"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={(e) => void handleFileUpload(e)}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Import JSON
            </button>
            <select
              value={contentTypeFilter}
              onChange={(e) => setContentTypeFilter(e.target.value)}
              className="px-4 py-2 bg-gray-800 text-gray-100 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-32"
            >
              <option value="">All Content</option>
              <option value="History">History</option>
              <option value="Likes">Likes</option>
              <option value="Watch Later">Watch Later</option>
            </select>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 text-gray-100 placeholder-gray-500 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="sm:w-64">
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="w-full px-4 py-2 !bg-gray-800 !text-gray-100 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Channels</option>
                {channels.map((channel) => (
                  <option key={channel} value={channel}>
                    {channel}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap gap-2 items-center">
            {removedVideoCount > 0 && (
              <button
                onClick={() => setShowRemoved(!showRemoved)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  showRemoved
                    ? "bg-red-100 text-red-800 border border-red-300"
                    : "bg-gray-800 text-gray-700 border border-gray-600 hover:bg-red-900"
                }`}
              >
                {showRemoved
                  ? "Showing Removed Videos"
                  : `Show Removed (${removedVideoCount})`}
              </button>
            )}

            {dateFilter && (
              <div className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                <span>Date: {formatDate(dateFilter)}</span>
                <button
                  onClick={() => setDateFilter("")}
                  className="ml-1 hover:bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            )}

            {yearFilter && (
              <div className="flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm">
                <span>Year: {yearFilter}</span>
                <button
                  onClick={() => setYearFilter("")}
                  className="ml-1 hover:bg-emerald-200 rounded-full w-4 h-4 flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            )}

            {monthFilter && (
              <div className="flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                <span>
                  Month: {formatMonthName(monthFilter)}{" "}
                  {monthFilter.split("-")[0]}
                </span>
                <button
                  onClick={() => setMonthFilter("")}
                  className="ml-1 hover:bg-purple-200 rounded-full w-4 h-4 flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            )}

            {(searchQuery ||
              channelFilter ||
              dateFilter ||
              showRemoved ||
              yearFilter ||
              monthFilter) && (
              <button
                onClick={clearFilters}
                className="px-3 py-1 text-sm text-gray-400 hover:text-gray-200 underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* Video Groups */}
        {videos.length === 0 && status === "LoadingFirstPage" ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              {videoCount === 0
                ? "No videos imported yet. Upload your YouTube history JSON file to get started."
                : showRemoved
                  ? "No removed videos found."
                  : "No videos found matching your search criteria."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {videoGroups.map(({ date, videos: dayVideos }) => (
              <div key={date} className="space-y-4">
                {/* Day Header */}
                <div className="w-full">
                  <h2 className="text-xl font-semibold text-gray-200 pb-2 border-b border-gray-700">
                    {formatDayHeader(date)}
                  </h2>
                </div>

                {/* Videos Grid for this day */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {dayVideos.map((video) => (
                    <div
                      key={video._id}
                      className={`bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer ${
                        video.isRemoved
                          ? "opacity-60 border-2 border-red-200"
                          : ""
                      }`}
                      onClick={() => openVideo(video.url)}
                    >
                      <div
                        key={video._id}
                        className="bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => openVideo(video.url)}
                      >
                        {/* Thumbnail container */}
                        <div className="aspect-video bg-gray-700 relative overflow-hidden">
                          <img
                            src={
                              video.thumbnail
                                ?.replace(/i\d\.ytimg\.com/, "i.ytimg.com")
                                ?.replace(
                                  /\/hqdefault_custom_\d+\.jpg.*/,
                                  "/mqdefault.jpg"
                                ) ||
                              `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`
                            }
                            alt={video.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                              const fallback = (e.target as HTMLImageElement)
                                .closest(".aspect-video")
                                ?.querySelector(".fallback") as HTMLElement;
                              if (fallback) fallback.style.display = "flex";
                            }}
                          />

                          {/* Fallback placeholder */}
                          <div className="fallback absolute inset-0 hidden items-center justify-center bg-gray-700">
                            <svg
                              className="w-16 h-16 text-gray-500"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                            </svg>
                          </div>
                        </div>

                        {/* Info */}
                      </div>

                      <div className="p-4">
                        <h3 className="font-semibold text-gray-100 line-clamp-2 text-sm mb-2">
                          {video.title}
                        </h3>
                        <p className="text-gray-400 text-sm mb-1">
                          {video.channel}
                        </p>
                        {video.timeText && (
                          <p className="text-gray-500 text-xs">
                            {video.timeText}
                          </p>
                        )}
                        {video.duration && (
                          <p className="text-gray-500 text-xs">
                            {video.duration}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {status === "CanLoadMore" && (
              <div className="flex justify-center">
                <button
                  onClick={() => loadMore(20)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Load More
                </button>
              </div>
            )}

            {status === "LoadingMore" && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Timeline Sidebar */}
      {showTimeline && (
        <div className="w-80 bg-gray-800 rounded-lg shadow-md p-4 h-fit sticky top-4">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">Timeline</h3>

          {timeline.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No videos to display in timeline
            </p>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {timeline.map(({ year, count, months }) => (
                <div key={year} className="space-y-2">
                  {/* Year Button */}
                  <button
                    onClick={() =>
                      setYearFilter(year === yearFilter ? "" : year)
                    }
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      yearFilter === year
                        ? "bg-blue-600 border border-blue-500"
                        : "hover:bg-gray-700 border border-gray-700"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-100 text-lg">
                        {year}
                      </span>
                      <span className="text-sm text-emerald-400 bg-blue-900 px-2 py-1 rounded-full font-medium">
                        {count}
                      </span>
                    </div>
                  </button>

                  {/* Month Pills - always show */}
                  <div className="flex flex-wrap gap-1 pl-2 pt-2">
                    {months.map(({ month, count: _monthCount }) => (
                      <button
                        key={month}
                        onClick={() =>
                          setMonthFilter(month === monthFilter ? "" : month)
                        }
                        className={`px-2 py-1 rounded-full text-xs transition-colors ${
                          monthFilter === month
                            ? "bg-blue-500 text-white"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }`}
                      >
                        {formatMonthName(month)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
