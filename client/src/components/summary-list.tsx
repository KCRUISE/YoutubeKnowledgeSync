import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FileText, Eye, Download, Clock, ExternalLink, ChevronDown, Trash2, X, Search, Grid, List, LayoutGrid, SortAsc, SortDesc, ChevronLeft, ChevronRight, Calendar, Tag } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SummaryWithDetails, ChannelWithStats } from "@shared/schema";

type ViewMode = "list" | "grid" | "detailed";
type SortBy = "date" | "title" | "channel" | "views";
type SortOrder = "asc" | "desc";

export function SummaryList() {
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [selectedSummaries, setSelectedSummaries] = useState<Set<number>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingSummaries, setDeletingSummaries] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const { toast } = useToast();

  const { data: channels = [] } = useQuery<ChannelWithStats[]>({
    queryKey: ["/api/channels"],
  });

  const { data: summaries = [], isLoading } = useQuery<SummaryWithDetails[]>({
    queryKey: ["/api/summaries", { channelId: selectedChannel !== "all" ? selectedChannel : undefined }],
  });

  // 필터링 로직
  const filteredSummaries = summaries
    .filter(summary => {
      // 채널 필터
      if (selectedChannel !== "all" && summary.channelId.toString() !== selectedChannel) {
        return false;
      }
      
      // 텍스트 검색 필터
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const matchesTitle = summary.title.toLowerCase().includes(searchLower);
        const matchesContent = summary.content.toLowerCase().includes(searchLower);
        const matchesChannel = summary.channelName.toLowerCase().includes(searchLower);
        const matchesTheme = summary.coreTheme?.toLowerCase().includes(searchLower);
        
        if (!matchesTitle && !matchesContent && !matchesChannel && !matchesTheme) {
          return false;
        }
      }
      
      // 태그 필터
      if (tagFilter) {
        const tagLower = tagFilter.toLowerCase();
        let hasTag = false;
        
        if (summary.tags) {
          hasTag = summary.tags.some((tag: string) => tag.toLowerCase().includes(tagLower));
        }
        
        if (summary.insights) {
          hasTag = hasTag || summary.insights.some((insight: string) => insight.toLowerCase().includes(tagLower));
        }
        
        if (!hasTag) {
          return false;
        }
      }
      
      return true;
    })
    .sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case "date":
          compareValue = new Date(a.videoPublishedAt).getTime() - new Date(b.videoPublishedAt).getTime();
          break;
        case "title":
          compareValue = a.title.localeCompare(b.title);
          break;
        case "channel":
          compareValue = a.channelName.localeCompare(b.channelName);
          break;
        case "views":
          compareValue = (a.videoViewCount || 0) - (b.videoViewCount || 0);
          break;
        default:
          compareValue = 0;
      }
      
      return sortOrder === "asc" ? compareValue : -compareValue;
    });

  // 페이지네이션 로직
  const totalPages = Math.ceil(filteredSummaries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSummaries = filteredSummaries.slice(startIndex, endIndex);

  // 페이지 변경시 선택 초기화
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedSummaries(new Set());
  };

  // 검색/필터 변경시 첫 페이지로 이동
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    setSelectedSummaries(new Set());
  };

  const handleTagFilterChange = (tag: string) => {
    setTagFilter(tag);
    setCurrentPage(1);
    setSelectedSummaries(new Set());
  };

  const handleSortChange = (newSortBy: SortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(newSortBy);
      setSortOrder("desc");
    }
    setCurrentPage(1);
    setSelectedSummaries(new Set());
  };

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
    if (selectedSummaries.size === currentSummaries.length) {
      setSelectedSummaries(new Set());
    } else {
      setSelectedSummaries(new Set(currentSummaries.map(s => s.id)));
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
          <CardTitle>요약 목록</CardTitle>
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
    <div className="space-y-6">
      {/* 헤더 및 필터 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">요약 목록</h2>
          <p className="text-muted-foreground">
            총 {filteredSummaries.length}개의 요약
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* 검색 및 필터 */}
      <div className="flex items-center gap-4 p-4 bg-card rounded-lg border">
        {/* 검색 입력 */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="제목, 내용, 채널명으로 검색..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* 태그 필터 */}
        <div className="relative">
          <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="태그 검색..."
            value={tagFilter}
            onChange={(e) => handleTagFilterChange(e.target.value)}
            className="pl-10 w-40"
          />
        </div>

        {/* 채널 필터 */}
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
      </div>

      {/* 정렬 및 보기 옵션 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* 정렬 옵션 */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSortChange("date")}
              className={sortBy === "date" ? "bg-accent" : ""}
            >
              게시일 {sortBy === "date" && (sortOrder === "asc" ? <SortAsc className="w-4 h-4 ml-1" /> : <SortDesc className="w-4 h-4 ml-1" />)}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSortChange("title")}
              className={sortBy === "title" ? "bg-accent" : ""}
            >
              제목 {sortBy === "title" && (sortOrder === "asc" ? <SortAsc className="w-4 h-4 ml-1" /> : <SortDesc className="w-4 h-4 ml-1" />)}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSortChange("channel")}
              className={sortBy === "channel" ? "bg-accent" : ""}
            >
              채널 {sortBy === "channel" && (sortOrder === "asc" ? <SortAsc className="w-4 h-4 ml-1" /> : <SortDesc className="w-4 h-4 ml-1" />)}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSortChange("views")}
              className={sortBy === "views" ? "bg-accent" : ""}
            >
              조회수 {sortBy === "views" && (sortOrder === "asc" ? <SortAsc className="w-4 h-4 ml-1" /> : <SortDesc className="w-4 h-4 ml-1" />)}
            </Button>
          </div>
        </div>

        {/* 보기 모드 */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "detailed" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("detailed")}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 선택된 항목 정보 및 일괄 작업 */}
      {selectedSummaries.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
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
      {currentSummaries.length > 0 && (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={currentSummaries.length > 0 && selectedSummaries.size === currentSummaries.length}
            onCheckedChange={toggleSelectAll}
            className="border-gray-300"
          />
          <span className="text-sm text-muted-foreground">전체 선택</span>
        </div>
      )}

      {/* 컨텐츠 영역 */}
      {filteredSummaries.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {searchQuery || tagFilter ? "검색 결과가 없습니다" : "생성된 요약이 없습니다"}
          </p>
        </div>
      ) : (
        <>
          {/* 목록 뷰 */}
          {viewMode === "list" && (
            <div className="space-y-4">
              {currentSummaries.map((summary) => (
                <Card key={summary.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedSummaries.has(summary.id)}
                        onCheckedChange={() => toggleSummarySelection(summary.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant="secondary">
                            {summary.channelName}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
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
                              {summary.insights.slice(0, 2).map((insight: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
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
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* 그리드 뷰 */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentSummaries.map((summary) => (
                <Card key={summary.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2 mb-3">
                      <Checkbox
                        checked={selectedSummaries.has(summary.id)}
                        onCheckedChange={() => toggleSummarySelection(summary.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant="secondary" className="text-xs">
                            {summary.channelName}
                          </Badge>
                        </div>
                        
                        <h4 className="font-medium mb-2 line-clamp-2 text-sm">
                          {summary.title}
                        </h4>
                        
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {summary.content.substring(0, 100)}...
                        </p>
                        
                        <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(summary.videoPublishedAt)}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(summary.videoUrl, '_blank')}
                              className="text-muted-foreground hover:text-primary p-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExport(summary.id)}
                              className="text-muted-foreground hover:text-accent p-1"
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                          {summary.videoViewCount && (
                            <span className="text-xs text-muted-foreground flex items-center">
                              <Eye className="w-3 h-3 mr-1" />
                              {formatViewCount(summary.videoViewCount)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* 상세 뷰 */}
          {viewMode === "detailed" && (
            <div className="space-y-6">
              {currentSummaries.map((summary) => (
                <Card key={summary.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={selectedSummaries.has(summary.id)}
                        onCheckedChange={() => toggleSummarySelection(summary.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-3">
                          <Badge variant="secondary">
                            {summary.channelName}
                          </Badge>
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(summary.videoPublishedAt)}
                          </span>
                        </div>
                        
                        <h3 className="font-medium text-lg mb-3">
                          {summary.title}
                        </h3>
                        
                        {summary.coreTheme && (
                          <div className="text-base text-blue-600 dark:text-blue-400 mb-4 italic font-medium">
                            "{summary.coreTheme}"
                          </div>
                        )}
                        
                        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                          {summary.content.substring(0, 300)}...
                        </p>
                        
                        {summary.insights && summary.insights.length > 0 && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-foreground mb-2">💡 핵심 인사이트:</p>
                            <div className="flex flex-wrap gap-2">
                              {summary.insights.slice(0, 3).map((insight: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {insight.length > 50 ? `${insight.substring(0, 50)}...` : insight}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                          {summary.videoDuration && (
                            <span className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {summary.videoDuration}
                            </span>
                          )}
                          {summary.videoViewCount && (
                            <span className="flex items-center">
                              <Eye className="w-4 h-4 mr-1" />
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
        </>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
            이전
          </Button>
          
          {/* 페이지 번호들 */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
            return (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(pageNum)}
                className="w-8 h-8 p-0"
              >
                {pageNum}
              </Button>
            );
          })}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            다음
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

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
    </div>
  );
}