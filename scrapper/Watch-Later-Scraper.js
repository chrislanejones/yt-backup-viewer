// ==UserScript==
// @name         YouTube Watch-Later Scraper (600 cap)
// @namespace    https://example.com
// @version      1.0
// @description  Scrapes the first 600 videos from your YouTube “Watch later” playlist
// @author       You
// @match        https://www.youtube.com/playlist?list=WL*
// @grant        none
// ==/UserScript==

(async () => {
  const MAX_MINUTES = 10; // Increased time limit
  const MAX_VIDEOS = 600; // ⬅ hard stop
  const SCROLL_DELAY = 5000; // 5 s between scrolls
  const THUMBNAIL_WAIT = 2000; // Wait for thumbnails to load
  const CHECK_KEY = "__scraped";

  const rows = [];
  let stopNow = false;
  let boredMode = false;
  let currentSectionDate = null;
  let stopByLimit = false;

  console.log("🔍 YouTube WATCH-LATER Scraper (600-cap edition)");
  console.log("===============================================");
  console.log("⌨️  Controls:");
  console.log("   ESC - Stop scraping");
  console.log("   B   - BORED MODE: Skip waiting, get all data fast!");

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      stopNow = true;
      console.log("🛑 Scraping stopped by user");
    } else if (e.key.toLowerCase() === "b") {
      boredMode = true;
      console.log("🚀 BORED MODE ACTIVATED!");
    }
  });

  /* ---------- date parsing (unchanged) ---------- */
  const parseRelativeDate = (dateText) => {
    if (!dateText) return null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const text = dateText.toLowerCase().trim();

    if (text.includes("today")) return today.toISOString().split("T")[0];
    if (text.includes("yesterday")) {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      return d.toISOString().split("T")[0];
    }
    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const dayIndex = dayNames.findIndex((d) => text.includes(d));
    if (dayIndex !== -1) {
      const currentDay = now.getDay();
      let daysAgo = currentDay - dayIndex;
      if (daysAgo <= 0) daysAgo += 7;
      const target = new Date(today);
      target.setDate(target.getDate() - daysAgo);
      return target.toISOString().split("T")[0];
    }
    const daysMatch = text.match(/(\d+)\s*days?\s*ago/);
    if (daysMatch) {
      const d = new Date(today);
      d.setDate(d.getDate() - parseInt(daysMatch[1]));
      return d.toISOString().split("T")[0];
    }
    const weeksMatch = text.match(/(\d+)\s*weeks?\s*ago/);
    if (weeksMatch) {
      const d = new Date(today);
      d.setDate(d.getDate() - parseInt(weeksMatch[1]) * 7);
      return d.toISOString().split("T")[0];
    }
    const monthsMatch = text.match(/(\d+)\s*months?\s*ago/);
    if (monthsMatch) {
      const d = new Date(today);
      d.setMonth(d.getMonth() - parseInt(monthsMatch[1]));
      return d.toISOString().split("T")[0];
    }
    const yearsMatch = text.match(/(\d+)\s*years?\s*ago/);
    if (yearsMatch) {
      const d = new Date(today);
      d.setFullYear(d.getFullYear() - parseInt(yearsMatch[1]));
      return d.toISOString().split("T")[0];
    }
    return dateText;
  };

  /* ---------- section-date helpers ---------- */
  const updateCurrentSectionDate = (videoNode) => {
    const itemSection = videoNode.closest("ytd-item-section-renderer");
    if (itemSection) {
      const sectionHeader = itemSection.querySelector(
        "ytd-item-section-header-renderer #title"
      );
      if (sectionHeader) {
        const headerText = sectionHeader.textContent.trim();
        if (headerText && headerText !== currentSectionDate) {
          currentSectionDate = headerText;
          const parsed = parseRelativeDate(headerText);
          if (!boredMode)
            console.log(`📅 New section: "${headerText}" → ${parsed}`);
          return { original: headerText, parsed };
        }
      }
    }
    return null;
  };

  /* ---------- video processing ---------- */
  const processVideoNode = (node) => {
    try {
      if (node[CHECK_KEY]) return;
      node[CHECK_KEY] = true;

      const titleLink = node.querySelector("a#video-title");
      const thumbnail = node.querySelector("img");
      const channelLink = node.querySelector("#channel-name a");

      if (!titleLink || !thumbnail || !channelLink) return;

      const title = titleLink.textContent.trim();
      const url = "https://www.youtube.com" + titleLink.getAttribute("href");
      const channel = channelLink.textContent.trim();

      const sectionDateInfo = updateCurrentSectionDate(node);

      let timeText = "";
      const durEl = node.querySelector(
        "#text.ytd-thumbnail-overlay-time-status-renderer"
      );
      if (durEl) timeText = durEl.textContent.trim();

      let viewDate = currentSectionDate || "Unknown";
      let parsedDate = parseRelativeDate(viewDate);
      if (sectionDateInfo) {
        viewDate = sectionDateInfo.original;
        parsedDate = sectionDateInfo.parsed;
      }

      const thumbnailSrc =
        thumbnail.src || thumbnail.getAttribute("data-src") || "";

      rows.push({
        idx: rows.length + 1,
        title,
        url,
        channel,
        thumbnail: thumbnailSrc,
        duration: timeText,
        viewDate: parsedDate || viewDate,
        originalViewDate: viewDate,
        sectionDate: currentSectionDate,
        scrapedAt: new Date().toISOString(),
        videoId: url.match(/[?&]v=([^&]+)/)?.[1] || "",
        isWatched: false,
      });

      if (boredMode && rows.length % 50 === 0) {
        console.log(
          `⚡ BORED MODE: ${rows.length} watch-later items processed...`
        );
      }
      return true;
    } catch (err) {
      if (!boredMode)
        console.error("❌ Error processing watch-later node:", err);
      return false;
    }
  };

  /* ---------- scrolling helpers ---------- */
  const processAllVisibleVideos = () => {
    const allVideos = document.querySelectorAll("ytd-playlist-video-renderer");
    let processed = 0;
    allVideos.forEach((v) => {
      if (!v[CHECK_KEY] && processVideoNode(v)) processed++;
    });
    return processed;
  };

  const boredModeScroll = async () => {
    const contNodes = document.querySelectorAll(
      "ytd-continuation-item-renderer"
    );
    contNodes.forEach((n) => {
      n.scrollIntoView();
      (n.querySelector("button") || n).click();
    });
    for (let i = 0; i < 10; i++) {
      window.scrollBy(0, 2000);
      await new Promise((r) => setTimeout(r, 100));
    }
    window.scrollTo(0, document.body.scrollHeight);
    return contNodes.length > 0;
  };

  const waitForThumbnails = async () => {
    if (boredMode) return;
    const imgs = [
      ...document.querySelectorAll(
        'img[src*="ytimg.com"], img[data-src*="ytimg.com"]'
      ),
    ].slice(-20);
    const loaded = await Promise.all(
      imgs.map(
        (img) =>
          new Promise((res) => {
            if (img.complete && img.naturalHeight) res(true);
            else {
              img.onload = () => res(true);
              img.onerror = () => res(false);
              setTimeout(() => res(false), 3000);
            }
          })
      )
    );
    await new Promise((r) => setTimeout(r, THUMBNAIL_WAIT));
  };

  const triggerContinuation = async () => {
    const contNodes = document.querySelectorAll(
      "ytd-continuation-item-renderer"
    );
    if (!contNodes.length) return false;
    if (boredMode) {
      contNodes.forEach((n) => {
        n.scrollIntoView();
        (n.querySelector("button") || n).click();
      });
      return true;
    }
    for (const n of contNodes) {
      n.scrollIntoView({ behavior: "smooth", block: "center" });
      await new Promise((r) => setTimeout(r, 1000));
      (n.querySelector("button") || n).click();
      await new Promise((r) => setTimeout(r, 1000));
    }
    return true;
  };

  /* ---------- MutationObserver ---------- */
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((m) =>
      m.addedNodes.forEach((n) => {
        if (n.nodeType !== Node.ELEMENT_NODE) return;
        if (n.matches("ytd-playlist-video-renderer")) processVideoNode(n);
        n.querySelectorAll("ytd-playlist-video-renderer").forEach(
          processVideoNode
        );
      })
    );
  });
  observer.observe(document.body, { childList: true, subtree: true });

  /* ---------- kickoff ---------- */
  const startTime = Date.now();
  let scrollPass = 0;
  let consecutiveNoNewVideos = 0;

  console.log("🚀 Starting Watch-Later scraping...");

  while (!stopNow && Date.now() - startTime < MAX_MINUTES * 60000) {
    if (rows.length >= MAX_VIDEOS) {
      stopByLimit = true;
      console.log(
        `🛑 Reached ${MAX_VIDEOS} watch-later videos – stopping early.`
      );
      break;
    }

    scrollPass++;
    const beforeCount = rows.length;

    if (boredMode) {
      console.log(
        `⚡ BORED MODE - Pass ${scrollPass} - Watch-Later: ${rows.length}`
      );
      const processed = processAllVisibleVideos();
      const cont = await boredModeScroll();
      if (cont) await new Promise((r) => setTimeout(r, 1000));
      if (processed === 0 && ++consecutiveNoNewVideos >= 3) break;
    } else {
      console.log(`📜 Scroll pass ${scrollPass} - Watch-Later: ${rows.length}`);
      await waitForThumbnails();
      await triggerContinuation();
      window.scrollBy(0, Math.min(1000, window.innerHeight));
      await new Promise((r) => setTimeout(r, SCROLL_DELAY));
      document
        .querySelectorAll("ytd-playlist-video-renderer:not([__scraped])")
        .forEach(processVideoNode);
      if (rows.length === beforeCount && ++consecutiveNoNewVideos >= 5) break;
    }
  }

  observer.disconnect();
  document
    .querySelectorAll("ytd-playlist-video-renderer:not([__scraped])")
    .forEach(processVideoNode);

  /* download */
  const blob = new Blob([JSON.stringify(rows, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `youtube-watchlater-${rows.length}-${new Date().toISOString().split("T")[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);

  console.log("\n📋 Watch-Later scraping complete!");
  console.log(`✅ Total watch-later items collected: ${rows.length}`);
})();
