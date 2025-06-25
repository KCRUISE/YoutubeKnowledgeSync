import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tv } from "lucide-react";
import { Link } from "wouter";
import type { ChannelWithStats } from "@shared/schema";

export function ChannelList() {
  const { data: channels = [], isLoading } = useQuery<ChannelWithStats[]>({
    queryKey: ["/api/channels"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>등록된 채널</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-3 p-3">
                  <div className="w-12 h-12 bg-muted rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-3/4 mb-1"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
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
          <CardTitle>등록된 채널</CardTitle>
          <Link href="/channels">
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
              전체 보기
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {channels.length === 0 ? (
          <div className="text-center py-8">
            <Tv className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">등록된 채널이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-4">
            {channels.slice(0, 5).map((channel) => (
              <div
                key={channel.id}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer"
              >
                {channel.thumbnailUrl ? (
                  <img
                    src={channel.thumbnailUrl}
                    alt={channel.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                    <Tv className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {channel.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {channel.newVideosCount > 0 
                      ? `${channel.newVideosCount}개의 새 영상`
                      : `${channel.videoCount}개 영상`
                    }
                  </p>
                </div>
                {channel.newVideosCount > 0 && (
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
