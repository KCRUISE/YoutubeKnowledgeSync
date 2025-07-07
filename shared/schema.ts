import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const channels = pgTable("channels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  channelId: text("channel_id").notNull().unique(),
  channelUrl: text("channel_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  frequency: text("frequency").notNull().default("daily"), // hourly, every3hours, every6hours, every12hours, daily, weekly, monthly
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").notNull().references(() => channels.id),
  videoId: text("video_id").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  publishedAt: timestamp("published_at").notNull(),
  duration: text("duration"),
  viewCount: integer("view_count"),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const summaries = pgTable("summaries", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").notNull().references(() => videos.id),
  channelId: integer("channel_id").notNull().references(() => channels.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  coreTheme: text("core_theme"),
  tags: text("tags").array(),
  keyPoints: text("key_points").array(),
  insights: text("insights").array(),
  sections: text("sections"), // JSON string for sections
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertChannelSchema = createInsertSchema(channels).omit({
  id: true,
  createdAt: true,
});

// Schema for creating channels from frontend (without channelId, which is resolved from URL)
export const createChannelSchema = insertChannelSchema.omit({
  channelId: true,
  name: true, // Name will be fetched from YouTube
  thumbnailUrl: true, // Thumbnail will be fetched from YouTube
});

export const insertVideoSchema = createInsertSchema(videos).omit({
  id: true,
});

export const insertSummarySchema = createInsertSchema(summaries).omit({
  id: true,
  createdAt: true,
});

export type Channel = typeof channels.$inferSelect;
export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type Video = typeof videos.$inferSelect;
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Summary = typeof summaries.$inferSelect;
export type InsertSummary = z.infer<typeof insertSummarySchema>;

// Extended types for API responses
export type ChannelWithStats = Channel & {
  videoCount: number;
  summaryCount: number;
  newVideosCount: number;
};

export type SummaryWithDetails = Summary & {
  channelName: string;
  videoTitle: string;
  videoUrl: string;
  videoDuration: string | null;
  videoViewCount: number | null;
  videoPublishedAt: Date;
  parsedSections?: Array<{
    title: string;
    timestamp?: string;
    content: string;
    keyWords: string[];
  }>;
};
