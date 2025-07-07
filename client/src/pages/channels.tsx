import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ChannelModal } from "@/components/channel-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, RefreshCw, Tv } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ChannelWithStats } from "@shared/schema";

export default function Channels() {
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const { toast } = useToast();

  const { data: channels = [], isLoading } = useQuery<ChannelWithStats[]>({
    queryKey: ["/api/channels"],
  });

  const deleteChannelMutation = useMutation({
    mutationFn: async (channelId: number) => {
      await apiRequest("DELETE", `/api/channels/${channelId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/summaries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "채널이 삭제되었습니다." });
    },
    onError: (error) => {
      toast({ 
        title: "삭제 실패", 
        description: error instanceof Error ? error.message : "채널을 삭제하는 데 실패했습니다.",
        variant: "destructive" 
      });
    },
  });

  const fetchVideosMutation = useMutation({
    mutationFn: async (channelId: number) => {
      await apiRequest("POST", `/api/channels/${channelId}/fetch-videos`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "비디오를 성공적으로 가져왔습니다." });
    },
    onError: (error) => {
      toast({ 
        title: "가져오기 실패", 
        description: error instanceof Error ? error.message : "비디오를 가져오는 데 실패했습니다.",
        variant: "destructive" 
      });
    },
  });

  const refreshChannelMutation = useMutation({
    mutationFn: async (channelId: number) => {
      await apiRequest("PUT", `/api/channels/${channelId}/refresh`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "채널 정보가 업데이트되었습니다." });
    },
    onError: (error) => {
      toast({ 
        title: "새로고침 실패", 
        description: error instanceof Error ? error.message : "채널 정보를 새로고침하는 데 실패했습니다.",
        variant: "destructive" 
      });
    },
  });

  const fetchAllVideosMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/channels/fetch-all-videos");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "모든 채널에서 새영상을 성공적으로 가져왔습니다." });
    },
    onError: (error) => {
      toast({ 
        title: "전체 가져오기 실패", 
        description: error instanceof Error ? error.message : "전체 채널에서 영상을 가져오는 데 실패했습니다.",
        variant: "destructive" 
      });
    },
  });

  const handleDeleteChannel = (channelId: number) => {
    if (confirm("정말로 이 채널을 삭제하시겠습니까? 관련된 모든 요약도 함께 삭제됩니다.")) {
      deleteChannelMutation.mutate(channelId);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex bg-slate-50 dark:bg-background">
        <Sidebar />
        <main className="flex-1 flex flex-col">
          <Header 
            title="채널 관리"
            subtitle="등록된 YouTube 채널을 관리하세요"
            onAddChannel={() => setIsChannelModalOpen(true)}
          />
          <div className="flex-1 p-6 flex items-center justify-center">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">채널 목록을 불러오는 중...</p>
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
          title="채널 관리"
          subtitle="등록된 YouTube 채널을 관리하세요"
          onAddChannel={() => setIsChannelModalOpen(true)}
        />
        
        <div className="flex-1 p-6">
          {channels.length === 0 ? (
            <div className="text-center py-12">
              <Tv className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2 text-foreground">등록된 채널이 없습니다</h3>
              <p className="text-muted-foreground mb-4">첫 번째 YouTube 채널을 추가해보세요.</p>
              <Button onClick={() => setIsChannelModalOpen(true)}>
                채널 추가하기
              </Button>
            </div>
          ) : (
            <>
              {/* 전체 작업 버튼 */}
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-semibold">채널 목록 ({channels.length}개)</h2>
                </div>
                <Button
                  onClick={() => fetchAllVideosMutation.mutate()}
                  disabled={fetchAllVideosMutation.isPending}
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className={`w-4 h-4 ${fetchAllVideosMutation.isPending ? 'animate-spin' : ''}`} />
                  <span>{fetchAllVideosMutation.isPending ? '가져오는 중...' : '모든 채널 새영상 가져오기'}</span>
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {channels.map((channel) => (
                <Card key={channel.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      {channel.thumbnailUrl ? (
                        <img 
                          src={channel.thumbnailUrl} 
                          alt={channel.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                          <Tv className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{channel.name}</h3>
                        <p className="text-xs text-muted-foreground truncate mb-1">
                          ID: {channel.channelId}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {channel.videoCount}개 비디오 • {channel.summaryCount}개 요약
                        </p>
                        {channel.newVideosCount > 0 && (
                          <Badge variant="secondary" className="mt-2">
                            {channel.newVideosCount}개의 새 영상
                          </Badge>
                        )}
                        <div className="flex items-center space-x-2 mt-3">
                          <Badge variant={channel.isActive ? "default" : "secondary"}>
                            {channel.isActive ? "활성" : "비활성"}
                          </Badge>
                          <Badge variant="outline">
                            {channel.frequency === "hourly" ? "매시간" :
                             channel.frequency === "every3hours" ? "3시간마다" :
                             channel.frequency === "every6hours" ? "6시간마다" :
                             channel.frequency === "every12hours" ? "12시간마다" :
                             channel.frequency === "daily" ? "매일" : 
                             channel.frequency === "weekly" ? "주 1회" : "월 1회"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-end space-x-2 mt-4 pt-4 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refreshChannelMutation.mutate(channel.id)}
                        disabled={refreshChannelMutation.isPending}
                      >
                        <RefreshCw className={`w-4 h-4 mr-1 ${refreshChannelMutation.isPending ? 'animate-spin' : ''}`} />
                        채널 정보
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchVideosMutation.mutate(channel.id)}
                        disabled={fetchVideosMutation.isPending}
                      >
                        <RefreshCw className={`w-4 h-4 mr-1 ${fetchVideosMutation.isPending ? 'animate-spin' : ''}`} />
                        새 영상
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteChannel(channel.id)}
                        disabled={deleteChannelMutation.isPending}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        삭제
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      <ChannelModal 
        open={isChannelModalOpen}
        onOpenChange={setIsChannelModalOpen}
      />
    </div>
  );
}
