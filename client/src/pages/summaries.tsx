import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, Download, Eye, Clock, ExternalLink } from "lucide-react";
import type { SummaryWithDetails, ChannelWithStats } from "@shared/schema";

export default function Summaries() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<string>("all");

  const { data: channels = [] } = useQuery<ChannelWithStats[]>({
    queryKey: ["/api/channels"],
  });

  const { data: summaries = [], isLoading } = useQuery<SummaryWithDetails[]>({
    queryKey: ["/api/summaries", { channelId: selectedChannel !== "all" ? selectedChannel : undefined, search: searchQuery }],
  });

  const handleExport = (summaryId: number) => {
    window.open(`/api/export/${summaryId}`, '_blank');
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

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <Header 
          title="요약 목록"
          subtitle="생성된 비디오 요약을 확인하고 관리하세요"
        />
        
        <div className="p-6">
          {/* Search and Filter */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-3 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="요약 검색..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                    <SelectTrigger className="w-full sm:w-48">
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
                </div>
                <Button onClick={handleExportAll} className="bg-accent hover:bg-accent/90">
                  <Download className="w-4 h-4 mr-2" />
                  전체 내보내기
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Summaries List */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">요약 목록을 불러오는 중...</p>
            </div>
          ) : summaries.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2 text-foreground">요약이 없습니다</h3>
              <p className="text-muted-foreground">채널을 추가하고 비디오 요약을 생성해보세요.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {summaries.map((summary) => (
                <Card key={summary.id} className="summary-card">
                  <CardContent className="p-6">
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
                          <div className="text-sm text-blue-600 dark:text-blue-400 mb-2 italic font-medium">
                            💡 "{summary.coreTheme}"
                          </div>
                        )}
                        
                        <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-3">
                          {summary.content.substring(0, 200)}...
                        </p>
                        
                        {summary.keyPoints && summary.keyPoints.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-foreground mb-1">🎯 핵심 포인트:</p>
                            <div className="flex flex-wrap gap-1">
                              {summary.keyPoints.slice(0, 3).map((point, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {point.length > 20 ? `${point.substring(0, 20)}...` : point}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {summary.insights && summary.insights.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-foreground mb-1">💡 핵심 인사이트:</p>
                            <div className="flex flex-wrap gap-1">
                              {summary.insights.slice(0, 2).map((insight, index) => (
                                <Badge key={index} variant="secondary" className="text-xs bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800">
                                  {insight.length > 25 ? `${insight.substring(0, 25)}...` : insight}
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
