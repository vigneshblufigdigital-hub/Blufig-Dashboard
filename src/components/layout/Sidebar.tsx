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
  MessageSquare
} from 'lucide-react';
import { UserRole, ADMIN_ROLES } from '../../types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole?: UserRole;
}

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, roles: ADMIN_ROLES },
  { id: 'projects', label: 'Projects', icon: Briefcase, roles: ADMIN_ROLES },
  { id: 'tasks', label: 'Tasks', icon: Layers, roles: Object.values(UserRole).filter(r => r !== UserRole.CLIENT) },
  { id: 'team', label: 'Team', icon: Users, roles: ADMIN_ROLES },
  { id: 'reports', label: 'Reports', icon: BarChart3, roles: [...ADMIN_ROLES, UserRole.CLIENT] },
  { id: 'billing', label: 'Invoices', icon: Package, roles: [...ADMIN_ROLES, UserRole.CLIENT] },
  { id: 'time', label: 'Time Tracking', icon: Clock, roles: Object.values(UserRole).filter(r => r !== UserRole.CLIENT) },
  { id: 'admin', label: 'Admin', icon: Settings, roles: ADMIN_ROLES },
  { id: 'portal', label: 'Client Portal', icon: FileText, roles: [...ADMIN_ROLES, UserRole.CLIENT] },
];

export function Sidebar({ activeTab, setActiveTab, userRole }: SidebarProps) {
  const filteredNavItems = NAV_ITEMS.filter(item => !userRole || item.roles.includes(userRole));

  return (
    <div className="w-64 border-right bg-white flex flex-col h-screen sticky top-0 shadow-sm">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-brand-primary tracking-tighter">
          BLU<span className="text-brand-secondary">FIG</span>
        </h1>
        <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mt-1">
          OPERATIONS SYSTEM
        </p>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {filteredNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              activeTab === item.id 
                ? "bg-zinc-900 text-white shadow-md shadow-zinc-200" 
                : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            )}
          >
            <item.icon className="w-4 h-4" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t mt-auto">
        <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-100">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Help & Support</p>
          <Button variant="outline" className="w-full justify-start text-xs h-8">
            <MessageSquare className="w-3 h-3 mr-2 text-brand-secondary" />
            Support Desk
          </Button>
        </div>
      </div>
    </div>
  );
}
