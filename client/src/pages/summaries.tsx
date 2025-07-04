import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FileText, Eye, Download, Clock, ExternalLink, Trash2, X, Search, Grid, List, LayoutGrid, SortAsc, SortDesc, ChevronLeft, ChevronRight, Calendar, Tag } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { SummaryDetailModal } from "@/components/summary-detail-modal";
import type { SummaryWithDetails, ChannelWithStats } from "@shared/schema";

type ViewMode = "list" | "grid" | "detailed";
type SortBy = "date" | "title" | "channel" | "views";
type SortOrder = "asc" | "desc";

export default function Summaries() {
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [selectedSummaries, setSelectedSummaries] = useState<Set<number>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingSummaries, setDeletingSummaries] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("__all__");
  const [insightFilter, setInsightFilter] = useState("__all__");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [selectedSummary, setSelectedSummary] = useState<SummaryWithDetails | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const { toast } = useToast();

  const { data: channels = [] } = useQuery<ChannelWithStats[]>({
    queryKey: ["/api/channels"],
  });

  const { data: summaries = [], isLoading } = useQuery<SummaryWithDetails[]>({
    queryKey: ["/api/summaries"],
  });

  // 태그와 인사이트 분리 수집
  const allTags = Array.from(new Set(
    summaries.flatMap(summary => summary.tags || [])
  )).sort();

  const allInsights = Array.from(new Set(
    summaries.flatMap(summary => summary.insights || [])
  )).sort();

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
      if (tagFilter && tagFilter !== "__all__") {
        if (!summary.tags || !summary.tags.some((tag: string) => tag === tagFilter)) {
          return false;
        }
      }
      
      // 인사이트 필터
      if (insightFilter && insightFilter !== "__all__") {
        if (!summary.insights || !summary.insights.some((insight: string) => insight === insightFilter)) {
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
  const currentSummaries = filteredSummaries.slice(startIndex, startIndex + itemsPerPage);

  // 핸들러 함수들
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedSummaries(new Set());
  };

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

  const handleInsightFilterChange = (insight: string) => {
    setInsightFilter(insight);
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
      
      if (contentType?.includes('application/json')) {
        const result = await response.json();
        if (result.method === 'obsidian_direct') {
          toast({
            title: "Obsidian 저장 완료",
            description: `경로: ${result.path}`,
          });
          return;
        }
      }
      
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
      toast({
        title: "내보내기 실패",
        description: "내보내기 중 오류가 발생했습니다.",
        variant: "destructive",
      });
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

  const handleSummaryClick = (summary: SummaryWithDetails) => {
    setSelectedSummary(summary);
    setShowDetailModal(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex bg-slate-50 dark:bg-background">
        <Sidebar />
        <main className="flex-1 flex flex-col">
          <Header 
            title="요약 목록" 
            subtitle="AI가 생성한 YouTube 영상 요약을 관리하세요"
          />
          <div className="p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse border border-border rounded-lg p-4">
                <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                <div className="h-5 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-full mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
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
          subtitle={`총 ${filteredSummaries.length}개의 요약`}
        />
        
        <div className="flex-1 p-6 space-y-6">
          {/* 검색 및 필터 */}
          <div className="space-y-4 p-4 bg-card rounded-lg border">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-64 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="제목, 내용, 채널명으로 검색..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Button 
                size="sm" 
                onClick={handleExportAll}
                className="bg-accent hover:bg-accent/90 whitespace-nowrap"
              >
                <Download className="w-4 h-4 mr-1" />
                전체 내보내기
              </Button>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">필터:</span>
              </div>

              <Select value={tagFilter} onValueChange={handleTagFilterChange}>
                <SelectTrigger className="w-44">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    <SelectValue placeholder="태그 선택" />
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="__all__">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <span className="font-medium">모든 태그</span>
                      <Badge variant="secondary" className="text-xs">
                        {allTags.length}개
                      </Badge>
                    </div>
                  </SelectItem>
                  {allTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      <span className="truncate">
                        {tag.length > 30 ? `${tag.substring(0, 30)}...` : tag}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={insightFilter} onValueChange={handleInsightFilterChange}>
                <SelectTrigger className="w-48">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">💡</span>
                    <SelectValue placeholder="인사이트 선택" />
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="__all__">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <span className="font-medium">모든 인사이트</span>
                      <Badge variant="secondary" className="text-xs">
                        {allInsights.length}개
                      </Badge>
                    </div>
                  </SelectItem>
                  {allInsights.map((insight) => (
                    <SelectItem key={insight} value={insight}>
                      <span className="truncate">
                        {insight.length > 30 ? `${insight.substring(0, 30)}...` : insight}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

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
          </div>

          {/* 활성 필터 표시 */}
          {(searchQuery || tagFilter !== "__all__" || insightFilter !== "__all__" || selectedChannel !== "all") && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  활성 필터:
                </span>
                {searchQuery && (
                  <Badge variant="secondary" className="text-blue-700 dark:text-blue-300">
                    검색: {searchQuery}
                  </Badge>
                )}
                {tagFilter !== "__all__" && (
                  <Badge variant="secondary" className="text-blue-700 dark:text-blue-300">
                    태그: {tagFilter.length > 20 ? `${tagFilter.substring(0, 20)}...` : tagFilter}
                  </Badge>
                )}
                {insightFilter !== "__all__" && (
                  <Badge variant="secondary" className="text-blue-700 dark:text-blue-300">
                    💡 인사이트: {insightFilter.length > 20 ? `${insightFilter.substring(0, 20)}...` : insightFilter}
                  </Badge>
                )}
                {selectedChannel !== "all" && (
                  <Badge variant="secondary" className="text-blue-700 dark:text-blue-300">
                    채널: {channels.find(c => c.id.toString() === selectedChannel)?.name}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setTagFilter("__all__");
                    setInsightFilter("__all__");
                    setSelectedChannel("all");
                    setCurrentPage(1);
                    setSelectedSummaries(new Set());
                  }}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 h-6 px-2"
                >
                  <X className="w-3 h-3 mr-1" />
                  모든 필터 초기화
                </Button>
              </div>
            </div>
          )}

          {/* 선택된 항목 정보 */}
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

          {/* 정렬 및 보기 옵션 */}
          <div className="flex items-center justify-between">
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
                {searchQuery || tagFilter !== "__all__" || insightFilter !== "__all__" ? "검색 결과가 없습니다" : "생성된 요약이 없습니다"}
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
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleSummaryClick(summary)}>
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge variant="secondary">
                                {summary.channelName}
                              </Badge>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(summary.videoPublishedAt)}
                              </span>
                            </div>
                            
                            <h4 className="text-sm font-medium text-foreground mb-2 leading-relaxed hover:text-blue-600">
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
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleSummaryClick(summary)}>
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge variant="secondary" className="text-xs">
                                {summary.channelName}
                              </Badge>
                            </div>
                            
                            <h4 className="font-medium mb-2 line-clamp-2 text-sm hover:text-blue-600">
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
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleSummaryClick(summary)}>
                            <div className="flex items-center space-x-3 mb-3">
                              <Badge variant="secondary">
                                {summary.channelName}
                              </Badge>
                              <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {formatDate(summary.videoPublishedAt)}
                              </span>
                            </div>
                            
                            <h3 className="font-medium text-lg mb-3 hover:text-blue-600">
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

          {/* 요약 상세 모달 */}
          <SummaryDetailModal 
            summary={selectedSummary}
            open={showDetailModal}
            onOpenChange={setShowDetailModal}
          />
        </div>
      </main>
    </div>
  );
}