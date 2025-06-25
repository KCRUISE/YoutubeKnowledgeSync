import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { YouTubeService } from "./services/youtube";
import { OpenAIService } from "./services/openai";
import { insertChannelSchema, insertVideoSchema, insertSummarySchema } from "@shared/schema";

const youtubeService = new YouTubeService();
const openaiService = new OpenAIService();

export async function registerRoutes(app: Express): Promise<Server> {
  // Stats endpoint
  app.get("/api/stats", async (_req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Stats 조회 실패:", error);
      res.status(500).json({ message: "통계 정보를 가져오는 데 실패했습니다." });
    }
  });

  // Channel routes
  app.get("/api/channels", async (_req, res) => {
    try {
      const channels = await storage.getChannelsWithStats();
      res.json(channels);
    } catch (error) {
      console.error("채널 목록 조회 실패:", error);
      res.status(500).json({ message: "채널 목록을 가져오는 데 실패했습니다." });
    }
  });

  app.post("/api/channels", async (req, res) => {
    try {
      const validatedData = insertChannelSchema.parse(req.body);
      
      // Check if channel already exists
      const existingChannel = await storage.getChannelByChannelId(validatedData.channelId);
      if (existingChannel) {
        return res.status(400).json({ message: "이미 등록된 채널입니다." });
      }

      // Get channel info from YouTube
      let channelInfo;
      try {
        channelInfo = await youtubeService.getChannelInfo(validatedData.channelUrl);
        if (!channelInfo) {
          return res.status(400).json({ message: "채널을 찾을 수 없습니다. URL을 확인해주세요." });
        }
      } catch (error) {
        return res.status(400).json({ message: error instanceof Error ? error.message : "채널 정보를 가져오는 데 실패했습니다." });
      }

      const channelData = {
        ...validatedData,
        name: channelInfo.name,
        channelId: channelInfo.channelId,
        thumbnailUrl: channelInfo.thumbnailUrl,
      };

      const channel = await storage.createChannel(channelData);
      
      // Fetch initial videos
      try {
        await fetchChannelVideos(channel.id, channelInfo.channelId);
      } catch (error) {
        console.error("초기 비디오 가져오기 실패:", error);
        // Don't fail channel creation if video fetching fails
      }

      res.status(201).json(channel);
    } catch (error) {
      console.error("채널 생성 실패:", error);
      if (error instanceof Error && error.name === "ZodError") {
        res.status(400).json({ message: "잘못된 입력 데이터입니다." });
      } else {
        res.status(500).json({ message: "채널을 추가하는 데 실패했습니다." });
      }
    }
  });

  app.delete("/api/channels/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteChannel(id);
      
      if (!success) {
        return res.status(404).json({ message: "채널을 찾을 수 없습니다." });
      }

      res.json({ message: "채널이 삭제되었습니다." });
    } catch (error) {
      console.error("채널 삭제 실패:", error);
      res.status(500).json({ message: "채널을 삭제하는 데 실패했습니다." });
    }
  });

  // Summary routes
  app.get("/api/summaries", async (req, res) => {
    try {
      const { channelId, search } = req.query;
      
      let summaries;
      if (search && typeof search === 'string') {
        summaries = await storage.searchSummaries(search);
      } else if (channelId && typeof channelId === 'string') {
        summaries = await storage.getSummariesByChannel(parseInt(channelId));
      } else {
        summaries = await storage.getLatestSummaries(20);
      }
      
      res.json(summaries);
    } catch (error) {
      console.error("요약 목록 조회 실패:", error);
      res.status(500).json({ message: "요약 목록을 가져오는 데 실패했습니다." });
    }
  });

  app.post("/api/summaries/:videoId", async (req, res) => {
    try {
      const videoId = parseInt(req.params.videoId);
      const video = await storage.getVideo(videoId);
      
      if (!video) {
        return res.status(404).json({ message: "비디오를 찾을 수 없습니다." });
      }

      const channel = await storage.getChannel(video.channelId);
      if (!channel) {
        return res.status(404).json({ message: "채널을 찾을 수 없습니다." });
      }

      // Check if summary already exists
      const existingSummaries = await storage.getSummariesByChannel(video.channelId);
      const existingSummary = existingSummaries.find(s => s.videoId === videoId);
      if (existingSummary) {
        return res.status(400).json({ message: "이미 요약이 존재합니다." });
      }

      // Get video transcript (not implemented yet)
      const transcript = await youtubeService.getVideoTranscript(video.videoId);

      // Generate summary using OpenAI
      const aiSummary = await openaiService.summarizeVideo(
        video.title,
        video.description || "",
        transcript || undefined
      );

      const summaryData = {
        videoId: video.id,
        channelId: video.channelId,
        title: aiSummary.title,
        content: aiSummary.content,
        keyPoints: aiSummary.keyPoints,
        tags: aiSummary.tags,
      };

      const summary = await storage.createSummary(summaryData);
      res.status(201).json(summary);
    } catch (error) {
      console.error("요약 생성 실패:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "요약을 생성하는 데 실패했습니다." });
    }
  });

  // Export routes
  app.get("/api/export/:summaryId", async (req, res) => {
    try {
      const summaryId = parseInt(req.params.summaryId);
      const summary = await storage.getSummary(summaryId);
      
      if (!summary) {
        return res.status(404).json({ message: "요약을 찾을 수 없습니다." });
      }

      const video = await storage.getVideo(summary.videoId);
      const channel = await storage.getChannel(summary.channelId);
      
      if (!video || !channel) {
        return res.status(404).json({ message: "관련 데이터를 찾을 수 없습니다." });
      }

      const aiSummary = {
        title: summary.title,
        content: summary.content,
        keyPoints: summary.keyPoints || [],
        tags: summary.tags || [],
      };

      const markdown = await openaiService.generateObsidianMarkdown(
        aiSummary,
        video.url,
        channel.name,
        video.publishedAt
      );

      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="${summary.title}.md"`);
      res.send(markdown);
    } catch (error) {
      console.error("내보내기 실패:", error);
      res.status(500).json({ message: "파일을 내보내는 데 실패했습니다." });
    }
  });

  app.get("/api/export-all", async (req, res) => {
    try {
      const { channelId } = req.query;
      
      let summaries;
      if (channelId && typeof channelId === 'string') {
        summaries = await storage.getSummariesByChannel(parseInt(channelId));
      } else {
        summaries = await storage.getSummaries();
      }

      const zip = require('archiver')('zip');
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="obsidian-summaries.zip"');
      
      zip.pipe(res);

      for (const summary of summaries) {
        const aiSummary = {
          title: summary.title,
          content: summary.content,
          keyPoints: summary.keyPoints || [],
          tags: summary.tags || [],
        };

        const markdown = await openaiService.generateObsidianMarkdown(
          aiSummary,
          summary.videoUrl,
          summary.channelName,
          summary.videoPublishedAt
        );

        zip.append(markdown, { name: `${summary.title}.md` });
      }

      zip.finalize();
    } catch (error) {
      console.error("전체 내보내기 실패:", error);
      res.status(500).json({ message: "파일들을 내보내는 데 실패했습니다." });
    }
  });

  // Fetch videos for a channel
  app.post("/api/channels/:id/fetch-videos", async (req, res) => {
    try {
      const channelId = parseInt(req.params.id);
      const channel = await storage.getChannel(channelId);
      
      if (!channel) {
        return res.status(404).json({ message: "채널을 찾을 수 없습니다." });
      }

      await fetchChannelVideos(channelId, channel.channelId);
      res.json({ message: "비디오를 성공적으로 가져왔습니다." });
    } catch (error) {
      console.error("비디오 가져오기 실패:", error);
      res.status(500).json({ message: "비디오를 가져오는 데 실패했습니다." });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function fetchChannelVideos(channelId: number, youtubeChannelId: string) {
  try {
    const videos = await youtubeService.getLatestVideos(youtubeChannelId, 10);
    
    for (const video of videos) {
      // Check if video already exists
      const existingVideo = await storage.getVideoByVideoId(video.id);
      if (existingVideo) continue;

      const videoData = {
        channelId,
        videoId: video.id,
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnailUrl: video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url,
        publishedAt: new Date(video.snippet.publishedAt),
        duration: youtubeService.parseDuration(video.contentDetails.duration),
        viewCount: parseInt(video.statistics.viewCount) || 0,
        url: `https://www.youtube.com/watch?v=${video.id}`,
      };

      await storage.createVideo(videoData);
    }
  } catch (error) {
    console.error("채널 비디오 가져오기 실패:", error);
    throw error;
  }
}
