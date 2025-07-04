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
  const [generatingVideos, setGeneratingVideos] = useState<Set<number>>(new Set());
  const [deletingVideos, setDeletingVideos] = useState<Set<number>>(new Set());
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

  const handleDeleteVideo = (videoId: number) => {
    if (confirm("정말로 이 영상을 삭제하시겠습니까? 관련된 요약도 함께 삭제됩니다.")) {
      deleteVideoMutation.mutate(videoId);
    }
  };

  const isVideoGenerating = (videoId: number) => {
    return generatingVideos.has(videoId);
  };

  const isVideoDeleting = (videoId: number) => {
    return deletingVideos.has(videoId);
  };

  // 필터링 및 정렬된 비디오
  const filteredAndSortedVideos = videos
    .filter((video: Video) => {
      const matchesSearch =
        video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    })
    .sort((a: Video, b: Video) => {
      let comparison = 0;

      switch (sortBy) {
        case "date":
          comparison =
            new Date(a.publishedAt).getTime() -
            new Date(b.publishedAt).getTime();
          break;
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "views":
          comparison = (a.viewCount || 0) - (b.viewCount || 0);
          break;
        case "duration":
          // 간단한 시간 비교 - 실제로는 더 복잡한 파싱이 필요할 수 있음
          const durationA = a.duration || "0:00";
          const durationB = b.duration || "0:00";
          comparison = durationA.localeCompare(durationB);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === "asc" ? comparison : -comparison;
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
    setCurrentPage(1); // 정렬 변경 시 첫 페이지로 이동
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // 검색 시 첫 페이지로 이동
  };

  const handleChannelChange = (channelId: string) => {
    setSelectedChannelId(channelId);
    setCurrentPage(1); // 채널 변경 시 첫 페이지로 이동
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
          {/* 컨트롤 바 */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <Select
                  value={selectedChannelId}
                  onValueChange={handleChannelChange}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="채널 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 채널</SelectItem>
                    {(channels as Channel[]).map((channel: Channel) => (
                      <SelectItem
                        key={channel.id}
                        value={channel.id.toString()}
                      >
                        {channel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="영상 제목 또는 설명 검색..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* 정렬 옵션 */}
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <Select
                    value={sortBy}
                    onValueChange={(value) => handleSortChange(value as SortBy)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">날짜순</SelectItem>
                      <SelectItem value="title">제목순</SelectItem>
                      <SelectItem value="views">조회수순</SelectItem>
                      <SelectItem value="duration">시간순</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                    }
                  >
                    {sortOrder === "asc" ? (
                      <SortAsc className="w-4 h-4" />
                    ) : (
                      <SortDesc className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* 보기 모드 */}
                <div className="flex items-center bg-muted rounded-lg p-1">
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "detailed" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("detailed")}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* 결과 요약 */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                총 {filteredAndSortedVideos.length}개 영상 중 {startIndex + 1}-
                {Math.min(endIndex, filteredAndSortedVideos.length)}번째 표시
              </span>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => setItemsPerPage(parseInt(value))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6개</SelectItem>
                  <SelectItem value="12">12개</SelectItem>
                  <SelectItem value="24">24개</SelectItem>
                  <SelectItem value="48">48개</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredAndSortedVideos.length === 0 ? (
            <div className="text-center py-12">
              <PlayCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? "검색 결과가 없습니다" : "영상이 없습니다"}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery
                  ? "다른 검색어를 시도해보세요"
                  : "채널에서 새로운 영상을 가져오거나 다른 채널을 선택해보세요"}
              </p>
            </div>
          ) : (
            <>
              {/* 리스트 보기 */}
              {viewMode === "list" && (
                <div className="space-y-4">
                  {currentVideos.map((video: Video) => (
                    <Card
                      key={video.id}
                      className="hover:shadow-md transition-shadow"
                    >
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
                              <Badge variant="outline" className="mr-2 secondary-badge">
                                {getChannelName(video.channelId)}
                              </Badge>
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
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                {hasSummary(video.id) ? (
                                  <Badge
                                    variant="default"
                                    className="flex items-center"
                                  >
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
                                  onClick={() =>
                                    window.open(
                                      `https://www.youtube.com/watch?v=${video.videoId}`,
                                      "_blank",
                                    )
                                  }
                                >
                                  <PlayCircle className="w-4 h-4 mr-1" />
                                  영상 보기
                                </Button>
                                {!hasSummary(video.id) && (
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      createSummary(video.id)
                                    }
                                    disabled={isVideoGenerating(video.id)}
                                  >
                                    <Sparkles className="w-4 h-4 mr-1" />
                                    {isVideoGenerating(video.id)
                                      ? "요약 중..."
                                      : "요약 생성"}
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteVideo(video.id)}
                                  disabled={isVideoDeleting(video.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  {isVideoDeleting(video.id) ? (
                                    <AlertCircle className="w-4 h-4 mr-1 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4 mr-1" />
                                  )}
                                  삭제
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* 그리드 보기 */}
              {viewMode === "grid" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {currentVideos.map((video: Video) => (
                    <Card
                      key={video.id}
                      className="hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-4">
                        <div className="aspect-video bg-muted rounded mb-3 flex items-center justify-center">
                          <PlayCircle className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold text-sm line-clamp-2 mb-2">
                          {video.title}
                        </h3>
                        <div className="space-y-2 text-xs text-muted-foreground">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatDuration(video.duration)}
                            </span>
                            <span className="flex items-center">
                              <Eye className="w-3 h-3 mr-1" />
                              {formatViewCount(video.viewCount)}
                            </span>
                          </div>
                          <p className="text-xs">
                            {formatDate(video.publishedAt)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          {hasSummary(video.id) ? (
                            <Badge variant="default" className="text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              요약 완료
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              요약 대기
                            </Badge>
                          )}
                          <div className="flex space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                window.open(
                                  `https://www.youtube.com/watch?v=${video.videoId}`,
                                  "_blank",
                                )
                              }
                            >
                              <PlayCircle className="w-3 h-3" />
                            </Button>
                            {!hasSummary(video.id) && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  createSummary(video.id)
                                }
                                disabled={isVideoGenerating(video.id)}
                              >
                                <Sparkles className="w-3 h-3" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteVideo(video.id)}
                              disabled={isVideoDeleting(video.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              {isVideoDeleting(video.id) ? (
                                <AlertCircle className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* 상세 보기 */}
              {viewMode === "detailed" && (
                <div className="space-y-6">
                  {currentVideos.map((video: Video) => (
                    <Card
                      key={video.id}
                      className="hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-6">
                        <div className="flex space-x-6">
                          <div className="w-48 h-32 bg-muted rounded flex items-center justify-center flex-shrink-0">
                            <PlayCircle className="w-12 h-12 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg text-foreground line-clamp-2 mb-3">
                              {video.title}
                            </h3>
                            <div className="flex items-center space-x-6 text-sm text-muted-foreground mb-4">
                              <Badge variant="outline" className="mr-2">
                                {getChannelName(video.channelId)}
                              </Badge>
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
                              <p className="text-sm text-muted-foreground line-clamp-4 mb-4">
                                {video.description}
                              </p>
                            )}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                {hasSummary(video.id) ? (
                                  <Badge
                                    variant="default"
                                    className="flex items-center"
                                  >
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
                                  onClick={() =>
                                    window.open(
                                      `https://www.youtube.com/watch?v=${video.videoId}`,
                                      "_blank",
                                    )
                                  }
                                >
                                  <PlayCircle className="w-4 h-4 mr-1" />
                                  영상 보기
                                </Button>
                                {!hasSummary(video.id) && (
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      createSummary(video.id)
                                    }
                                    disabled={isVideoGenerating(video.id)}
                                  >
                                    <Sparkles className="w-4 h-4 mr-1" />
                                    {isVideoGenerating(video.id)
                                      ? "요약 중..."
                                      : "요약 생성"}
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteVideo(video.id)}
                                  disabled={isVideoDeleting(video.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  {isVideoDeleting(video.id) ? (
                                    <AlertCircle className="w-4 h-4 mr-1 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4 mr-1" />
                                  )}
                                  삭제
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    이전
                  </Button>

                  {(() => {
                    const maxVisiblePages = 5;
                    const halfRange = Math.floor(maxVisiblePages / 2);
                    let startPage = Math.max(1, currentPage - halfRange);
                    let endPage = Math.min(
                      totalPages,
                      startPage + maxVisiblePages - 1,
                    );

                    if (endPage - startPage + 1 < maxVisiblePages) {
                      startPage = Math.max(1, endPage - maxVisiblePages + 1);
                    }

                    const pages = [];

                    if (startPage > 1) {
                      pages.push(
                        <Button
                          key={1}
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(1)}
                        >
                          1
                        </Button>,
                      );
                      if (startPage > 2) {
                        pages.push(
                          <span key="start-ellipsis" className="px-2">
                            ...
                          </span>,
                        );
                      }
                    }

                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <Button
                          key={i}
                          variant={currentPage === i ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(i)}
                        >
                          {i}
                        </Button>,
                      );
                    }

                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        pages.push(
                          <span key="end-ellipsis" className="px-2">
                            ...
                          </span>,
                        );
                      }
                      pages.push(
                        <Button
                          key={totalPages}
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(totalPages)}
                        >
                          {totalPages}
                        </Button>,
                      );
                    }

                    return pages;
                  })()}

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
            </>
          )}
        </div>
      </main>
    </div>
  );
}
