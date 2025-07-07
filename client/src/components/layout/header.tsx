import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, RefreshCw } from "lucide-react";
import { useState } from "react";
import { ProgressMonitor } from "@/components/progress-monitor";
import { ThemeToggle } from "@/components/theme-toggle";

interface HeaderProps {
  title: string;
  subtitle: string;
  onAddChannel?: () => void;
  onSearch?: (query: string) => void;
  onRefresh?: () => void;
}

export function Header({ title, subtitle, onAddChannel, onSearch, onRefresh }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch?.(query);
  };

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
          <p className="text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <div className="flex items-center space-x-3">
          {onSearch && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="요약 검색..."
                value={searchQuery}
                onChange={handleSearch}
                className="pl-10 w-64"
              />
            </div>
          )}
          
          <ProgressMonitor />
          
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              새로고침
            </Button>
          )}
          
          {onAddChannel && (
            <Button onClick={onAddChannel}>
              <Plus className="w-4 h-4 mr-2" />
              채널 추가
            </Button>
          )}
          
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
