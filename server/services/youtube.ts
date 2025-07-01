interface YouTubeVideoSnippet {
  title: string;
  description: string;
  publishedAt: string;
  thumbnails: {
    default: { url: string };
    medium: { url: string };
    high: { url: string };
  };
  channelId: string;
  channelTitle: string;
}

interface YouTubeVideo {
  id: string;
  snippet: YouTubeVideoSnippet;
  statistics: {
    viewCount: string;
  };
  contentDetails: {
    duration: string;
  };
}

interface YouTubeChannel {
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      default: { url: string };
      medium: { url: string };
      high: { url: string };
    };
  };
}

export class YouTubeService {
  private apiKey: string;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';

  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY || "";
    if (!this.apiKey) {
      throw new Error("YouTube API key is required. Set YOUTUBE_API_KEY or GOOGLE_API_KEY environment variable.");
    }
  }

  async getChannelInfo(channelUrl: string): Promise<{ channelId: string; name: string; thumbnailUrl: string } | null> {
    try {
      const channelId = await this.extractChannelId(channelUrl);
      if (!channelId) {
        throw new Error("유효하지 않은 채널 URL입니다.");
      }

      const response = await fetch(
        `${this.baseUrl}/channels?part=snippet&id=${channelId}&key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`YouTube API 오류: ${response.status}`);
      }

      const data = await response.json();
      if (!data.items || data.items.length === 0) {
        return null;
      }

      const channel: YouTubeChannel = data.items[0];
      return {
        channelId: channel.id,
        name: channel.snippet.title,
        thumbnailUrl: channel.snippet.thumbnails.medium?.url || channel.snippet.thumbnails.default?.url || "",
      };
    } catch (error) {
      console.error("YouTube 채널 정보 가져오기 실패:", error);
      throw error;
    }
  }

  async getLatestVideos(channelId: string, maxResults = 10): Promise<YouTubeVideo[]> {
    try {
      // First get the uploads playlist ID
      const channelResponse = await fetch(
        `${this.baseUrl}/channels?part=contentDetails&id=${channelId}&key=${this.apiKey}`
      );

      if (!channelResponse.ok) {
        throw new Error(`YouTube API 오류: ${channelResponse.status}`);
      }

      const channelData = await channelResponse.json();
      if (!channelData.items || channelData.items.length === 0) {
        return [];
      }

      const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

      // Get latest videos from uploads playlist
      const playlistResponse = await fetch(
        `${this.baseUrl}/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}&order=date&key=${this.apiKey}`
      );

      if (!playlistResponse.ok) {
        throw new Error(`YouTube API 오류: ${playlistResponse.status}`);
      }

      const playlistData = await playlistResponse.json();
      const videoIds = playlistData.items.map((item: any) => item.snippet.resourceId.videoId).join(',');

      if (!videoIds) {
        return [];
      }

      // Get detailed video information
      const videosResponse = await fetch(
        `${this.baseUrl}/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${this.apiKey}`
      );

      if (!videosResponse.ok) {
        throw new Error(`YouTube API 오류: ${videosResponse.status}`);
      }

      const videosData = await videosResponse.json();
      return videosData.items || [];
    } catch (error) {
      console.error("YouTube 비디오 목록 가져오기 실패:", error);
      throw error;
    }
  }

  async getVideoTranscript(videoId: string): Promise<string | null> {
    // Note: YouTube doesn't provide direct transcript API access
    // This would typically require using youtube-transcript-api via Python
    // For now, we'll return null and handle this limitation
    console.warn("비디오 스크립트 추출은 현재 구현되지 않았습니다. Python youtube-transcript-api가 필요합니다.");
    return null;
  }

  private async extractChannelId(url: string): Promise<string | null> {
    try {
      // Handle various YouTube channel URL formats
      const patterns = [
        // Direct channel ID format
        { pattern: /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/, isChannelId: true },
        // Handle format (@username)
        { pattern: /youtube\.com\/@([a-zA-Z0-9_.-]+)/, isChannelId: false },
        // Legacy custom URL formats
        { pattern: /youtube\.com\/c\/([a-zA-Z0-9_.-]+)/, isChannelId: false },
        { pattern: /youtube\.com\/user\/([a-zA-Z0-9_.-]+)/, isChannelId: false },
      ];

      for (const { pattern, isChannelId } of patterns) {
        const match = url.match(pattern);
        if (match) {
          const identifier = match[1];
          
          if (isChannelId) {
            // Direct channel ID, return as-is
            return identifier;
          } else {
            // Need to resolve username/handle to channel ID
            return await this.resolveUsernameToChannelId(identifier);
          }
        }
      }

      return null;
    } catch (error) {
      console.error("채널 ID 추출 실패:", error);
      return null;
    }
  }

  private async resolveUsernameToChannelId(username: string): Promise<string | null> {
    try {
      // First try the forUsername parameter (works for legacy custom URLs)
      let response = await fetch(
        `${this.baseUrl}/channels?part=snippet&forUsername=${username}&key=${this.apiKey}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          return data.items[0].id;
        }
      }

      // Search for channels by the handle name
      response = await fetch(
        `${this.baseUrl}/search?part=snippet&q=@${username}&type=channel&maxResults=10&key=${this.apiKey}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          // Try to find exact match first by looking for the handle in custom URL or title
          for (const item of data.items) {
            const customUrl = item.snippet.customUrl || '';
            const title = item.snippet.title || '';
            const description = item.snippet.description || '';
            
            // Check if the custom URL exactly matches the handle
            if (customUrl.toLowerCase() === `@${username.toLowerCase()}`) {
              return item.snippet.channelId;
            }
            
            // Check if the custom URL contains the handle
            if (customUrl.toLowerCase().includes(`@${username.toLowerCase()}`)) {
              return item.snippet.channelId;
            }
            
            // Check if title contains the exact username
            if (title.toLowerCase() === username.toLowerCase()) {
              return item.snippet.channelId;
            }
          }
          
          // If no exact match, return the first result
          return data.items[0].snippet.channelId;
        }
      }

      // Try searching without @ prefix as fallback
      response = await fetch(
        `${this.baseUrl}/search?part=snippet&q=${username}&type=channel&maxResults=5&key=${this.apiKey}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          return data.items[0].snippet.channelId;
        }
      }

      return null;
    } catch (error) {
      console.error("사용자명을 채널 ID로 변환 실패:", error);
      return null;
    }
  }

  parseDuration(duration: string): string {
    // Convert ISO 8601 duration (PT4M13S) to readable format
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return "알 수 없음";

    const hours = parseInt(match[1] || "0");
    const minutes = parseInt(match[2] || "0");
    const seconds = parseInt(match[3] || "0");

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
}
