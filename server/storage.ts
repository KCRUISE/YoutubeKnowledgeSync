import { channels, videos, summaries, type Channel, type InsertChannel, type Video, type InsertVideo, type Summary, type InsertSummary, type ChannelWithStats, type SummaryWithDetails } from "@shared/schema";
import { eq, desc, or, like, gte, sql } from "drizzle-orm";
import { db } from "./db";

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
  deleteVideo(id: number): Promise<boolean>;
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

  async deleteVideo(id: number): Promise<boolean> {
    const existed = this.videos.has(id);
    if (existed) {
      this.videos.delete(id);
      // Also delete any related summaries
      const summariesToDelete: number[] = [];
      this.summaries.forEach((summary, summaryId) => {
        if (summary.videoId === id) {
          summariesToDelete.push(summaryId);
        }
      });
      summariesToDelete.forEach(summaryId => {
        this.summaries.delete(summaryId);
      });
    }
    return existed;
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
      insights: insertSummary.insights || null,
      coreTheme: insertSummary.coreTheme || null,
      sections: insertSummary.sections || null,
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

export class DatabaseStorage implements IStorage {
  async getChannels(): Promise<Channel[]> {
    return await db.select().from(channels).orderBy(desc(channels.createdAt));
  }

  async getChannelsWithStats(): Promise<ChannelWithStats[]> {
    const result = await db
      .select({
        id: channels.id,
        name: channels.name,
        channelUrl: channels.channelUrl,
        channelId: channels.channelId,
        thumbnailUrl: channels.thumbnailUrl,
        frequency: channels.frequency,
        isActive: channels.isActive,
        createdAt: channels.createdAt,
        videoCount: sql<number>`count(distinct ${videos.id})`.as('videoCount'),
        summaryCount: sql<number>`count(distinct ${summaries.id})`.as('summaryCount'),
        newVideosCount: sql<number>`count(distinct case when ${videos.publishedAt} >= ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)} then ${videos.id} end)`.as('newVideosCount'),
      })
      .from(channels)
      .leftJoin(videos, eq(channels.id, videos.channelId))
      .leftJoin(summaries, eq(videos.id, summaries.videoId))
      .groupBy(channels.id)
      .orderBy(desc(channels.createdAt));

    return result;
  }

  async getChannel(id: number): Promise<Channel | undefined> {
    const [channel] = await db.select().from(channels).where(eq(channels.id, id));
    return channel || undefined;
  }

  async getChannelByChannelId(channelId: string): Promise<Channel | undefined> {
    const [channel] = await db.select().from(channels).where(eq(channels.channelId, channelId));
    return channel || undefined;
  }

  async createChannel(insertChannel: InsertChannel): Promise<Channel> {
    const [channel] = await db
      .insert(channels)
      .values(insertChannel)
      .returning();
    return channel;
  }

  async updateChannel(id: number, updates: Partial<InsertChannel>): Promise<Channel | undefined> {
    const [channel] = await db
      .update(channels)
      .set(updates)
      .where(eq(channels.id, id))
      .returning();
    return channel || undefined;
  }

  async deleteChannel(id: number): Promise<boolean> {
    const result = await db.delete(channels).where(eq(channels.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getVideosByChannel(channelId: number): Promise<Video[]> {
    return await db
      .select()
      .from(videos)
      .where(eq(videos.channelId, channelId))
      .orderBy(desc(videos.publishedAt));
  }

  async getVideo(id: number): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    return video || undefined;
  }

  async getVideoByVideoId(videoId: string): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.videoId, videoId));
    return video || undefined;
  }

  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    const [video] = await db
      .insert(videos)
      .values(insertVideo)
      .returning();
    return video;
  }

  async deleteVideo(id: number): Promise<boolean> {
    try {
      // First delete any related summaries
      await db.delete(summaries).where(eq(summaries.videoId, id));
      
      // Then delete the video
      const result = await db.delete(videos).where(eq(videos.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error("비디오 삭제 중 오류:", error);
      return false;
    }
  }

  async getLatestVideos(limit = 10): Promise<Video[]> {
    return await db
      .select()
      .from(videos)
      .orderBy(desc(videos.publishedAt))
      .limit(limit);
  }

  async getSummaries(): Promise<SummaryWithDetails[]> {
    const result = await db
      .select({
        id: summaries.id,
        channelId: summaries.channelId,
        title: summaries.title,
        content: summaries.content,
        keyPoints: summaries.keyPoints,
        tags: summaries.tags,
        sections: summaries.sections,
        insights: summaries.insights,
        coreTheme: summaries.coreTheme,
        videoId: summaries.videoId,
        createdAt: summaries.createdAt,
        channelName: channels.name,
        videoTitle: videos.title,
        videoUrl: videos.url,
        videoDuration: videos.duration,
        videoViewCount: videos.viewCount,
        videoPublishedAt: videos.publishedAt,
      })
      .from(summaries)
      .innerJoin(videos, eq(summaries.videoId, videos.id))
      .innerJoin(channels, eq(videos.channelId, channels.id))
      .orderBy(desc(summaries.createdAt));

    return result.map(row => ({
      ...row,
      parsedSections: row.sections ? JSON.parse(row.sections as string) : undefined
    })) as SummaryWithDetails[];
  }

  async getSummariesByChannel(channelId: number): Promise<SummaryWithDetails[]> {
    const result = await db
      .select({
        id: summaries.id,
        channelId: summaries.channelId,
        title: summaries.title,
        content: summaries.content,
        keyPoints: summaries.keyPoints,
        tags: summaries.tags,
        sections: summaries.sections,
        insights: summaries.insights,
        coreTheme: summaries.coreTheme,
        videoId: summaries.videoId,
        createdAt: summaries.createdAt,
        channelName: channels.name,
        videoTitle: videos.title,
        videoUrl: videos.url,
        videoDuration: videos.duration,
        videoViewCount: videos.viewCount,
        videoPublishedAt: videos.publishedAt,
      })
      .from(summaries)
      .innerJoin(videos, eq(summaries.videoId, videos.id))
      .innerJoin(channels, eq(videos.channelId, channels.id))
      .where(eq(channels.id, channelId))
      .orderBy(desc(summaries.createdAt));

    return result.map(row => ({
      ...row,
      parsedSections: row.sections ? JSON.parse(row.sections as string) : undefined
    })) as SummaryWithDetails[];
  }

  async getSummary(id: number): Promise<Summary | undefined> {
    const [summary] = await db.select().from(summaries).where(eq(summaries.id, id));
    return summary || undefined;
  }

  async createSummary(insertSummary: InsertSummary): Promise<Summary> {
    const [summary] = await db
      .insert(summaries)
      .values(insertSummary)
      .returning();
    return summary;
  }

  async getLatestSummaries(limit = 10): Promise<SummaryWithDetails[]> {
    const result = await db
      .select({
        id: summaries.id,
        channelId: summaries.channelId,
        title: summaries.title,
        content: summaries.content,
        keyPoints: summaries.keyPoints,
        tags: summaries.tags,
        sections: summaries.sections,
        insights: summaries.insights,
        coreTheme: summaries.coreTheme,
        videoId: summaries.videoId,
        createdAt: summaries.createdAt,
        channelName: channels.name,
        videoTitle: videos.title,
        videoUrl: videos.url,
        videoDuration: videos.duration,
        videoViewCount: videos.viewCount,
        videoPublishedAt: videos.publishedAt,
      })
      .from(summaries)
      .innerJoin(videos, eq(summaries.videoId, videos.id))
      .innerJoin(channels, eq(videos.channelId, channels.id))
      .orderBy(desc(summaries.createdAt))
      .limit(limit);

    return result.map(row => ({
      ...row,
      parsedSections: row.sections ? JSON.parse(row.sections as string) : undefined
    })) as SummaryWithDetails[];
  }

  async searchSummaries(query: string): Promise<SummaryWithDetails[]> {
    const result = await db
      .select({
        id: summaries.id,
        channelId: summaries.channelId,
        title: summaries.title,
        content: summaries.content,
        keyPoints: summaries.keyPoints,
        tags: summaries.tags,
        sections: summaries.sections,
        insights: summaries.insights,
        coreTheme: summaries.coreTheme,
        videoId: summaries.videoId,
        createdAt: summaries.createdAt,
        channelName: channels.name,
        videoTitle: videos.title,
        videoUrl: videos.url,
        videoDuration: videos.duration,
        videoViewCount: videos.viewCount,
        videoPublishedAt: videos.publishedAt,
      })
      .from(summaries)
      .innerJoin(videos, eq(summaries.videoId, videos.id))
      .innerJoin(channels, eq(videos.channelId, channels.id))
      .where(
        or(
          like(summaries.title, `%${query}%`),
          like(summaries.content, `%${query}%`),
          like(videos.title, `%${query}%`),
          like(channels.name, `%${query}%`)
        )
      )
      .orderBy(desc(summaries.createdAt));

    return result.map(row => ({
      ...row,
      parsedSections: row.sections ? JSON.parse(row.sections as string) : undefined
    })) as SummaryWithDetails[];
  }

  async getStats(): Promise<{
    totalChannels: number;
    totalSummaries: number;
    newThisWeek: number;
    apiUsage: number;
  }> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [channelCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(channels);

    const [summaryCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(summaries);

    const [newThisWeekCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(summaries)
      .where(gte(summaries.createdAt, oneWeekAgo));

    return {
      totalChannels: channelCount.count,
      totalSummaries: summaryCount.count,
      newThisWeek: newThisWeekCount.count,
      apiUsage: summaryCount.count, // Using summary count as API usage approximation
    };
  }
}

export const storage = new DatabaseStorage();
