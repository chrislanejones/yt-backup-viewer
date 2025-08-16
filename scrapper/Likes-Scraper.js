// YouTube History Scraper
// This script scrapes your YouTube watch history directly from the YouTube website
// Run this in the browser console while on YouTube's history page

(function() {
    'use strict';
    
    console.log('🎥 Starting YouTube History Scraper...');
    
    let allVideos = [];
    let isScrolling = false;
    
    function extractVideoData() {
        const videoElements = document.querySelectorAll('ytd-video-renderer');
        const videos = [];
        
        videoElements.forEach((element, index) => {
            try {
                const titleElement = element.querySelector('#video-title');
                const channelElement = element.querySelector('#channel-name a') || element.querySelector('#text a');
                const thumbnailElement = element.querySelector('img');
                const timeElement = element.querySelector('#metadata-line span:first-child');
                const durationElement = element.querySelector('.ytd-thumbnail-overlay-time-status-renderer span');
                
                if (titleElement && channelElement) {
                    const title = titleElement.textContent.trim();
                    const url = titleElement.href;
                    const channel = channelElement.textContent.trim();
                    const thumbnail = thumbnailElement ? thumbnailElement.src : '';
                    const timeText = timeElement ? timeElement.textContent.trim() : '';
                    const duration = durationElement ? durationElement.textContent.trim() : '';
                    
                    // Extract video ID from URL
                    const videoIdMatch = url.match(/[?&]v=([^&]+)/);
                    const videoId = videoIdMatch ? videoIdMatch[1] : '';
                    
                    // Convert relative time to approximate date
                    const viewDate = convertTimeToDate(timeText);
                    
                    videos.push({
                        idx: allVideos.length + index,
                        title,
                        url,
                        channel,
                        thumbnail,
                        timeText,
                        duration,
                        viewDate,
                        originalViewDate: timeText,
                        scrapedAt: new Date().toISOString(),
                        videoId,
                        isWatched: true
                    });
                }
            } catch (error) {
                console.warn('Error extracting video data:', error);
            }
        });
        
        return videos;
    }
    
    function convertTimeToDate(timeText) {
        if (!timeText) return new Date().toISOString().split('T')[0];
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // Handle different time formats
        if (timeText.includes('hour')) {
            const hours = parseInt(timeText.match(/(\d+)\s*hour/)?.[1] || '1');
            return new Date(now.getTime() - (hours * 60 * 60 * 1000)).toISOString().split('T')[0];
        } else if (timeText.includes('day')) {
            const days = parseInt(timeText.match(/(\d+)\s*day/)?.[1] || '1');
            return new Date(today.getTime() - (days * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
        } else if (timeText.includes('week')) {
            const weeks = parseInt(timeText.match(/(\d+)\s*week/)?.[1] || '1');
            return new Date(today.getTime() - (weeks * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
        } else if (timeText.includes('month')) {
            const months = parseInt(timeText.match(/(\d+)\s*month/)?.[1] || '1');
            const date = new Date(today);
            date.setMonth(date.getMonth() - months);
            return date.toISOString().split('T')[0];
        } else if (timeText.includes('year')) {
            const years = parseInt(timeText.match(/(\d+)\s*year/)?.[1] || '1');
            const date = new Date(today);
            date.setFullYear(date.getFullYear() - years);
            return date.toISOString().split('T')[0];
        }
        
        // Default to today if we can't parse
        return today.toISOString().split('T')[0];
    }
    
    function scrollAndCollect() {
        if (isScrolling) return;
        isScrolling = true;
        
        console.log(`📊 Currently collected ${allVideos.length} videos...`);
        
        // Extract current videos
        const newVideos = extractVideoData();
        const previousCount = allVideos.length;
        
        // Add new unique videos
        newVideos.forEach(video => {
            if (!allVideos.some(existing => existing.url === video.url)) {
                allVideos.push(video);
            }
        });
        
        const addedCount = allVideos.length - previousCount;
        console.log(`➕ Added ${addedCount} new videos (Total: ${allVideos.length})`);
        
        // Scroll down to load more content
        window.scrollTo(0, document.body.scrollHeight);
        
        // Wait for content to load, then continue
        setTimeout(() => {
            isScrolling = false;
            
            // Check if we've reached the end (no new videos loaded)
            if (addedCount === 0) {
                console.log('🏁 Reached end of history or no new videos found');
                finishScraping();
            } else {
                // Continue scrolling after a short delay
                setTimeout(scrollAndCollect, 2000);
            }
        }, 3000);
    }
    
    function finishScraping() {
        console.log(`✅ Scraping complete! Collected ${allVideos.length} videos`);
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `youtube-history-${allVideos.length}-${timestamp}.json`;
        
        // Download the JSON file
        downloadJSON(allVideos, filename);
        
        console.log(`📥 Downloaded: ${filename}`);
        console.log('🎉 You can now upload this file to the YouTube Backup Viewer!');
    }
    
    function downloadJSON(data, filename) {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // Add stop button to the page
    function addStopButton() {
        const stopButton = document.createElement('div');
        stopButton.innerHTML = `
            <div id="history-scraper-control" style="
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                background: #ff4444;
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                font-family: Arial, sans-serif;
                font-size: 14px;
                font-weight: bold;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                user-select: none;
            ">
                🛑 STOP SCRAPER (${allVideos.length} videos)
            </div>
        `;
        
        document.body.appendChild(stopButton);
        
        stopButton.onclick = function() {
            console.log('🛑 Scraping stopped by user');
            finishScraping();
            document.body.removeChild(stopButton);
        };
        
        // Update counter every 5 seconds
        const updateCounter = setInterval(() => {
            const control = document.getElementById('history-scraper-control');
            if (control) {
                control.textContent = `🛑 STOP SCRAPER (${allVideos.length} videos)`;
            } else {
                clearInterval(updateCounter);
            }
        }, 5000);
    }
    
    // Check if we're on the right page
    if (!window.location.href.includes('youtube.com/feed/history')) {
        alert('Please navigate to YouTube History page (youtube.com/feed/history) and run this script again.');
        return;
    }
    
    // Wait for page to load
    setTimeout(() => {
        console.log('🚀 Starting automatic scraping...');
        console.log('⚠️  This will scroll through your entire YouTube history');
        console.log('📱 You can stop at any time by clicking the red button that appears');
        
        addStopButton();
        scrollAndCollect();
    }, 2000);
    
})();