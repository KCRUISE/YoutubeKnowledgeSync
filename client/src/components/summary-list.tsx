import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Eye, Download, Clock, ExternalLink, ChevronDown } from "lucide-react";
import type { SummaryWithDetails, ChannelWithStats } from "@shared/schema";

export function SummaryList() {
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [displayCount, setDisplayCount] = useState(5);

  const { data: channels = [] } = useQuery<ChannelWithStats[]>({
    queryKey: ["/api/channels"],
  });

  const { data: summaries = [], isLoading } = useQuery<SummaryWithDetails[]>({
    queryKey: ["/api/summaries", { channelId: selectedChannel !== "all" ? selectedChannel : undefined }],
  });

  const handleExport = async (summaryId: number) => {
    try {
      const response = await fetch(`/api/export/${summaryId}`);
      if (!response.ok) {
        throw new Error("내보내기 실패");
      }
      
      const contentType = response.headers.get('content-type');
      
      // Obsidian 직접 연동 성공인 경우
      if (contentType?.includes('application/json')) {
        const result = await response.json();
        if (result.method === 'obsidian_direct') {
          alert(`Obsidian에 성공적으로 저장되었습니다!\n경로: ${result.path}`);
          return;
        }
      }
      
      // 파일 다운로드 폴백
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `summary_${summaryId}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export error:", error);
      alert("내보내기에 실패했습니다.");
    }
  };

  const handleExportAll = () => {
    const channelId = selectedChannel !== "all" ? selectedChannel : undefined;
    const url = channelId ? `/api/export-all?channelId=${channelId}` : '/api/export-all';
    window.open(url, '_blank');
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatViewCount = (count: number) => {
    if (count >= 10000) {
      return `${(count / 10000).toFixed(1)}만`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}천`;
    }
    return count.toString();
  };

  const displayedSummaries = summaries.slice(0, displayCount);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>최신 요약</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse border border-border rounded-lg p-4">
                <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                <div className="h-5 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-full mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>최신 요약</CardTitle>
          <div className="flex items-center space-x-3">
            <Select value={selectedChannel} onValueChange={setSelectedChannel}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="채널 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 채널</SelectItem>
                {channels.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id.toString()}>
                    {channel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              size="sm" 
              onClick={handleExportAll}
              className="bg-accent hover:bg-accent/90"
            >
              <Download className="w-4 h-4 mr-1" />
              전체 내보내기
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {summaries.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">생성된 요약이 없습니다</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {displayedSummaries.map((summary) => (
                <div key={summary.id} className="summary-card">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant="secondary">
                          {summary.channelName}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(summary.videoPublishedAt)}
                        </span>
                      </div>
                      
                      <h4 className="text-sm font-medium text-foreground mb-2 leading-relaxed">
                        {summary.title}
                      </h4>
                      
                      {summary.coreTheme && (
                        <div className="text-sm text-blue-600 dark:text-blue-400 mb-2 italic">
                          "{summary.coreTheme}"
                        </div>
                      )}
                      
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-2">
                        {summary.content.substring(0, 150)}...
                      </p>
                      
                      {summary.insights && summary.insights.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-foreground mb-1">💡 핵심 인사이트:</p>
                          <div className="flex flex-wrap gap-1">
                            {summary.insights.slice(0, 2).map((insight, index) => (
                              <Badge key={index} variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                                {insight.length > 30 ? `${insight.substring(0, 30)}...` : insight}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        {summary.videoDuration && (
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {summary.videoDuration}
                          </span>
                        )}
                        {summary.videoViewCount && (
                          <span className="flex items-center">
                            <Eye className="w-3 h-3 mr-1" />
                            {formatViewCount(summary.videoViewCount)} 조회수
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(summary.videoUrl, '_blank')}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExport(summary.id)}
                        className="text-muted-foreground hover:text-accent"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {summaries.length > displayCount && (
              <div className="mt-6 text-center">
                <Button
                  variant="outline"
                  onClick={() => setDisplayCount(prev => prev + 5)}
                >
                  <ChevronDown className="w-4 h-4 mr-2" />
                  더 보기
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
