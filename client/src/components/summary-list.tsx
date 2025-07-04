import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FileText, Eye, Download, Clock, ExternalLink, ChevronDown, Trash2, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SummaryWithDetails, ChannelWithStats } from "@shared/schema";

export function SummaryList() {
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [displayCount, setDisplayCount] = useState(5);
  const [selectedSummaries, setSelectedSummaries] = useState<Set<number>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingSummaries, setDeletingSummaries] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const { data: channels = [] } = useQuery<ChannelWithStats[]>({
    queryKey: ["/api/channels"],
  });

  const { data: summaries = [], isLoading } = useQuery<SummaryWithDetails[]>({
    queryKey: ["/api/summaries", { channelId: selectedChannel !== "all" ? selectedChannel : undefined }],
  });

  const filteredSummaries = summaries.filter(summary => 
    selectedChannel === "all" || summary.channelId.toString() === selectedChannel
  );

  const displayedSummaries = filteredSummaries.slice(0, displayCount);

  // 다중 선택 관리 함수들
  const toggleSummarySelection = (summaryId: number) => {
    const newSelected = new Set(selectedSummaries);
    if (newSelected.has(summaryId)) {
      newSelected.delete(summaryId);
    } else {
      newSelected.add(summaryId);
    }
    setSelectedSummaries(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedSummaries.size === displayedSummaries.length) {
      setSelectedSummaries(new Set());
    } else {
      setSelectedSummaries(new Set(displayedSummaries.map(s => s.id)));
    }
  };

  const clearSelection = () => {
    setSelectedSummaries(new Set());
    setShowDeleteDialog(false);
  };

  const handleBulkDelete = async () => {
    try {
      const summaryIds = Array.from(selectedSummaries);
      setDeletingSummaries(new Set(summaryIds));
      
      await Promise.all(
        summaryIds.map(summaryId => 
          apiRequest(`/api/summaries/${summaryId}`, "DELETE")
        )
      );
      
      await queryClient.invalidateQueries({ queryKey: ["/api/summaries"] });
      
      toast({
        title: "요약 삭제 완료",
        description: `${summaryIds.length}개의 요약이 삭제되었습니다.`,
      });
      
      clearSelection();
    } catch (error) {
      toast({
        title: "삭제 실패",
        description: "요약 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setDeletingSummaries(new Set());
    }
  };

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
        {/* 선택된 항목 정보 및 일괄 작업 */}
        {selectedSummaries.size > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {selectedSummaries.size}개 요약 선택됨
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                >
                  <X className="w-4 h-4 mr-1" />
                  선택 해제
                </Button>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                disabled={deletingSummaries.size > 0}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                선택된 요약 삭제
              </Button>
            </div>
          </div>
        )}

        {/* 전체 선택 체크박스 */}
        {displayedSummaries.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <Checkbox
              checked={displayedSummaries.length > 0 && selectedSummaries.size === displayedSummaries.length}
              onCheckedChange={toggleSelectAll}
              className="border-gray-300"
            />
            <span className="text-sm text-muted-foreground">전체 선택</span>
          </div>
        )}

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
                    <div className="flex items-start gap-3 flex-1">
                      <Checkbox
                        checked={selectedSummaries.has(summary.id)}
                        onCheckedChange={() => toggleSummarySelection(summary.id)}
                        className="mt-1"
                      />
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
                              <Badge key={index} variant="outline" className="text-xs tag-badge">
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
      
      {/* 삭제 확인 대화상자 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>요약 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              선택한 {selectedSummaries.size}개의 요약을 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={deletingSummaries.size > 0}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deletingSummaries.size > 0 ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
