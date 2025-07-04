import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { YouTubeService } from "./services/youtube";
import { OpenAIService } from "./services/openai";
import { ObsidianMCPService } from "./services/obsidian-mcp";
import { insertChannelSchema, createChannelSchema, insertVideoSchema, insertSummarySchema } from "@shared/schema";
import { z } from "zod";

const youtubeService = new YouTubeService();
const openaiService = new OpenAIService();

// Obsidian MCP 서비스 초기화
let obsidianMCP: ObsidianMCPService | null = null;

async function initializeObsidianMCP() {
  const apiKey = process.env.OBSIDIAN_API_KEY;
  const host = process.env.OBSIDIAN_HOST || '127.0.0.1';
  const port = process.env.OBSIDIAN_PORT || '27124';

  if (apiKey) {
    try {
      obsidianMCP = new ObsidianMCPService({ 
        apiKey, 
        host, 
        port 
      });
      await obsidianMCP.connect();
      console.log('Obsidian MCP 서비스 초기화 완료');
    } catch (error) {
      console.warn('Obsidian MCP 초기화 실패 (선택적 기능):', error);
      obsidianMCP = null;
    }
  } else {
    console.log('OBSIDIAN_API_KEY가 설정되지 않음 - MCP 기능 비활성화');
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Test database connectivity
  try {
    console.log("Testing database connection...");
    await storage.getStats();
    console.log("Database connection successful!");
  } catch (error) {
    console.error("Database connection failed:", error);
    throw error;
  }

  // Initialize Obsidian MCP service
  await initializeObsidianMCP();

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
      // Define a simple validation schema for channel creation
      const channelInputSchema = z.object({
        channelUrl: z.string().url("유효한 URL을 입력해주세요."),
        frequency: z.string().optional().default("daily"),
        isActive: z.boolean().optional().default(true),
      });
      
      // Validate only the basic input data (without channelId which we'll get from YouTube)
      const validatedData = channelInputSchema.parse(req.body);
      
      // Get channel info from YouTube first
      let channelInfo;
      try {
        channelInfo = await youtubeService.getChannelInfo(validatedData.channelUrl);
        if (!channelInfo) {
          return res.status(400).json({ message: "채널을 찾을 수 없습니다. URL을 확인해주세요." });
        }
      } catch (error) {
        return res.status(400).json({ message: error instanceof Error ? error.message : "채널 정보를 가져오는 데 실패했습니다." });
      }

      // Check if channel already exists using the resolved channelId
      const existingChannel = await storage.getChannelByChannelId(channelInfo.channelId);
      if (existingChannel) {
        return res.status(400).json({ message: "이미 등록된 채널입니다." });
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

  app.put("/api/channels/:id/refresh", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const channel = await storage.getChannel(id);
      
      if (!channel) {
        return res.status(404).json({ message: "채널을 찾을 수 없습니다." });
      }

      // Fetch fresh channel info from YouTube
      const channelInfo = await youtubeService.getChannelInfo(channel.channelUrl);
      if (!channelInfo) {
        return res.status(400).json({ message: "채널 정보를 가져올 수 없습니다." });
      }

      // Update channel with fresh data
      const updatedChannel = await storage.updateChannel(id, {
        name: channelInfo.name,
        channelId: channelInfo.channelId,
        thumbnailUrl: channelInfo.thumbnailUrl,
      });

      res.json(updatedChannel);
    } catch (error) {
      console.error("채널 정보 새로고침 실패:", error);
      res.status(500).json({ message: "채널 정보를 새로고침하는 데 실패했습니다." });
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

  // Video routes
  app.get("/api/videos", async (req, res) => {
    try {
      const { channelId, limit } = req.query;
      
      if (channelId) {
        const videos = await storage.getVideosByChannel(parseInt(channelId as string));
        res.json(videos);
      } else {
        const videos = await storage.getLatestVideos(limit ? parseInt(limit as string) : 50);
        res.json(videos);
      }
    } catch (error) {
      console.error("영상 목록 가져오기 실패:", error);
      res.status(500).json({ message: "영상 목록을 가져오는 데 실패했습니다." });
    }
  });

  app.delete("/api/videos/:id", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const success = await storage.deleteVideo(videoId);
      
      if (!success) {
        return res.status(404).json({ message: "영상을 찾을 수 없습니다." });
      }

      res.json({ message: "영상이 삭제되었습니다." });
    } catch (error) {
      console.error("영상 삭제 실패:", error);
      res.status(500).json({ message: "영상을 삭제하는 데 실패했습니다." });
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
        coreTheme: aiSummary.coreTheme,
        keyPoints: aiSummary.keyPoints,
        insights: aiSummary.insights,
        tags: aiSummary.tags,
        sections: JSON.stringify(aiSummary.sections), // Store as JSON string
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
        coreTheme: summary.coreTheme || "",
        keyPoints: summary.keyPoints || [],
        insights: summary.insights || [],
        tags: summary.tags || [],
        sections: summary.sections ? JSON.parse(summary.sections) : [],
      };

      const markdown = await openaiService.generateObsidianMarkdown(
        aiSummary,
        video.url,
        channel.name,
        video.publishedAt
      );

      // 파일명에서 특수문자 제거 및 안전한 파일명 생성
      const safeFilename = summary.title
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // 윈도우 금지 문자 제거
        .replace(/\s+/g, '_') // 공백을 언더스코어로 변경
        .substring(0, 100); // 파일명 길이 제한

      // Obsidian MCP를 통한 직접 전송 시도
      if (obsidianMCP && obsidianMCP.isConnected()) {
        const obsidianPath = `YouTube 요약/${channel.name}/${safeFilename}.md`;
        const success = await obsidianMCP.putContent(obsidianPath, markdown);
        
        if (success) {
          res.json({ 
            message: "Obsidian에 성공적으로 저장되었습니다.", 
            path: obsidianPath,
            method: 'obsidian_direct'
          });
          return;
        }
      }
      
      // Obsidian 연동이 실패하거나 비활성화된 경우 파일 다운로드로 폴백
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeFilename)}.md"`);
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
          coreTheme: summary.coreTheme || "",
          keyPoints: summary.keyPoints || [],
          insights: summary.insights || [],
          tags: summary.tags || [],
          sections: summary.sections ? JSON.parse(summary.sections) : [],
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

  // Fetch videos for all channels
  app.post("/api/channels/fetch-all-videos", async (req, res) => {
    try {
      const channels = await storage.getChannels();
      
      if (channels.length === 0) {
        return res.status(400).json({ message: "등록된 채널이 없습니다." });
      }

      let successCount = 0;
      let errorCount = 0;
      
      // Process all channels concurrently
      const results = await Promise.allSettled(
        channels.map(async (channel) => {
          try {
            await fetchChannelVideos(channel.id, channel.channelId);
            return { channelId: channel.id, success: true };
          } catch (error) {
            console.error(`채널 ${channel.name} 비디오 가져오기 실패:`, error);
            return { channelId: channel.id, success: false, error };
          }
        })
      );

      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.success) {
          successCount++;
        } else {
          errorCount++;
        }
      });

      const message = errorCount === 0 
        ? `모든 채널(${successCount}개)에서 새영상을 성공적으로 가져왔습니다.`
        : `${successCount}개 채널 성공, ${errorCount}개 채널 실패`;
      
      res.json({ 
        message,
        successCount,
        errorCount,
        totalChannels: channels.length
      });
    } catch (error) {
      console.error("전체 채널 비디오 가져오기 실패:", error);
      res.status(500).json({ message: "전체 채널에서 비디오를 가져오는 데 실패했습니다." });
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
