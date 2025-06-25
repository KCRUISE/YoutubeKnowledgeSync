import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { StatsCards } from "@/components/stats-cards";
import { ChannelList } from "@/components/channel-list";
import { SummaryList } from "@/components/summary-list";
import { ChannelModal } from "@/components/channel-modal";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Settings } from "lucide-react";

export default function Dashboard() {
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <Header 
          title="대시보드"
          subtitle="등록된 채널의 최신 콘텐츠를 확인하고 요약을 관리하세요"
          onAddChannel={() => setIsChannelModalOpen(true)}
        />
        
        <div className="p-6">
          <StatsCards />
        </div>

        <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <ChannelList />
          </div>
          <div className="lg:col-span-2">
            <SummaryList />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-6 pb-6">
          <div className="bg-gradient-to-r from-primary to-secondary rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">빠른 작업</h3>
                <p className="text-blue-100 text-sm">새로운 채널을 추가하거나 요약 설정을 변경하세요</p>
              </div>
              <div className="flex items-center space-x-3">
                <Button 
                  onClick={() => setIsChannelModalOpen(true)}
                  className="bg-white text-primary hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  채널 추가
                </Button>
                <Button 
                  variant="ghost" 
                  className="bg-white/20 text-white hover:bg-white/30"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  설정
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <ChannelModal 
        open={isChannelModalOpen}
        onOpenChange={setIsChannelModalOpen}
      />
    </div>
  );
}
