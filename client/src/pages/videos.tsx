import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayCircle, Clock, Eye, Sparkles, CheckCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Channel, Video } from "@shared/schema";

export default function Videos() {
  const [selectedChannelId, setSelectedChannelId] = useState<string>("all");
  const { toast } = useToast();

  const { data: channels = [], isLoading: channelsLoading } = useQuery<Channel[]>({
    queryKey: ["/api/channels"],
  });

  const { data: videos = [], isLoading: videosLoading } = useQuery<Video[]>({
    queryKey: ["/api/videos", selectedChannelId],
    queryFn: async () => {
      const url = selectedChannelId === "all" 
        ? "/api/videos" 
        : `/api/videos?channelId=${selectedChannelId}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("영상 목록을 가져오는 데 실패했습니다");
      return response.json();
    },
  });

  const { data: summaries = [] } = useQuery<any[]>({
    queryKey: ["/api/summaries"],
  });

  const createSummaryMutation = useMutation({
    mutationFn: async (videoId: number) => {
      await apiRequest("POST", `/api/summaries/${videoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/summaries"] });
      toast({ title: "요약이 성공적으로 생성되었습니다." });
    },
    onError: (error) => {
      toast({ 
        title: "요약 생성 실패", 
        description: error instanceof Error ? error.message : "요약을 생성하는 데 실패했습니다.",
        variant: "destructive" 
      });
    },
  });

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDuration = (duration: string | null) => {
    if (!duration) return "미상";
    return duration;
  };

  const formatViewCount = (viewCount: number | null) => {
    if (!viewCount) return "0";
    if (viewCount >= 1000000) {
      return `${(viewCount / 1000000).toFixed(1)}M`;
    } else if (viewCount >= 1000) {
      return `${(viewCount / 1000).toFixed(1)}K`;
    }
    return viewCount.toString();
  };

  const getChannelName = (channelId: number) => {
    const channel = (channels as Channel[]).find((c: Channel) => c.id === channelId);
    return channel?.name || "알 수 없는 채널";
  };

  const hasSummary = (videoId: number) => {
    return (summaries as any[]).some((s: any) => s.videoId === videoId);
  };

  if (channelsLoading || videosLoading) {
    return (
      <div className="min-h-screen flex bg-slate-50 dark:bg-background">
        <Sidebar />
        <main className="flex-1 flex flex-col">
          <Header 
            title="영상 목록"
            subtitle="가져온 영상들을 확인하고 요약을 생성하세요"
          />
          <div className="flex-1 p-6">
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex space-x-4">
                      <Skeleton className="w-32 h-20 rounded" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-1/4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <Header 
          title="영상 목록"
          subtitle="가져온 영상들을 확인하고 요약을 생성하세요"
        />
        <div className="flex-1 p-6">
          <div className="mb-6">
            <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="채널 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 채널</SelectItem>
                {(channels as Channel[]).map((channel: Channel) => (
                  <SelectItem key={channel.id} value={channel.id.toString()}>
                    {channel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {videos.length === 0 ? (
            <div className="text-center py-12">
              <PlayCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">영상이 없습니다</h3>
              <p className="text-muted-foreground">
                채널에서 새로운 영상을 가져오거나 다른 채널을 선택해보세요.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {videos.map((video: Video) => (
                <Card key={video.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex space-x-4">
                      <div className="w-32 h-20 bg-muted rounded flex items-center justify-center flex-shrink-0">
                        <PlayCircle className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground line-clamp-2 mb-2">
                          {video.title}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                          <span className="flex items-center">
                            <Badge variant="outline" className="mr-2">
                              {getChannelName(video.channelId)}
                            </Badge>
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {formatDuration(video.duration)}
                          </span>
                          <span className="flex items-center">
                            <Eye className="w-4 h-4 mr-1" />
                            {formatViewCount(video.viewCount)}회
                          </span>
                          <span>{formatDate(video.publishedAt)}</span>
                        </div>
                        {video.description && (
                          <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                            {video.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {hasSummary(video.id) ? (
                              <Badge variant="default" className="flex items-center">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                요약 완료
                              </Badge>
                            ) : (
                              <Badge variant="secondary">요약 대기</Badge>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`https://www.youtube.com/watch?v=${video.videoId}`, '_blank')}
                            >
                              <PlayCircle className="w-4 h-4 mr-1" />
                              영상 보기
                            </Button>
                            {!hasSummary(video.id) && (
                              <Button
                                size="sm"
                                onClick={() => createSummaryMutation.mutate(video.id)}
                                disabled={createSummaryMutation.isPending}
                              >
                                <Sparkles className="w-4 h-4 mr-1" />
                                {createSummaryMutation.isPending ? "요약 중..." : "요약 생성"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}