import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SummaryDetailModal } from "@/components/summary-detail-modal";
import { FileText, Clock, Eye, Calendar, ExternalLink, Download } from "lucide-react";
import type { SummaryWithDetails } from "@shared/schema";

export default function Summaries() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSummary, setSelectedSummary] = useState<SummaryWithDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: summaries = [], isLoading } = useQuery<SummaryWithDetails[]>({
    queryKey: ["/api/summaries", searchQuery],
    queryFn: async () => {
      const url = searchQuery 
        ? `/api/summaries?search=${encodeURIComponent(searchQuery)}`
        : "/api/summaries";
      const response = await fetch(url);
      if (!response.ok) throw new Error("요약 목록을 가져오는 데 실패했습니다");
      return response.json();
    },
  });

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
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

  const handleSummaryClick = (summary: SummaryWithDetails) => {
    // Parse sections if they exist as JSON string
    if (summary.sections && typeof summary.sections === 'string') {
      try {
        summary.parsedSections = JSON.parse(summary.sections);
      } catch (e) {
        console.error("Failed to parse sections:", e);
      }
    }
    setSelectedSummary(summary);
    setIsModalOpen(true);
  };

  const handleExport = async (summaryId: number, title: string) => {
    try {
      const response = await fetch(`/api/export/${summaryId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "내보내기 실패");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // 안전한 파일명 생성
      const safeFilename = title
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // 특수문자 제거
        .replace(/\s+/g, '_') // 공백을 언더스코어로 변경
        .substring(0, 100); // 길이 제한
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeFilename}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log("옵시디언 마크다운 파일 다운로드 완료:", safeFilename);
    } catch (error) {
      console.error("내보내기 실패:", error);
      alert("파일 내보내기에 실패했습니다. 다시 시도해주세요.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex bg-slate-50 dark:bg-background">
        <Sidebar />
        <main className="flex-1 flex flex-col">
          <Header 
            title="요약 목록"
            subtitle="생성된 영상 요약을 확인하고 관리하세요"
          />
          <div className="flex-1 p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-24" />
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
          title="요약 목록"
          subtitle="생성된 영상 요약을 확인하고 관리하세요"
          onSearch={setSearchQuery}
        />
        <div className="flex-1 p-6">
          {summaries.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">요약이 없습니다</h3>
              <p className="text-muted-foreground">
                {searchQuery ? "검색 결과가 없습니다." : "영상에서 요약을 생성해보세요."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {summaries.map((summary) => (
                <Card key={summary.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0" onClick={() => handleSummaryClick(summary)}>
                        <h3 className="font-semibold text-lg text-foreground hover:text-primary transition-colors line-clamp-2 mb-3">
                          {summary.title}
                        </h3>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <Badge variant="outline">{summary.channelName}</Badge>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {summary.videoDuration}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            {formatViewCount(summary.videoViewCount)}회
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(summary.videoPublishedAt)}
                          </span>
                        </div>

                        {summary.coreTheme && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 bg-muted/50 p-3 rounded">
                            🎯 {summary.coreTheme}
                          </p>
                        )}

                        {summary.tags && summary.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {summary.tags.slice(0, 4).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {summary.tags.length > 4 && (
                              <Badge variant="secondary" className="text-xs">
                                +{summary.tags.length - 4}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(summary.videoUrl, '_blank');
                          }}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          영상 보기
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExport(summary.id, summary.title);
                          }}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          내보내기
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

      <SummaryDetailModal
        summary={selectedSummary}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
}