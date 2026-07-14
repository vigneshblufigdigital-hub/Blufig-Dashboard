import React from 'react';
import { 
  Users, 
  LayoutDashboard, 
  FileText, 
  Settings, 
  BarChart3, 
  Clock, 
  Briefcase, 
  Package,
  Layers,
  MessageSquare,
  Calendar,
  Server
} from 'lucide-react';
import { UserRole, ADMIN_ROLES, UserProfile, isSuperAdmin, hasPermission } from '../../types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BluFigLogo } from './BluFigLogo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole?: UserRole;
  user?: UserProfile | null;
}

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, roles: Object.values(UserRole).filter(r => r !== UserRole.CLIENT) },
  { id: 'projects', label: 'Projects', icon: Briefcase, roles: Object.values(UserRole).filter(r => r !== UserRole.CLIENT) },
  { id: 'tasks', label: 'Tasks', icon: Layers, roles: Object.values(UserRole).filter(r => r !== UserRole.CLIENT) },
  { id: 'calendar', label: 'Calendar', icon: Calendar, roles: Object.values(UserRole).filter(r => r !== UserRole.CLIENT) },
  { id: 'team', label: 'Team', icon: Users, roles: ADMIN_ROLES },
  { id: 'reports', label: 'Reports', icon: BarChart3, roles: [...ADMIN_ROLES, UserRole.CLIENT] },
  { id: 'billing', label: 'Invoices', icon: Package, roles: [...ADMIN_ROLES, UserRole.CLIENT] },
  { id: 'time', label: 'Time Tracking', icon: Clock, roles: Object.values(UserRole).filter(r => r !== UserRole.CLIENT) },
  { id: 'admin', label: 'Admin', icon: Settings, roles: ADMIN_ROLES },
  { id: 'smtp', label: 'SMTP Gateway', icon: Server, roles: [] },
  { id: 'portal', label: 'Client Portal', icon: FileText, roles: [...ADMIN_ROLES, UserRole.CLIENT] },
];

export function Sidebar({ activeTab, setActiveTab, userRole, user }: SidebarProps) {
  const filteredNavItems = NAV_ITEMS.filter(item => {
    if (item.id === 'smtp') {
      return isSuperAdmin(user);
    }
    if (!user) return !userRole || item.roles.includes(userRole);
    if (isSuperAdmin(user)) return true;

    // Check specific delegated permissions
    if (item.id === 'admin') {
      return hasPermission(user, 'canManageUsers') || ADMIN_ROLES.includes(user.role);
    }
    if (item.id === 'team') {
      return hasPermission(user, 'canManageUsers') || ADMIN_ROLES.includes(user.role);
    }
    if (item.id === 'billing') {
      return hasPermission(user, 'canManageInvoices') || [...ADMIN_ROLES, UserRole.CLIENT].includes(user.role);
    }

    return item.roles.includes(user.role);
  });

  return (
    <div className="w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col h-screen sticky top-0 shadow-sm transition-colors duration-200">
      <div className="p-6">
        <BluFigLogo className="h-8" />
        <p className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-semibold mt-2.5">
          OPERATIONS SYSTEM
        </p>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {filteredNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
              activeTab === item.id 
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-md shadow-zinc-200/50 dark:shadow-none font-semibold" 
                : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
            )}
          >
            <item.icon className="w-4 h-4" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-sidebar-border mt-auto">
        <div className="bg-zinc-50 dark:bg-zinc-900/60 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800">
          <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Help & Support</p>
          <Button 
            variant="outline" 
            className="w-full justify-start text-xs h-8 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
            onClick={() => window.location.href = "mailto:connect@blufig.digital?cc=pintu@blufig.digital,vignesh@blufig.digital,ankit@blufig.digital&subject=Support%20Desk%2520Inquiry%2520-%2520BluFig%2520Operations"}
          >
            <MessageSquare className="w-3 h-3 mr-2 text-brand-secondary" />
            Support Desk
          </Button>
        </div>
      </div>
    </div>
  );
}
