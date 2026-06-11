import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  TrendingUp,
  Activity
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

const HEALTH_DATA = [
  { name: 'On Track', value: 12, color: '#10b981' },
  { name: 'At Risk', value: 3, color: '#f59e0b' },
  { name: 'Delayed', value: 1, color: '#ef4444' },
];

const WEEKLY_DATA = [
  { day: 'Mon', completed: 8, pending: 4 },
  { day: 'Tue', completed: 12, pending: 6 },
  { day: 'Wed', completed: 10, pending: 5 },
  { day: 'Thu', completed: 15, pending: 8 },
  { day: 'Fri', completed: 9, pending: 3 },
];

import { useAuth } from '../../contexts/AuthContext';

export function Overview({ projects, tasks }: { projects: any[], tasks: any[] }) {
  const { user } = useAuth();
  
  const activeProjectsCount = projects.filter(p => p.status === 'Active').length;
  const tasksDueTodayCount = tasks.filter(t => t.dueDate === new Date().toISOString().split('T')[0]).length;
  const completedThisWeekCount = tasks.filter(t => t.status === 'Done').length; // Simplified for demo

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h3 className="text-xl font-bold tracking-tight text-zinc-900">
          Good day, {user?.name.split(' ')[0]}
        </h3>
        <p className="text-sm text-zinc-500">Here's what's happening in your workspace today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Active Projects" 
          value={activeProjectsCount.toString()} 
          change="+1" 
          icon={Activity} 
          color="blue" 
        />
        <StatCard 
          title="Tasks Due Today" 
          value={tasksDueTodayCount.toString()} 
          change="0" 
          icon={Clock} 
          color="orange" 
        />
        <StatCard 
          title="Completed Global" 
          value={completedThisWeekCount.toString()} 
          change="+12%" 
          icon={CheckCircle2} 
          color="emerald" 
        />
        <StatCard 
          title="Delivery Health" 
          value="92%" 
          change="Stable" 
          icon={TrendingUp} 
          color="indigo" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
              Weekly Task Velocity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={WEEKLY_DATA}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                  />
                  <Bar dataKey="completed" fill="#141414" radius={[4, 4, 0, 0]} barSize={40} />
                  <Bar dataKey="pending" fill="#e4e4e7" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
              Project Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={HEALTH_DATA}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {HEALTH_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {HEALTH_DATA.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-zinc-600">{item.name}</span>
                  </div>
                  <span className="font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, change, icon: Icon, color }: any) {
  const colorMap: any = {
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className={cn("p-2 rounded-lg", colorMap[color])}>
            <Icon className="w-5 h-5" />
          </div>
          <Badge variant="outline" className={cn(
            "text-[10px] font-bold",
            change.startsWith('+') ? "text-emerald-600 border-emerald-100 bg-emerald-50" : "text-zinc-500"
          )}>
            {change}
          </Badge>
        </div>
        <div className="mt-4">
          <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
          <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider mt-1">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}
