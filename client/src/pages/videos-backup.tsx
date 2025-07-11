import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  PlayCircle,
  Clock,
  Eye,
  Sparkles,
  CheckCircle,
  Search,
  Grid,
  List,
  LayoutGrid,
  SortAsc,
  SortDesc,
  ChevronLeft,
  ChevronRight,
  Filter,
  Trash2,
  AlertCircle,
  X,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Channel, Video } from "@shared/schema";

type ViewMode = "list" | "grid" | "detailed";
type SortBy = "date" | "title" | "views" | "duration";
type SortOrder = "asc" | "desc";

export default function Videos() {
  const [selectedChannelId, setSelectedChannelId] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [selectedVideos, setSelectedVideos] = useState<Set<number>>(new Set());
  const [generatingVideos, setGeneratingVideos] = useState<Set<number>>(new Set());
  const [deletingVideos, setDeletingVideos] = useState<Set<number>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [filterBySummary, setFilterBySummary] = useState<string>("all"); // "all", "summarized", "not-summarized"
  const { toast } = useToast();

  const { data: channels = [], isLoading: channelsLoading } = useQuery<
    Channel[]
  >({
    queryKey: ["/api/channels"],
  });

  const { data: videos = [], isLoading: videosLoading } = useQuery<Video[]>({
    queryKey: ["/api/videos", selectedChannelId],
    queryFn: async () => {
      const url =
        selectedChannelId === "all"
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

  const deleteVideoMutation = useMutation({
    mutationFn: async (videoId: number) => {
      setDeletingVideos(prev => new Set(prev).add(videoId));
      await apiRequest("DELETE", `/api/videos/${videoId}`);
    },
    onSuccess: (_, videoId) => {
      setDeletingVideos(prev => {
        const newSet = new Set(prev);
        newSet.delete(videoId);
        return newSet;
      });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/summaries"] });
      toast({ title: "영상이 성공적으로 삭제되었습니다." });
    },
    onError: (error, videoId) => {
      setDeletingVideos(prev => {
        const newSet = new Set(prev);
        newSet.delete(videoId);
        return newSet;
      });
      toast({
        title: "영상 삭제 실패",
        description:
          error instanceof Error
            ? error.message
            : "영상을 삭제하는 데 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const createSummary = async (videoId: number) => {
    setGeneratingVideos(prev => new Set(prev).add(videoId));
    
    try {
      await apiRequest("POST", `/api/summaries/${videoId}`);
      queryClient.invalidateQueries({ queryKey: ["/api/summaries"] });
      toast({ title: "요약이 성공적으로 생성되었습니다." });
    } catch (error) {
      toast({
        title: "요약 생성 실패",
        description:
          error instanceof Error
            ? error.message
            : "요약을 생성하는 데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setGeneratingVideos(prev => {
        const newSet = new Set(prev);
        newSet.delete(videoId);
        return newSet;
      });
    }
  };

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
    const channel = (channels as Channel[]).find(
      (c: Channel) => c.id === channelId,
    );
    return channel?.name || "알 수 없는 채널";
  };

  const hasSummary = (videoId: number) => {
    return (summaries as any[]).some((s: any) => s.videoId === videoId);
  };

  // 다중 선택 관련 함수들
  const toggleVideoSelection = (videoId: number) => {
    const newSelected = new Set(selectedVideos);
    if (newSelected.has(videoId)) {
      newSelected.delete(videoId);
    } else {
      newSelected.add(videoId);
    }
    setSelectedVideos(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedVideos.size === currentVideos.length) {
      setSelectedVideos(new Set());
    } else {
      setSelectedVideos(new Set(currentVideos.map((v: any) => v.id)));
    }
  };

  const clearSelection = () => {
    setSelectedVideos(new Set());
    setShowDeleteDialog(false);
  };

  const handleBulkDelete = async () => {
    if (selectedVideos.size === 0) return;
    
    const videosToDelete = Array.from(selectedVideos);
    try {
      await Promise.all(
        videosToDelete.map(videoId => 
          apiRequest("DELETE", `/api/videos/${videoId}`)
        )
      );
      
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/summaries"] });
      
      toast({ 
        title: `${videosToDelete.length}개의 영상이 삭제되었습니다.` 
      });
      
      setSelectedVideos(new Set());
      setShowDeleteDialog(false);
    } catch (error) {
      toast({
        title: "영상 삭제 실패",
        description: "일부 영상을 삭제하는 데 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  // 필터링 및 정렬된 비디오
  const filteredAndSortedVideos = videos
    .filter((video: Video) => {
      const matchesSearch =
        video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // 요약 상태 필터링
      if (filterBySummary === "summarized") {
        return matchesSearch && hasSummary(video.id);
      } else if (filterBySummary === "not-summarized") {
        return matchesSearch && !hasSummary(video.id);
      }
      
      return matchesSearch;
    })
    .sort((a: Video, b: Video) => {
      switch (sortBy) {
        case "title":
          return sortOrder === "asc" ? 
            a.title.localeCompare(b.title) : 
            b.title.localeCompare(a.title);
        case "views":
          const aViews = a.viewCount || 0;
          const bViews = b.viewCount || 0;
          return sortOrder === "asc" ? aViews - bViews : bViews - aViews;
        case "duration":
          const aDuration = a.duration || "0";
          const bDuration = b.duration || "0";
          return sortOrder === "asc" ? 
            aDuration.localeCompare(bDuration) : 
            bDuration.localeCompare(aDuration);
        case "date":
        default:
          return sortOrder === "asc" ? 
            new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime() :
            new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      }
    });

  // 페이지네이션
  const totalPages = Math.ceil(filteredAndSortedVideos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentVideos = filteredAndSortedVideos.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSortChange = (newSortBy: SortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(newSortBy);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleChannelChange = (channelId: string) => {
    setSelectedChannelId(channelId);
    setCurrentPage(1);
  };

  if (channelsLoading || videosLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header 
            title="영상 관리" 
            subtitle="YouTube 영상을 관리하고 요약을 생성하세요" 
          />
          <div className="flex-1 p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-full mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header 
          title="영상 관리" 
          subtitle="YouTube 영상을 관리하고 요약을 생성하세요"
          onSearch={handleSearch}
        />
        <div className="flex-1 p-6 space-y-6">
          {/* 필터 및 정렬 컨트롤 */}
          <div className="flex flex-wrap items-center gap-4 p-4 bg-card rounded-lg border">
            {/* 채널 선택 */}
            <Select value={selectedChannelId} onValueChange={handleChannelChange}>
              <SelectTrigger className="w-48">
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

            {/* 요약 상태 필터 */}
            <Select value={filterBySummary} onValueChange={setFilterBySummary}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="요약 상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 영상</SelectItem>
                <SelectItem value="summarized">요약 완료</SelectItem>
                <SelectItem value="not-summarized">요약 안됨</SelectItem>
              </SelectContent>
            </Select>

            {/* 정렬 옵션 */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSortChange("date")}
                className={sortBy === "date" ? "bg-accent" : ""}
              >
                날짜 {sortBy === "date" && (sortOrder === "asc" ? <SortAsc className="w-4 h-4 ml-1" /> : <SortDesc className="w-4 h-4 ml-1" />)}
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
                onClick={() => handleSortChange("views")}
                className={sortBy === "views" ? "bg-accent" : ""}
              >
                조회수 {sortBy === "views" && (sortOrder === "asc" ? <SortAsc className="w-4 h-4 ml-1" /> : <SortDesc className="w-4 h-4 ml-1" />)}
              </Button>
            </div>

            {/* 화면 모드 선택 */}
            <div className="flex items-center gap-2 ml-auto">
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

          {/* 선택된 영상 수 및 일괄 삭제 버튼 */}
          {selectedVideos.size > 0 && (
            <div className="flex items-center justify-between p-4 bg-accent rounded-lg border">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedVideos.size === currentVideos.length}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm font-medium">
                  {selectedVideos.size}개 선택됨
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                disabled={selectedVideos.size === 0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                삭제
              </Button>
            </div>
          )}

          {/* 영상 목록 */}
          <div className="space-y-4">
            {currentVideos.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">영상이 없습니다.</p>
              </div>
            ) : (
              <>
                {viewMode === "list" && (
                  <div className="space-y-4">
                    {currentVideos.map((video: Video) => (
                      <Card key={video.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <Checkbox
                              checked={selectedVideos.has(video.id)}
                              onCheckedChange={() => toggleVideoSelection(video.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-lg mb-2 line-clamp-2">
                                    {video.title}
                                  </h3>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                                    <span className="flex items-center gap-1">
                                      <PlayCircle className="w-4 h-4" />
                                      {getChannelName(video.channelId)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-4 h-4" />
                                      {formatDate(video.publishedAt)}
                                    </span>
                                    {video.duration && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        {formatDuration(video.duration)}
                                      </span>
                                    )}
                                    {video.viewCount && (
                                      <span className="flex items-center gap-1">
                                        <Eye className="w-4 h-4" />
                                        {formatViewCount(video.viewCount)} 조회수
                                      </span>
                                    )}
                                  </div>
                                  {hasSummary(video.id) && (
                                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      요약 완료
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                  {!hasSummary(video.id) && (
                                    <Button
                                      size="sm"
                                      onClick={() => createSummary(video.id)}
                                      disabled={generatingVideos.has(video.id)}
                                    >
                                      <Sparkles className="w-4 h-4 mr-2" />
                                      {generatingVideos.has(video.id) ? "요약 생성 중..." : "요약 생성"}
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

                {viewMode === "grid" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentVideos.map((video: Video) => (
                      <Card key={video.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-2 mb-3">
                            <Checkbox
                              checked={selectedVideos.has(video.id)}
                              onCheckedChange={() => toggleVideoSelection(video.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium mb-2 line-clamp-2">
                                {video.title}
                              </h3>
                              <div className="text-sm text-muted-foreground mb-2">
                                <p className="truncate">{getChannelName(video.channelId)}</p>
                                <p>{formatDate(video.publishedAt)}</p>
                                {video.viewCount && (
                                  <p className="flex items-center gap-1 mt-1">
                                    <Eye className="w-3 h-3" />
                                    {formatViewCount(video.viewCount)} 조회수
                                  </p>
                                )}
                              </div>
                              {hasSummary(video.id) ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  요약 완료
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => createSummary(video.id)}
                                  disabled={generatingVideos.has(video.id)}
                                  className="w-full"
                                >
                                  <Sparkles className="w-4 h-4 mr-2" />
                                  {generatingVideos.has(video.id) ? "요약 생성 중..." : "요약 생성"}
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {viewMode === "detailed" && (
                  <div className="space-y-6">
                    {currentVideos.map((video: Video) => (
                      <Card key={video.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <Checkbox
                              checked={selectedVideos.has(video.id)}
                              onCheckedChange={() => toggleVideoSelection(video.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-xl mb-3">
                                {video.title}
                              </h3>
                              {video.description && (
                                <p className="text-muted-foreground mb-4 line-clamp-3">
                                  {video.description}
                                </p>
                              )}
                              <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4">
                                <span className="flex items-center gap-1">
                                  <PlayCircle className="w-4 h-4" />
                                  {getChannelName(video.channelId)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {formatDate(video.publishedAt)}
                                </span>
                                {video.duration && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {formatDuration(video.duration)}
                                  </span>
                                )}
                                {video.viewCount && (
                                  <span className="flex items-center gap-1">
                                    <Eye className="w-4 h-4" />
                                    {formatViewCount(video.viewCount)} 조회수
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                {hasSummary(video.id) ? (
                                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    요약 완료
                                  </Badge>
                                ) : (
                                  <Button
                                    onClick={() => createSummary(video.id)}
                                    disabled={generatingVideos.has(video.id)}
                                  >
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    {generatingVideos.has(video.id) ? "요약 생성 중..." : "요약 생성"}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {startIndex + 1}-{Math.min(endIndex, filteredAndSortedVideos.length)} / {filteredAndSortedVideos.length}개 영상
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                {/* 페이지 번호 */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNumber = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    return (
                      <Button
                        key={pageNumber}
                        variant={currentPage === pageNumber ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNumber)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNumber}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 삭제 확인 대화상자 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>영상 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              선택한 {selectedVideos.size}개의 영상을 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}