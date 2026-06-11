import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Clock, Calendar, ArrowUpRight, BarChart3, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MOCK_USERS } from '@/src/mockData';
import { cn } from '@/lib/utils';

export function TimeSheet() {
  const timeLogs = [
    { id: '1', task: 'Monthly SEO Audit', user: 'Rashmi Alurkar', date: '2024-05-12', duration: '2.5h', billing: 'Billable' },
    { id: '2', task: 'Google Ads Optimization', user: 'Ajay Kulkarni', date: '2024-05-12', duration: '1.2h', billing: 'Billable' },
    { id: '3', task: 'Internal Strategy Sync', user: 'Nishi Kant', date: '2024-05-11', duration: '0.8h', billing: 'Non-Billable' },
    { id: '4', task: 'Q3 Design Concepts', user: 'Chitrankita Dey', date: '2024-05-11', duration: '3.5h', billing: 'Billable' },
    { id: '5', task: 'WordPress Theme Fix', user: 'Pintu Kumar', date: '2024-05-10', duration: '1.5h', billing: 'Billable' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Logged" value="124.5h" trend="+12%" icon={Clock} />
        <StatCard title="Billable Ratio" value="88%" trend="+2%" icon={ArrowUpRight} />
        <StatCard title="Avg Daily" value="6.2h" trend="-0.5%" icon={Calendar} />
        <StatCard title="Productivity" value="94%" trend="+4%" icon={BarChart3} />
      </div>

      <Card className="border-zinc-100 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
           <div>
             <CardTitle className="text-xl font-bold tracking-tight">Recent Activity Log</CardTitle>
             <p className="text-xs text-zinc-400 font-medium mt-1">Cross-department time synchronization</p>
           </div>
           <Button variant="outline" size="sm" className="h-8 text-[10px] uppercase font-bold tracking-widest">
             Export Timesheet
           </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-50/50">
                <TableRow>
                  <TableHead className="text-[10px] uppercase font-bold tracking-widest pl-6">Task / Category</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold tracking-widest">Expert</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold tracking-widest">Date</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold tracking-widest">Duration</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold tracking-widest">Billing</TableHead>
                  <TableHead className="w-[50px] pr-6"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeLogs.map((log) => (
                  <TableRow key={log.id} className="group hover:bg-zinc-50/80 transition-colors">
                    <TableCell className="pl-6">
                      <p className="font-bold text-sm tracking-tight">{log.task}</p>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Acme Corp Project</p>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-semibold text-zinc-700">{log.user}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-zinc-500">{log.date}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs bg-zinc-100 text-zinc-900 border-none px-2 h-5">
                        {log.duration}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider",
                        log.billing === 'Billable' ? "text-emerald-500" : "text-amber-500"
                      )}>
                        {log.billing}
                      </span>
                    </TableCell>
                    <TableCell className="pr-6">
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                         <MoreHorizontal className="w-3 h-3 text-zinc-400" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, trend, icon: Icon }: any) {
  return (
    <Card className="border-zinc-100 shadow-sm overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400 border border-zinc-100">
            <Icon className="w-5 h-5" />
          </div>
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full",
            trend.startsWith('+') ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
          )}>
            {trend}
          </span>
        </div>
        <div className="mt-4">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-zinc-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
