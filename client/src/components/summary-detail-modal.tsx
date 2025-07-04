import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink, Download, Clock, Eye, Calendar } from "lucide-react";
import type { SummaryWithDetails } from "@shared/schema";

interface SummaryDetailModalProps {
  summary: SummaryWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SummaryDetailModal({ summary, open, onOpenChange }: SummaryDetailModalProps) {
  if (!summary) return null;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/export/${summary.id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "내보내기 실패");
      }
      
      const contentType = response.headers.get('content-type');
      
      // Obsidian 직접 연동 성공인 경우
      if (contentType?.includes('application/json')) {
        const result = await response.json();
        if (result.method === 'obsidian_direct') {
          alert(`Obsidian에 성공적으로 저장되었습니다!\n경로: ${result.path}`);
          console.log("Obsidian 직접 연동 완료:", result.path);
          return;
        }
      }
      
      // 파일 다운로드 폴백
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // 안전한 파일명 생성
      const safeFilename = summary.title
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        {/* 헤더 - 고정 */}
        <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-bold leading-tight mb-3 line-clamp-2">
                {summary.title}
              </DialogTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <Badge variant="outline" className="secondary-badge">{summary.channelName}</Badge>
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
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(summary.videoUrl, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                영상 보기
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
              >
                <Download className="w-4 h-4 mr-1" />
                내보내기
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* 스크롤 가능한 콘텐츠 영역 */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full px-6 pb-6">
            <div className="space-y-6 pt-4">
              {/* 핵심 테마 */}
              {summary.coreTheme && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-primary">🎯 핵심 테마</h3>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
                    {summary.coreTheme}
                  </p>
                </div>
              )}

              {/* 주요 내용 */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-primary">📋 요약 내용</h3>
                <div 
                  className="prose prose-sm max-w-none dark:prose-invert text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: summary.content.replace(/\n/g, '<br>') }}
                />
              </div>

              {/* 섹션별 분석 */}
              {summary.parsedSections && summary.parsedSections.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-primary">📖 섹션별 분석</h3>
                  <div className="space-y-4">
                    {summary.parsedSections.map((section, index) => (
                      <div key={index} className="border border-border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{section.title}</h4>
                          {section.timestamp && (
                            <Badge variant="secondary" className="text-xs">
                              {section.timestamp}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{section.content}</p>
                        {section.keyWords && section.keyWords.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {section.keyWords.map((keyword, keyIndex) => (
                              <Badge key={keyIndex} variant="outline" className="text-xs tag-badge">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 핵심 포인트 */}
              {summary.keyPoints && summary.keyPoints.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-primary">💡 핵심 포인트</h3>
                  <ul className="space-y-2">
                    {summary.keyPoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-primary font-medium mt-1">•</span>
                        <span className="text-sm leading-relaxed">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 인사이트 */}
              {summary.insights && summary.insights.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-primary">🔍 인사이트</h3>
                  <ul className="space-y-2">
                    {summary.insights.map((insight, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-primary font-medium mt-1">→</span>
                        <span className="text-sm text-muted-foreground leading-relaxed">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 태그 */}
              {summary.tags && summary.tags.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-primary">🏷️ 태그</h3>
                  <div className="flex flex-wrap gap-2">
                    {summary.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="tag-badge">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}