import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Settings, Key, Globe, Zap, Bell, Download } from "lucide-react";
import { useState } from "react";

export default function SettingsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    summaryLanguage: "korean",
    summaryLength: "medium",
    autoSummarize: true,
    newVideoNotify: true,
    summaryCompleteNotify: true,
    exportFormat: "obsidian",
    includeMetadata: true,
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      // 설정 저장 로직 (향후 API 엔드포인트 추가)
      await new Promise(resolve => setTimeout(resolve, 1000)); // 임시 지연
      
      toast({
        title: "설정이 저장되었습니다",
        description: "모든 설정이 성공적으로 저장되었습니다.",
      });
    } catch (error) {
      toast({
        title: "설정 저장 실패",
        description: "설정을 저장하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSettings = () => {
    setSettings({
      summaryLanguage: "korean",
      summaryLength: "medium",
      autoSummarize: true,
      newVideoNotify: true,
      summaryCompleteNotify: true,
      exportFormat: "obsidian",
      includeMetadata: true,
    });
    
    toast({
      title: "설정이 초기화되었습니다",
      description: "모든 설정이 기본값으로 복원되었습니다.",
    });
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <Header 
          title="설정"
          subtitle="서비스 설정을 관리하고 API 키를 구성하세요"
        />
        
        <div className="flex-1 p-6 space-y-6">
          {/* API 설정 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="w-5 h-5" />
                <span>API 설정</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="openai-key">OpenAI API 키</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="openai-key"
                      type="password"
                      placeholder="sk-..."
                      value="••••••••••••••••"
                      readOnly
                    />
                    <Badge variant="secondary">연결됨</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="youtube-key">YouTube API 키</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="youtube-key"
                      type="password"
                      placeholder="AIza..."
                      value="••••••••••••••••"
                      readOnly
                    />
                    <Badge variant="secondary">연결됨</Badge>
                  </div>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="obsidian-key">Obsidian API 키</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="obsidian-key"
                      type="password"
                      placeholder="설정되지 않음"
                      readOnly
                    />
                    <Badge variant="outline">선택적</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="obsidian-host">Obsidian 호스트</Label>
                  <Input
                    id="obsidian-host"
                    placeholder="127.0.0.1"
                    defaultValue="127.0.0.1"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="obsidian-port">Obsidian 포트</Label>
                  <Input
                    id="obsidian-port"
                    placeholder="27124"
                    defaultValue="27124"
                    readOnly
                  />
                </div>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Obsidian 직접 연동 설정 방법:</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Obsidian에서 'Local REST API' 커뮤니티 플러그인을 설치하고 활성화하세요</li>
                  <li>플러그인 설정에서 API 키를 복사하세요</li>
                  <li>Replit Secrets에 OBSIDIAN_API_KEY로 추가하세요</li>
                  <li>설정 완료 후 요약을 내보내면 Obsidian에 직접 저장됩니다</li>
                </ol>
              </div>
              <p className="text-sm text-muted-foreground">
                API 키는 환경 변수로 관리됩니다. 변경하려면 Replit Secrets에서 수정하세요.
              </p>
            </CardContent>
          </Card>

          {/* 요약 설정 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="w-5 h-5" />
                <span>요약 설정</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="summary-language">요약 언어</Label>
                  <Select value={settings.summaryLanguage} onValueChange={(value) => handleSettingChange('summaryLanguage', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="언어 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="korean">한국어</SelectItem>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="japanese">日本語</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="summary-length">요약 길이</Label>
                  <Select value={settings.summaryLength} onValueChange={(value) => handleSettingChange('summaryLength', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="길이 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">짧게 (100-200자)</SelectItem>
                      <SelectItem value="medium">보통 (200-500자)</SelectItem>
                      <SelectItem value="long">길게 (500자 이상)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-summarize">자동 요약 생성</Label>
                  <p className="text-sm text-muted-foreground">
                    새 비디오가 감지되면 자동으로 요약을 생성합니다
                  </p>
                </div>
                <Switch 
                  id="auto-summarize" 
                  checked={settings.autoSummarize} 
                  onCheckedChange={(checked) => handleSettingChange('autoSummarize', checked)} 
                />
              </div>
            </CardContent>
          </Card>

          {/* 알림 설정 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="w-5 h-5" />
                <span>알림 설정</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="new-video-notify">새 비디오 알림</Label>
                  <p className="text-sm text-muted-foreground">
                    등록된 채널에 새 비디오가 업로드되면 알림을 받습니다
                  </p>
                </div>
                <Switch 
                  id="new-video-notify" 
                  checked={settings.newVideoNotify} 
                  onCheckedChange={(checked) => handleSettingChange('newVideoNotify', checked)} 
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="summary-complete-notify">요약 완료 알림</Label>
                  <p className="text-sm text-muted-foreground">
                    비디오 요약이 완료되면 알림을 받습니다
                  </p>
                </div>
                <Switch 
                  id="summary-complete-notify" 
                  checked={settings.summaryCompleteNotify} 
                  onCheckedChange={(checked) => handleSettingChange('summaryCompleteNotify', checked)} 
                />
              </div>
            </CardContent>
          </Card>

          {/* 내보내기 설정 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Download className="w-5 h-5" />
                <span>내보내기 설정</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="export-format">기본 내보내기 형식</Label>
                <Select value={settings.exportFormat} onValueChange={(value) => handleSettingChange('exportFormat', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="형식 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="obsidian">Obsidian 마크다운</SelectItem>
                    <SelectItem value="notion">Notion</SelectItem>
                    <SelectItem value="markdown">표준 마크다운</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="include-metadata">메타데이터 포함</Label>
                  <p className="text-sm text-muted-foreground">
                    내보낼 때 채널명, 발행일 등의 메타데이터를 포함합니다
                  </p>
                </div>
                <Switch 
                  id="include-metadata" 
                  checked={settings.includeMetadata} 
                  onCheckedChange={(checked) => handleSettingChange('includeMetadata', checked)} 
                />
              </div>
            </CardContent>
          </Card>

          {/* 저장 버튼 */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={handleResetSettings}>
              기본값으로 재설정
            </Button>
            <Button onClick={handleSaveSettings} disabled={isLoading}>
              {isLoading ? "저장 중..." : "설정 저장"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}