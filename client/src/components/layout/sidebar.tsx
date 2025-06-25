import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Home, 
  Tv, 
  FileText, 
  Download, 
  Settings, 
  User,
  Play
} from "lucide-react";

const navigation = [
  { name: "대시보드", href: "/", icon: Home },
  { name: "채널 관리", href: "/channels", icon: Tv },
  { name: "요약 목록", href: "/summaries", icon: FileText },
  { name: "설정", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 bg-sidebar-background border-r border-sidebar-border flex flex-col">
      {/* Logo & Title */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
            <Play className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-sidebar-foreground">YouTube Summarizer</h1>
            <p className="text-sm text-muted-foreground">Knowledge Base</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <a
                    className={cn(
                      "nav-item",
                      isActive ? "nav-item-active" : "nav-item-inactive"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <User className="text-muted-foreground w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-sidebar-foreground">사용자</p>
            <p className="text-xs text-muted-foreground">관리자</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
