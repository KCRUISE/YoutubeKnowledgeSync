import { channels, videos, summaries, type Channel, type InsertChannel, type Video, type InsertVideo, type Summary, type InsertSummary, type ChannelWithStats, type SummaryWithDetails } from "@shared/schema";

export interface IStorage {
  // Channel operations
  getChannels(): Promise<Channel[]>;
  getChannelsWithStats(): Promise<ChannelWithStats[]>;
  getChannel(id: number): Promise<Channel | undefined>;
  getChannelByChannelId(channelId: string): Promise<Channel | undefined>;
  createChannel(channel: InsertChannel): Promise<Channel>;
  updateChannel(id: number, updates: Partial<InsertChannel>): Promise<Channel | undefined>;
  deleteChannel(id: number): Promise<boolean>;

  // Video operations
  getVideosByChannel(channelId: number): Promise<Video[]>;
  getVideo(id: number): Promise<Video | undefined>;
  getVideoByVideoId(videoId: string): Promise<Video | undefined>;
  createVideo(video: InsertVideo): Promise<Video>;
  getLatestVideos(limit?: number): Promise<Video[]>;

  // Summary operations
  getSummaries(): Promise<SummaryWithDetails[]>;
  getSummariesByChannel(channelId: number): Promise<SummaryWithDetails[]>;
  getSummary(id: number): Promise<Summary | undefined>;
  createSummary(summary: InsertSummary): Promise<Summary>;
  getLatestSummaries(limit?: number): Promise<SummaryWithDetails[]>;
  searchSummaries(query: string): Promise<SummaryWithDetails[]>;

  // Stats
  getStats(): Promise<{
    totalChannels: number;
    totalSummaries: number;
    newThisWeek: number;
    apiUsage: number;
  }>;
}

export class MemStorage implements IStorage {
  private channels: Map<number, Channel>;
  private videos: Map<number, Video>;
  private summaries: Map<number, Summary>;
  private currentChannelId: number;
  private currentVideoId: number;
  private currentSummaryId: number;

  constructor() {
    this.channels = new Map();
    this.videos = new Map();
    this.summaries = new Map();
    this.currentChannelId = 1;
    this.currentVideoId = 1;
    this.currentSummaryId = 1;
  }

  async getChannels(): Promise<Channel[]> {
    return Array.from(this.channels.values());
  }

  async getChannelsWithStats(): Promise<ChannelWithStats[]> {
    const channels = Array.from(this.channels.values());
    return channels.map(channel => {
      const channelVideos = Array.from(this.videos.values()).filter(v => v.channelId === channel.id);
      const channelSummaries = Array.from(this.summaries.values()).filter(s => s.channelId === channel.id);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const newVideos = channelVideos.filter(v => v.publishedAt > weekAgo);

      return {
        ...channel,
        videoCount: channelVideos.length,
        summaryCount: channelSummaries.length,
        newVideosCount: newVideos.length,
      };
    });
  }

  async getChannel(id: number): Promise<Channel | undefined> {
    return this.channels.get(id);
  }

  async getChannelByChannelId(channelId: string): Promise<Channel | undefined> {
    return Array.from(this.channels.values()).find(c => c.channelId === channelId);
  }

  async createChannel(insertChannel: InsertChannel): Promise<Channel> {
    const id = this.currentChannelId++;
    const channel: Channel = {
      ...insertChannel,
      id,
      createdAt: new Date(),
      thumbnailUrl: insertChannel.thumbnailUrl || null,
      frequency: insertChannel.frequency || "daily",
      isActive: insertChannel.isActive ?? true,
    };
    this.channels.set(id, channel);
    return channel;
  }

  async updateChannel(id: number, updates: Partial<InsertChannel>): Promise<Channel | undefined> {
    const channel = this.channels.get(id);
    if (!channel) return undefined;

    const updatedChannel = { ...channel, ...updates };
    this.channels.set(id, updatedChannel);
    return updatedChannel;
  }

  async deleteChannel(id: number): Promise<boolean> {
    const deleted = this.channels.delete(id);
    if (deleted) {
      // Also delete related videos and summaries
      Array.from(this.videos.entries()).forEach(([videoId, video]) => {
        if (video.channelId === id) {
          this.videos.delete(videoId);
        }
      });
      Array.from(this.summaries.entries()).forEach(([summaryId, summary]) => {
        if (summary.channelId === id) {
          this.summaries.delete(summaryId);
        }
      });
    }
    return deleted;
  }

  async getVideosByChannel(channelId: number): Promise<Video[]> {
    return Array.from(this.videos.values()).filter(v => v.channelId === channelId);
  }

  async getVideo(id: number): Promise<Video | undefined> {
    return this.videos.get(id);
  }

  async getVideoByVideoId(videoId: string): Promise<Video | undefined> {
    return Array.from(this.videos.values()).find(v => v.videoId === videoId);
  }

  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    const id = this.currentVideoId++;
    const video: Video = {
      ...insertVideo,
      id,
      thumbnailUrl: insertVideo.thumbnailUrl || null,
      description: insertVideo.description || null,
      duration: insertVideo.duration || null,
      viewCount: insertVideo.viewCount || null,
    };
    this.videos.set(id, video);
    return video;
  }

  async getLatestVideos(limit = 10): Promise<Video[]> {
    return Array.from(this.videos.values())
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
      .slice(0, limit);
  }

  async getSummaries(): Promise<SummaryWithDetails[]> {
    return this.getSummariesWithDetails(Array.from(this.summaries.values()));
  }

  async getSummariesByChannel(channelId: number): Promise<SummaryWithDetails[]> {
    const channelSummaries = Array.from(this.summaries.values()).filter(s => s.channelId === channelId);
    return this.getSummariesWithDetails(channelSummaries);
  }

  async getSummary(id: number): Promise<Summary | undefined> {
    return this.summaries.get(id);
  }

  async createSummary(insertSummary: InsertSummary): Promise<Summary> {
    const id = this.currentSummaryId++;
    const summary: Summary = {
      ...insertSummary,
      id,
      createdAt: new Date(),
      keyPoints: insertSummary.keyPoints || null,
      tags: insertSummary.tags || null,
    };
    this.summaries.set(id, summary);
    return summary;
  }

  async getLatestSummaries(limit = 10): Promise<SummaryWithDetails[]> {
    const latestSummaries = Array.from(this.summaries.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
    return this.getSummariesWithDetails(latestSummaries);
  }

  async searchSummaries(query: string): Promise<SummaryWithDetails[]> {
    const lowerQuery = query.toLowerCase();
    const matchingSummaries = Array.from(this.summaries.values()).filter(s =>
      s.title.toLowerCase().includes(lowerQuery) ||
      s.content.toLowerCase().includes(lowerQuery) ||
      (s.tags && s.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
    );
    return this.getSummariesWithDetails(matchingSummaries);
  }

  private async getSummariesWithDetails(summaries: Summary[]): Promise<SummaryWithDetails[]> {
    return summaries.map(summary => {
      const video = this.videos.get(summary.videoId);
      const channel = this.channels.get(summary.channelId);
      
      return {
        ...summary,
        channelName: channel?.name || "알 수 없는 채널",
        videoTitle: video?.title || "알 수 없는 비디오",
        videoUrl: video?.url || "",
        videoDuration: video?.duration || null,
        videoViewCount: video?.viewCount || null,
        videoPublishedAt: video?.publishedAt || new Date(),
      };
    });
  }

  async getStats(): Promise<{
    totalChannels: number;
    totalSummaries: number;
    newThisWeek: number;
    apiUsage: number;
  }> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const newThisWeek = Array.from(this.summaries.values()).filter(
      s => s.createdAt > weekAgo
    ).length;

    return {
      totalChannels: this.channels.size,
      totalSummaries: this.summaries.size,
      newThisWeek,
      apiUsage: Math.floor(Math.random() * 100), // Mock API usage percentage
    };
  }
}

export const storage = new MemStorage();
