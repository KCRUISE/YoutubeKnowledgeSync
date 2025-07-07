import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Tv, FileText, TrendingUp, PlayCircle } from "lucide-react";

interface Stats {
  totalChannels: number;
  totalVideos: number;
  totalSummaries: number;
  newThisWeek: number;
  apiUsage: number;
}

export function StatsCards() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-32 bg-muted rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  const statItems = [
    {
      title: "등록된 채널",
      value: stats?.totalChannels || 0,
      icon: Tv,
      bgColor: "bg-blue-100 dark:bg-blue-950",
      iconColor: "text-primary",
    },
    {
      title: "등록된 영상",
      value: stats?.totalVideos || 0,
      icon: PlayCircle,
      bgColor: "bg-orange-100 dark:bg-orange-950",
      iconColor: "text-orange-600",
    },
    {
      title: "총 요약 수",
      value: stats?.totalSummaries || 0,
      icon: FileText,
      bgColor: "bg-green-100 dark:bg-green-950",
      iconColor: "text-accent",
    },
    {
      title: "이번 주 신규",
      value: stats?.newThisWeek || 0,
      icon: TrendingUp,
      bgColor: "bg-purple-100 dark:bg-purple-950",
      iconColor: "text-secondary",
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statItems.map((item, index) => (
        <Card key={index} className="stat-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">{item.title}</p>
                <p className="text-2xl font-semibold text-foreground mt-1">{item.value}</p>
              </div>
              <div className={`w-12 h-12 ${item.bgColor} rounded-lg flex items-center justify-center`}>
                <item.icon className={`${item.iconColor} w-5 h-5`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}