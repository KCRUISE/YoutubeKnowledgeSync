import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface ProgressItem {
  id: number;
  videoTitle: string;
  channelName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  startTime?: string;
  endTime?: string;
  error?: string;
}

export function ProgressMonitor() {
  const [open, setOpen] = useState(false);

  // 실제 진행 상태 데이터를 가져오는 쿼리 (향후 구현)
  const { data: progressData, isLoading } = useQuery({
    queryKey: ['/api/progress'],
    enabled: open,
    refetchInterval: 2000, // 2초마다 갱신
  });

  // 임시 데이터 - 실제로는 서버에서 가져온 데이터 사용
  const mockProgressData: ProgressItem[] = [
    {
      id: 1,
      videoTitle: "React 18의 새로운 기능들",
      channelName: "코드팩토리",
      status: 'processing',
      progress: 65,
      startTime: new Date(Date.now() - 30000).toISOString(),
    },
    {
      id: 2,
      videoTitle: "TypeScript 고급 패턴",
      channelName: "개발자 채널",
      status: 'completed',
      progress: 100,
      startTime: new Date(Date.now() - 60000).toISOString(),
      endTime: new Date(Date.now() - 10000).toISOString(),
    },
    {
      id: 3,
      videoTitle: "Next.js 14 마이그레이션",
      channelName: "웹 개발자",
      status: 'pending',
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-500" />;
      case 'processing':
        return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">대기중</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">처리중</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">완료</Badge>;
      case 'failed':
        return <Badge variant="destructive">실패</Badge>;
      default:
        return null;
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString();
  };

  const activeTasks = mockProgressData.filter(item => item.status === 'processing' || item.status === 'pending');
  const completedTasks = mockProgressData.filter(item => item.status === 'completed');
  const failedTasks = mockProgressData.filter(item => item.status === 'failed');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Activity className="w-4 h-4 mr-2" />
          진행 상태
          {activeTasks.length > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-blue-500">
              {activeTasks.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>요약 진행 상태</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* 요약 통계 */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">진행중/대기중</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-blue-600">{activeTasks.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">완료</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-green-600">{completedTasks.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">실패</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-red-600">{failedTasks.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* 진행중인 작업 */}
          {activeTasks.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">진행중인 작업</h3>
              <div className="space-y-3">
                {activeTasks.map((item) => (
                  <Card key={item.id} className="border-blue-200 dark:border-blue-800">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          {getStatusIcon(item.status)}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{item.videoTitle}</h4>
                            <p className="text-sm text-muted-foreground">{item.channelName}</p>
                            {item.status === 'processing' && item.progress && (
                              <div className="mt-2 space-y-1">
                                <Progress value={item.progress} className="h-2" />
                                <p className="text-xs text-muted-foreground">
                                  {item.progress}% 완료
                                </p>
                              </div>
                            )}
                            {item.startTime && (
                              <p className="text-xs text-muted-foreground mt-1">
                                시작: {formatTime(item.startTime)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(item.status)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* 최근 완료된 작업 */}
          {completedTasks.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">최근 완료</h3>
              <div className="space-y-3">
                {completedTasks.slice(0, 5).map((item) => (
                  <Card key={item.id} className="border-green-200 dark:border-green-800">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          {getStatusIcon(item.status)}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{item.videoTitle}</h4>
                            <p className="text-sm text-muted-foreground">{item.channelName}</p>
                            {item.endTime && (
                              <p className="text-xs text-muted-foreground mt-1">
                                완료: {formatTime(item.endTime)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(item.status)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* 실패한 작업 */}
          {failedTasks.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-red-600">실패한 작업</h3>
              <div className="space-y-3">
                {failedTasks.map((item) => (
                  <Card key={item.id} className="border-red-200 dark:border-red-800">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          {getStatusIcon(item.status)}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{item.videoTitle}</h4>
                            <p className="text-sm text-muted-foreground">{item.channelName}</p>
                            {item.error && (
                              <p className="text-xs text-red-600 mt-1">{item.error}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(item.status)}
                          <Button size="sm" variant="outline">
                            재시도
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {mockProgressData.length === 0 && (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">현재 진행중인 작업이 없습니다.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}