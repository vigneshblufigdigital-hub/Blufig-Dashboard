import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Eye, 
  Plus, 
  Search, 
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  Trash2,
  ExternalLink,
  BarChart3,
  Paperclip,
  UploadCloud,
  X,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClientReport, Project, UserRole, ADMIN_ROLES, Task, ProjectType, TaskStatus, Priority } from '@/src/types';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';

interface ClientReportsProps {
  reports: ClientReport[];
  projects: Project[];
  tasks?: Task[];
  onAddReport: (report: ClientReport) => void;
  onRemoveReport: (id: string) => void;
  onNavigateToTask?: (taskId: string) => void;
  elapsedTimes?: Record<string, number>;
  activeTimerTaskId?: string | null;
}

export function ClientReports({ 
  reports, 
  projects, 
  tasks = [], 
  onAddReport, 
  onRemoveReport, 
  onNavigateToTask,
  elapsedTimes,
  activeTimerTaskId
}: ClientReportsProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddReportOpen, setIsAddReportOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newReport, setNewReport] = useState<Partial<ClientReport>>({
    title: '',
    projectId: '',
    type: 'Monthly',
    status: 'Published',
    date: new Date().toISOString().split('T')[0]
  });

  const [activeTab, setActiveTab] = useState<'reports' | 'budget'>('reports');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly'>('monthly');
  const [projectSearchTerm, setProjectSearchTerm] = useState('');

  // Pre-seed "Insight CRM Monthly" project and tasks if not present in current workspace lists
  const demoProjects = [...projects];
  if (!demoProjects.some(p => p.name.toLowerCase().includes('insight') || p.name.toLowerCase().includes('crm'))) {
    demoProjects.unshift({
      id: 'p-insight-crm',
      name: 'Insight CRM Monthly',
      clientId: 'client-1',
      accountManagerId: '130',
      type: ProjectType.RETAINER,
      status: 'Active',
      startDate: '2026-06-01',
      websiteUrl: 'https://insightcrm.app'
    });
  }

  const demoTasks = [...tasks];
  if (demoProjects.some(p => p.id === 'p-insight-crm') && !demoTasks.some(t => t.projectId === 'p-insight-crm')) {
    demoTasks.push(
      {
        id: 't-insight-1',
        projectId: 'p-insight-crm',
        deliverableId: 'd1',
        name: 'CRM Schema Setup & Custom Field Integration',
        type: 'Web Dev',
        assigneeId: '036',
        status: TaskStatus.DONE,
        priority: Priority.HIGH,
        dueDate: '2026-06-25',
        createdAt: '2026-06-20',
        updatedAt: '2026-06-24',
        timeEstimate: 4,
        timeLogged: 3.5,
        timeLoggedSeconds: 3.5 * 3600,
        subTasks: []
      },
      {
        id: 't-insight-2',
        projectId: 'p-insight-crm',
        deliverableId: 'd1',
        name: 'Automated Data Migration pipeline from Salesforce REST API',
        type: 'Database',
        assigneeId: '036',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.CRITICAL,
        dueDate: '2026-06-29',
        createdAt: '2026-06-22',
        updatedAt: '2026-06-28',
        timeEstimate: 5,
        timeLogged: 5.5,
        timeLoggedSeconds: 5.5 * 3600,
        subTasks: []
      },
      {
        id: 't-insight-3',
        projectId: 'p-insight-crm',
        deliverableId: 'd2',
        name: 'Customer Dashboard UI Tuning & Layout Polish',
        type: 'Design',
        assigneeId: '076',
        status: TaskStatus.REVIEW,
        priority: Priority.NORMAL,
        dueDate: '2026-06-28',
        createdAt: '2026-06-25',
        updatedAt: '2026-06-29',
        timeEstimate: 2,
        timeLogged: 1.2,
        timeLoggedSeconds: 1.2 * 3600,
        subTasks: []
      }
    );
  }

  const [projectBudgets, setProjectBudgets] = useState<Record<string, { weekly: number; monthly: number }>>(() => {
    const initial: Record<string, { weekly: number; monthly: number }> = {};
    demoProjects.forEach(p => {
      const nameLower = p.name.toLowerCase();
      if (nameLower.includes('crm') || nameLower.includes('insight')) {
        initial[p.id] = { weekly: 2, monthly: 8 };
      } else {
        initial[p.id] = { weekly: 5, monthly: 15 };
      }
    });
    return initial;
  });

  const isDateInTimeframe = (dateStr: string | undefined, type: 'weekly' | 'monthly') => {
    if (!dateStr) return type === 'monthly';
    const date = new Date(dateStr.split('T')[0]);
    const refDate = new Date('2026-06-30');
    
    const dateMs = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const refMs = Date.UTC(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
    
    const diffDays = (refMs - dateMs) / (1000 * 60 * 60 * 24);
    
    if (type === 'weekly') {
      return diffDays >= 0 && diffDays < 7;
    } else {
      return diffDays >= 0 && diffDays < 30;
    }
  };

  const handleExportCSV = () => {
    const allProjectsSummary = demoProjects.map(p => {
      const pTasks = demoTasks.filter(t => t.projectId === p.id);
      const pSecs = pTasks.reduce((sum, t) => {
        if (isDateInTimeframe(t.updatedAt || t.createdAt, timeframe)) {
          return sum + (t.timeLoggedSeconds || ((t.timeLogged || 0) * 3600));
        }
        return sum;
      }, 0);
      const pHours = pSecs / 3600;
      
      const pBudgetConfig = projectBudgets[p.id] || (
        p.name.toLowerCase().includes('crm') || p.name.toLowerCase().includes('insight') 
          ? { weekly: 2, monthly: 8 } 
          : { weekly: 5, monthly: 15 }
      );
      const pBudgetHours = timeframe === 'weekly' ? pBudgetConfig.weekly : pBudgetConfig.monthly;
      const isOver = pHours > pBudgetHours;
      const usagePercent = pBudgetHours > 0 ? (pHours / pBudgetHours) * 100 : 0;

      return {
        name: p.name,
        hoursSpent: pHours,
        budgetHours: pBudgetHours,
        status: isOver ? 'OVER-BUDGET' : 'SAFE',
        utilization: usagePercent
      };
    });

    const headers = ['Project Name', 'Timeframe', 'Hours Spent (hrs)', 'Budget Allocated (hrs)', 'Status', 'Utilization (%)'];
    const rows = allProjectsSummary.map(item => [
      `"${item.name.replace(/"/g, '""')}"`,
      timeframe.toUpperCase(),
      item.hoursSpent.toFixed(2),
      item.budgetHours.toFixed(1),
      item.status,
      `${item.utilization.toFixed(0)}%`
    ]);

    const totalHours = allProjectsSummary.reduce((sum, item) => sum + item.hoursSpent, 0);
    const totalBudget = allProjectsSummary.reduce((sum, item) => sum + item.budgetHours, 0);
    const overBudgetCount = allProjectsSummary.filter(item => item.status === 'OVER-BUDGET').length;
    const avgUtilization = totalBudget > 0 ? (totalHours / totalBudget) * 100 : 0;

    rows.push([]);
    rows.push([
      'TOTALS / SUMMARY',
      '',
      totalHours.toFixed(2),
      totalBudget.toFixed(1),
      `${overBudgetCount} Over-Budget`,
      `${avgUtilization.toFixed(0)}% Overall`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Time_Allocation_${timeframe}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const allProjectsSummary = demoProjects.map(p => {
      const pTasks = demoTasks.filter(t => t.projectId === p.id);
      const pSecs = pTasks.reduce((sum, t) => {
        if (isDateInTimeframe(t.updatedAt || t.createdAt, timeframe)) {
          return sum + (t.timeLoggedSeconds || ((t.timeLogged || 0) * 3600));
        }
        return sum;
      }, 0);
      const pHours = pSecs / 3600;
      
      const pBudgetConfig = projectBudgets[p.id] || (
        p.name.toLowerCase().includes('crm') || p.name.toLowerCase().includes('insight') 
          ? { weekly: 2, monthly: 8 } 
          : { weekly: 5, monthly: 15 }
      );
      const pBudgetHours = timeframe === 'weekly' ? pBudgetConfig.weekly : pBudgetConfig.monthly;
      const isOver = pHours > pBudgetHours;
      const usagePercent = pBudgetHours > 0 ? (pHours / pBudgetHours) * 100 : 0;

      return {
        name: p.name,
        hoursSpent: pHours,
        budgetHours: pBudgetHours,
        isOver,
        usagePercent
      };
    });

    const totalHours = allProjectsSummary.reduce((sum, item) => sum + item.hoursSpent, 0);
    const totalBudget = allProjectsSummary.reduce((sum, item) => sum + item.budgetHours, 0);
    const overBudgetCount = allProjectsSummary.filter(item => item.isOver).length;
    const avgUtilization = totalBudget > 0 ? (totalHours / totalBudget) * 100 : 0;
    const atRiskCount = allProjectsSummary.filter(item => !item.isOver && item.usagePercent >= 75 && item.usagePercent < 100).length;

    const doc = new jsPDF('p', 'mm', 'a4');
    
    doc.setFillColor(245, 158, 11);
    doc.rect(0, 0, 210, 4, 'F');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(24, 24, 27);
    doc.text('BLUFIG', 20, 25);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122);
    doc.text('OPERATIONS SYSTEM', 20, 30);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(24, 24, 27);
    doc.text('TIME ALLOCATION BURN & VELOCITY REPORT', 20, 42);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(82, 82, 91);
    const todayStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(`Timeframe Interval: ${timeframe.toUpperCase()}`, 20, 48);
    doc.text(`Generated On: ${todayStr}`, 20, 53);
    if (user?.email) {
      doc.text(`Prepared By: ${user.email}`, 20, 58);
    }

    doc.setDrawColor(228, 228, 231);
    doc.setLineWidth(0.5);
    doc.line(20, 62, 190, 62);

    doc.setFillColor(250, 250, 250);
    doc.rect(20, 66, 170, 20, 'F');
    doc.setDrawColor(244, 244, 245);
    doc.rect(20, 66, 170, 20, 'S');

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122);
    doc.text('TOTAL LOGGED TIME', 25, 72);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(24, 24, 27);
    doc.text(`${totalHours.toFixed(1)} hrs`, 25, 79);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122);
    doc.text('OVER-BUDGET', 85, 72);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(overBudgetCount > 0 ? 225 : 24, overBudgetCount > 0 ? 29 : 24, overBudgetCount > 0 ? 72 : 27);
    doc.text(`${overBudgetCount} Project${overBudgetCount !== 1 ? 's' : ''}`, 85, 79);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122);
    doc.text('AT-RISK PROJECTS', 140, 72);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(atRiskCount > 0 ? 217 : 24, atRiskCount > 0 ? 119 : 24, atRiskCount > 0 ? 6 : 27);
    doc.text(`${atRiskCount} Project${atRiskCount !== 1 ? 's' : ''}`, 140, 79);

    const tableTop = 93;
    doc.setFillColor(244, 244, 245);
    doc.rect(20, tableTop, 170, 8, 'F');
    
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(63, 63, 70);
    
    doc.text('PROJECT NAME', 25, tableTop + 5.5);
    doc.text('SPENT TIME', 105, tableTop + 5.5, { align: 'right' });
    doc.text('BUDGET ALLOC', 135, tableTop + 5.5, { align: 'right' });
    doc.text('UTILIZATION', 165, tableTop + 5.5, { align: 'right' });
    doc.text('STATUS', 185, tableTop + 5.5, { align: 'right' });

    let currentY = tableTop + 8;

    allProjectsSummary.forEach((item, index) => {
      if (index % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(20, currentY, 170, 8, 'F');
      }

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(24, 24, 27);
      
      const displayName = item.name.length > 40 ? item.name.substring(0, 37) + '...' : item.name;
      doc.text(displayName, 25, currentY + 5.5);
      
      doc.setFont('Helvetica', 'bold');
      doc.text(`${item.hoursSpent.toFixed(2)} hrs`, 105, currentY + 5.5, { align: 'right' });
      doc.setFont('Helvetica', 'normal');
      doc.text(`${item.budgetHours.toFixed(1)} hrs`, 135, currentY + 5.5, { align: 'right' });
      doc.text(`${item.usagePercent.toFixed(0)}%`, 165, currentY + 5.5, { align: 'right' });

      if (item.isOver) {
        doc.setTextColor(225, 29, 72);
        doc.setFont('Helvetica', 'bold');
        doc.text('Over-Budget', 185, currentY + 5.5, { align: 'right' });
      } else if (item.usagePercent >= 75) {
        doc.setTextColor(217, 119, 6);
        doc.setFont('Helvetica', 'bold');
        doc.text('At Risk', 185, currentY + 5.5, { align: 'right' });
      } else {
        doc.setTextColor(22, 163, 74);
        doc.text('Safe', 185, currentY + 5.5, { align: 'right' });
      }

      currentY += 8;
    });

    doc.setDrawColor(228, 228, 231);
    doc.setLineWidth(0.5);
    doc.line(20, currentY, 190, currentY);

    doc.setFillColor(253, 253, 253);
    doc.rect(20, currentY, 170, 9, 'F');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(24, 24, 27);
    doc.text('AVERAGE / TOTAL', 25, currentY + 6);
    doc.text(`${totalHours.toFixed(2)} hrs`, 105, currentY + 6, { align: 'right' });
    doc.text(`${totalBudget.toFixed(1)} hrs`, 135, currentY + 6, { align: 'right' });
    doc.text(`${avgUtilization.toFixed(0)}%`, 165, currentY + 6, { align: 'right' });
    
    if (overBudgetCount > 0) {
      doc.setTextColor(225, 29, 72);
      doc.text(`${overBudgetCount} Over`, 185, currentY + 6, { align: 'right' });
    } else {
      doc.setTextColor(22, 163, 74);
      doc.text('All Safe', 185, currentY + 6, { align: 'right' });
    }

    doc.line(20, currentY + 9, 190, currentY + 9);

    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(161, 161, 170);
    doc.text('BLUFIG Operations System • Time Burn & Velocity Report', 20, 280);
    doc.text('Confidential Internal Report • Page 1 of 1', 190, 280, { align: 'right' });

    doc.save(`Time_Allocation_${timeframe}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const isAdmin = user && ADMIN_ROLES.includes(user.role);

  const activeProjectId = selectedProjectId || demoProjects[0]?.id || '';
  const activeProject = demoProjects.find(p => p.id === activeProjectId);
  
  // Calculate spent time
  const projectTasks = demoTasks.filter(t => t.projectId === activeProjectId);
  const totalSecondsSpent = projectTasks.reduce((sum, t) => {
    const elapsedSeconds = (elapsedTimes && elapsedTimes[t.id] !== undefined)
      ? elapsedTimes[t.id]
      : (t.timeLoggedSeconds || ((t.timeLogged || 0) * 3600));

    if (isDateInTimeframe(t.updatedAt || t.createdAt, timeframe) || t.id === activeTimerTaskId) {
      return sum + elapsedSeconds;
    }
    return sum;
  }, 0);
  const totalHoursSpent = totalSecondsSpent / 3600;

  // Budget for selected project and timeframe
  const currentBudgetConfig = projectBudgets[activeProjectId] || (
    activeProject?.name.toLowerCase().includes('crm') || activeProject?.name.toLowerCase().includes('insight') 
      ? { weekly: 2, monthly: 8 } 
      : { weekly: 5, monthly: 15 }
  );
  const budgetHours = timeframe === 'weekly' ? currentBudgetConfig.weekly : currentBudgetConfig.monthly;
  const isOverBudget = totalHoursSpent > budgetHours;
  const budgetUsagePercent = budgetHours > 0 ? (totalHoursSpent / budgetHours) * 100 : 0;

  // Sort tasks by time spent in the selected timeframe
  const taskBreakdown = projectTasks
    .map(t => {
      const elapsedSeconds = (elapsedTimes && elapsedTimes[t.id] !== undefined)
        ? elapsedTimes[t.id]
        : (t.timeLoggedSeconds || ((t.timeLogged || 0) * 3600));

      const taskSecs = isDateInTimeframe(t.updatedAt || t.createdAt, timeframe) || t.id === activeTimerTaskId
        ? elapsedSeconds
        : 0;
      return {
        ...t,
        timeInTimeframeSeconds: taskSecs,
        timeInTimeframeHours: taskSecs / 3600
      };
    })
    .filter(item => item.timeInTimeframeSeconds > 0)
    .sort((a, b) => b.timeInTimeframeSeconds - a.timeInTimeframeSeconds);

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (user?.role === UserRole.CLIENT) {
      return matchesSearch && report.status === 'Published';
    }
    
    return matchesSearch;
  });

  const filteredDemoProjects = demoProjects.filter(p => 
    p.name.toLowerCase().includes(projectSearchTerm.toLowerCase())
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleAddReport = () => {
    if (!newReport.title || !newReport.projectId) return;

    const reportToAdd: ClientReport = {
      ...newReport as ClientReport,
      id: 'rep-' + Math.random().toString(36).substr(2, 9),
      fileName: selectedFile?.name,
      url: selectedFile ? URL.createObjectURL(selectedFile) : undefined
    };

    onAddReport(reportToAdd);
    setIsAddReportOpen(false);
    setSelectedFile(null);
    setNewReport({
      title: '',
      projectId: '',
      type: 'Monthly',
      status: 'Published',
      date: new Date().toISOString().split('T')[0]
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 font-sans">Project Reports</h1>
          <p className="text-zinc-500 text-sm font-medium">View and manage performance reports and deliverables.</p>
        </div>

        {isAdmin && (
          <Dialog open={isAddReportOpen} onOpenChange={(open) => {
            setIsAddReportOpen(open);
            if (!open) setSelectedFile(null);
          }}>
            <DialogTrigger 
              render={
                <Button className="bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl px-6 h-11 font-bold text-xs uppercase tracking-widest shadow-lg shadow-zinc-200">
                  <Plus className="w-4 h-4 mr-2" />
                  Submit New Report
                </Button>
              }
            />
            <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-2xl border-none">
              <DialogHeader className="px-6 pt-6 pb-4 bg-zinc-50/50 border-b border-zinc-100">
                <DialogTitle className="text-lg font-bold tracking-tight">Submit Client Report</DialogTitle>
              </DialogHeader>
              <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Report Title</Label>
                  <Input 
                    placeholder="e.g. May Performance Analysis" 
                    className="rounded-xl border-zinc-200 h-10 focus-visible:ring-zinc-900"
                    value={newReport.title}
                    onChange={(e) => setNewReport({...newReport, title: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Select Project</Label>
                    <Select 
                      value={newReport.projectId} 
                      onValueChange={(v) => setNewReport({...newReport, projectId: v})}
                    >
                      <SelectTrigger className="rounded-xl border-zinc-200 h-10">
                        <SelectValue placeholder="Project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Frequency</Label>
                    <Select 
                      value={newReport.type} 
                      onValueChange={(v) => setNewReport({...newReport, type: v as any})}
                    >
                      <SelectTrigger className="rounded-xl border-zinc-200 h-10">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                        <SelectItem value="Custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Publication Date</Label>
                  <Input 
                    type="date"
                    className="rounded-xl border-zinc-200 h-10"
                    value={newReport.date}
                    onChange={(e) => setNewReport({...newReport, date: e.target.value})}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Document Attachment</Label>
                  <div className="relative group/upload">
                    <input 
                      type="file" 
                      id="report-file" 
                      className="hidden" 
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.csv"
                    />
                    <label 
                      htmlFor="report-file"
                      className={cn(
                        "flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition-all",
                        selectedFile ? "border-emerald-200 bg-emerald-50/50" : "border-zinc-200 bg-zinc-50 hover:border-zinc-900 transition-colors"
                      )}
                    >
                      {selectedFile ? (
                        <div className="flex items-center space-x-3 px-4">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-emerald-700 truncate">{selectedFile.name}</p>
                            <p className="text-[9px] text-emerald-600/60 uppercase font-black">Click to change</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-3 px-4">
                          <UploadCloud className="w-5 h-5 text-zinc-400 group-hover/upload:text-zinc-900 transition-colors" />
                          <div>
                            <p className="text-xs font-bold text-zinc-600 group-hover/upload:text-zinc-900 transition-colors">Select report file</p>
                            <p className="text-[10px] text-zinc-400">PDF, Excel, or Word</p>
                          </div>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>
              <DialogFooter className="px-6 py-4 bg-white border-t border-zinc-100 mt-0">
                <Button 
                  onClick={handleAddReport}
                  disabled={!newReport.title || !newReport.projectId}
                  className="w-full bg-zinc-900 text-white rounded-xl h-11 font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-zinc-200 disabled:opacity-50"
                >
                  Publish Report
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-zinc-150 mb-6">
        <button
          onClick={() => setActiveTab('reports')}
          className={cn(
            "px-5 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all",
            activeTab === 'reports' 
              ? "border-zinc-900 text-zinc-900" 
              : "border-transparent text-zinc-400 hover:text-zinc-600"
          )}
        >
          📄 Published Reports
        </button>
        <button
          onClick={() => setActiveTab('budget')}
          className={cn(
            "px-5 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-2",
            activeTab === 'budget' 
              ? "border-zinc-900 text-zinc-900" 
              : "border-transparent text-zinc-400 hover:text-zinc-600"
          )}
        >
          📊 Time Burn & Allocation Monitor
        </button>
      </div>

      {activeTab === 'reports' ? (
        <>
          <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input 
            placeholder="Search reports..." 
            className="pl-9 rounded-xl border-zinc-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="rounded-xl border-zinc-200">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map((report) => {
          const project = projects.find(p => p.id === report.projectId);
          return (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-zinc-200 hover:shadow-md transition-all group overflow-hidden rounded-xl">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="p-2 bg-zinc-100 rounded-lg group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                      <FileText className="w-5 h-5" />
                    </div>
                    <Badge className={cn(
                      "text-[9px] font-bold uppercase tracking-widest px-2 h-5",
                      report.status === 'Published' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-zinc-100 text-zinc-500"
                    )}>
                      {report.status}
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <CardTitle className="text-base font-bold tracking-tight">{report.title}</CardTitle>
                    <CardDescription className="text-xs font-medium text-zinc-500 mt-1">
                      {project?.name || 'Multi-Project'} • {report.type}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-xs text-zinc-500 space-x-4 mb-4">
                    <div className="flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1.5 opacity-60" />
                      {new Date(report.date).toLocaleDateString()}
                    </div>
                    {report.fileName && (
                      <div className="flex items-center text-emerald-600 font-bold">
                        <Paperclip className="w-3.5 h-3.5 mr-1.5" />
                        {report.fileName.length > 15 ? report.fileName.substring(0, 12) + '...' : report.fileName}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button 
                      size="sm" 
                      className="flex-1 bg-zinc-50 text-zinc-900 hover:bg-zinc-100 border-none shadow-none font-bold text-[10px] h-9 uppercase tracking-widest"
                      onClick={() => report.url && window.open(report.url, '_blank')}
                    >
                      <Eye className="w-3.5 h-3.5 mr-2" />
                      View
                    </Button>
                    <Button size="sm" variant="outline" className="h-9 w-9 rounded-lg border-zinc-200 p-0">
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                    {isAdmin && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-9 w-9 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        onClick={() => onRemoveReport(report.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {filteredReports.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-zinc-50/50 rounded-2xl border-2 border-dashed border-zinc-100">
          <div className="p-4 bg-zinc-100 rounded-full mb-4">
            <BarChart3 className="w-8 h-8 text-zinc-300" />
          </div>
          <h3 className="text-zinc-600 font-bold uppercase tracking-widest text-xs">No reports found</h3>
          <p className="text-zinc-400 text-xs mt-1">Try adjusting your filters or check back later.</p>
        </div>
      )}
    </>
  ) : (
    <div className="space-y-6">
      {/* Interval Trend Analyzer Header & KPI Cards */}
      {(() => {
        const allProjectsSummary = demoProjects.map(p => {
          const pTasks = demoTasks.filter(t => t.projectId === p.id);
          const pSecs = pTasks.reduce((sum, t) => {
            if (isDateInTimeframe(t.updatedAt || t.createdAt, timeframe)) {
              return sum + (t.timeLoggedSeconds || ((t.timeLogged || 0) * 3600));
            }
            return sum;
          }, 0);
          const pHours = pSecs / 3600;
          
          const pBudgetConfig = projectBudgets[p.id] || (
            p.name.toLowerCase().includes('crm') || p.name.toLowerCase().includes('insight') 
              ? { weekly: 2, monthly: 8 } 
              : { weekly: 5, monthly: 15 }
          );
          const pBudgetHours = timeframe === 'weekly' ? pBudgetConfig.weekly : pBudgetConfig.monthly;
          const isOver = pHours > pBudgetHours;
          const usagePercent = pBudgetHours > 0 ? (pHours / pBudgetHours) * 100 : 0;

          return {
            id: p.id,
            name: p.name,
            hoursSpent: pHours,
            budgetHours: pBudgetHours,
            isOver,
            usagePercent
          };
        });

        const overBudgetProjectsCount = allProjectsSummary.filter(item => item.isOver).length;
        const totalHoursAllProjects = allProjectsSummary.reduce((sum, item) => sum + item.hoursSpent, 0);
        const totalBudgetHoursAllProjects = allProjectsSummary.reduce((sum, item) => sum + item.budgetHours, 0);
        const aggregateUtilization = totalBudgetHoursAllProjects > 0 ? (totalHoursAllProjects / totalBudgetHoursAllProjects) * 100 : 0;
        const atRiskCount = allProjectsSummary.filter(item => !item.isOver && item.usagePercent >= 75 && item.usagePercent < 100).length;

        return (
          <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-150 dark:border-zinc-800 p-5 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-zinc-900 dark:text-white" />
                  Time Allocation Burn & Velocity Monitor
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-1 font-medium">
                  Monitor task velocity, view total hours logged, and drill down on diagnostic trends to keep projects on track.
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto shrink-0">
                {/* Timeframe Toggle */}
                <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-900 p-0.5 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <button
                    onClick={() => setTimeframe('weekly')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[10px] uppercase font-extrabold tracking-wider transition-all cursor-pointer",
                      timeframe === 'weekly' 
                        ? "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white shadow-sm" 
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                    )}
                  >
                    Weekly Interval
                  </button>
                  <button
                    onClick={() => setTimeframe('monthly')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[10px] uppercase font-extrabold tracking-wider transition-all cursor-pointer",
                      timeframe === 'monthly' 
                        ? "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white shadow-sm" 
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                    )}
                  >
                    Monthly Interval
                  </button>
                </div>

                {/* Export Options */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleExportCSV}
                    size="sm"
                    variant="outline"
                    className="h-9 text-[10px] font-extrabold uppercase tracking-widest border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-zinc-500" />
                    CSV
                  </Button>
                  <Button
                    onClick={handleExportPDF}
                    size="sm"
                    variant="outline"
                    className="h-9 text-[10px] font-extrabold uppercase tracking-widest border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-zinc-500" />
                    PDF
                  </Button>
                </div>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/10 space-y-1">
                <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-400 block">Total Logged Time</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-zinc-900 dark:text-white">{totalHoursAllProjects.toFixed(1)} hrs</span>
                  <span className="text-[10px] font-semibold text-zinc-400">across {demoProjects.length} projects</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-semibold">
                  Budget Allocated: {totalBudgetHoursAllProjects.toFixed(1)} hrs
                </div>
              </div>

              <div className={cn(
                "p-4 rounded-xl border space-y-1",
                overBudgetProjectsCount > 0
                  ? "bg-rose-50/30 dark:bg-rose-950/5 border-rose-100 dark:border-rose-950"
                  : "bg-zinc-50/50 dark:bg-zinc-900/10 border-zinc-100 dark:border-zinc-900"
              )}>
                <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-400 block">Over-Budget Projects</span>
                <div className="flex items-baseline gap-1.5">
                  <span className={cn(
                    "text-xl font-black",
                    overBudgetProjectsCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-zinc-900 dark:text-white"
                  )}>
                    {overBudgetProjectsCount}
                  </span>
                  <span className="text-[10px] font-semibold text-zinc-400">project{overBudgetProjectsCount !== 1 ? 's' : ''} exceeded</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-semibold flex items-center gap-1">
                  {overBudgetProjectsCount > 0 ? (
                    <span className="text-rose-500 font-bold flex items-center gap-0.5">⚠️ Attention required immediately</span>
                  ) : (
                    <span className="text-emerald-600 font-bold">✓ All projects within threshold</span>
                  )}
                </div>
              </div>

              <div className={cn(
                "p-4 rounded-xl border space-y-1",
                atRiskCount > 0
                  ? "bg-amber-50/30 dark:bg-amber-950/5 border-amber-100 dark:border-amber-950"
                  : "bg-zinc-50/50 dark:bg-zinc-900/10 border-zinc-100 dark:border-zinc-900"
              )}>
                <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-400 block">At-Risk Projects</span>
                <div className="flex items-baseline gap-1.5">
                  <span className={cn(
                    "text-xl font-black",
                    atRiskCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-zinc-900 dark:text-white"
                  )}>
                    {atRiskCount}
                  </span>
                  <span className="text-[10px] font-semibold text-zinc-400">near limit (&gt;75%)</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-semibold">
                  Overall Utilization: {aggregateUtilization.toFixed(0)}%
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: List of Projects (Interactive Selection Panel) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-zinc-150 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Select Project to Analyze</h3>
              <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
                {demoProjects.length} Total
              </span>
            </div>
            
            {/* Project Selection Dropdown */}
            <div className="mb-4">
              <Select 
                value={activeProjectId} 
                onValueChange={(val) => setSelectedProjectId(val)}
              >
                <SelectTrigger className="w-full h-10 rounded-xl border-zinc-200 bg-white text-zinc-900 font-semibold text-xs focus:ring-1 focus:ring-zinc-900/10">
                  <SelectValue placeholder="Choose a project..." />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto bg-white border border-zinc-200 shadow-md">
                  {demoProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs font-semibold cursor-pointer">
                      💼 {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search filter for projects */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <Input 
                type="text" 
                placeholder="Search projects..." 
                value={projectSearchTerm}
                onChange={(e) => setProjectSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl border-zinc-200 bg-white text-zinc-900"
              />
            </div>

            {/* Project Cards List */}
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredDemoProjects.map(p => {
                // Calculate hours spent for this project in the selected timeframe
                const pTasks = demoTasks.filter(t => t.projectId === p.id);
                const pSecs = pTasks.reduce((sum, t) => {
                  if (isDateInTimeframe(t.updatedAt || t.createdAt, timeframe)) {
                    return sum + (t.timeLoggedSeconds || ((t.timeLogged || 0) * 3600));
                  }
                  return sum;
                }, 0);
                const pHours = pSecs / 3600;
                
                // Get budget for this project and timeframe
                const pBudgetConfig = projectBudgets[p.id] || (
                  p.name.toLowerCase().includes('crm') || p.name.toLowerCase().includes('insight') 
                    ? { weekly: 2, monthly: 8 } 
                    : { weekly: 5, monthly: 15 }
                );
                const pBudgetHours = timeframe === 'weekly' ? pBudgetConfig.weekly : pBudgetConfig.monthly;
                const pIsOver = pHours > pBudgetHours;
                const pPercent = pBudgetHours > 0 ? (pHours / pBudgetHours) * 100 : 0;
                const isSelected = p.id === activeProjectId;

                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProjectId(p.id)}
                    className={cn(
                      "w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex flex-col gap-2 relative overflow-hidden",
                      isSelected 
                        ? "bg-zinc-900 border-zinc-900 text-white shadow-md ring-2 ring-zinc-900/10" 
                        : "bg-zinc-50/50 hover:bg-zinc-50 border-zinc-150 text-zinc-900 hover:border-zinc-300"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 w-full">
                      <div className="font-bold text-xs truncate max-w-[160px]">
                        💼 {p.name}
                      </div>
                      <Badge className={cn(
                        "text-[8px] font-bold px-1.5 py-0.5 uppercase tracking-wide",
                        pIsOver 
                          ? isSelected ? "bg-rose-500 text-white" : "bg-rose-50 text-rose-600 border border-rose-200"
                          : isSelected ? "bg-emerald-600 text-white animate-pulse" : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                      )}>
                        {pIsOver ? 'Exceeded' : 'Safe'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-[10px] w-full mt-0.5">
                      <span className={isSelected ? "text-zinc-300" : "text-zinc-500"}>
                        {timeframe === 'weekly' ? 'Weekly' : 'Monthly'} Spent
                      </span>
                      <span className="font-extrabold font-mono">
                        {pHours.toFixed(2)} / {pBudgetHours.toFixed(1)} hrs
                      </span>
                    </div>

                    {/* Miniature Progress bar */}
                    <div className="w-full bg-zinc-200/40 rounded-full h-1 overflow-hidden mt-1">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          pIsOver 
                            ? "bg-rose-500" 
                            : pPercent > 80 ? "bg-amber-400" : isSelected ? "bg-emerald-400" : "bg-emerald-500"
                        )}
                        style={{ width: `${Math.min(pPercent, 100)}%` }}
                      />
                    </div>
                  </button>
                );
              })}

              {filteredDemoProjects.length === 0 && (
                <div className="text-center py-8 text-zinc-400 text-xs italic">
                  No projects found matching search.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Detailed Time spent and Budget Tracker for selected Project */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-zinc-200 rounded-2xl shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-zinc-50/50 border-b border-zinc-150 p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-zinc-900 text-white hover:bg-zinc-800 text-[9px] font-bold tracking-widest uppercase">
                      ACTIVE PROJECT ANALYZER
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-black tracking-tight text-zinc-900 mt-2 flex items-center gap-2">
                    💼 {activeProject?.name}
                  </CardTitle>
                  <CardDescription className="text-xs font-semibold text-zinc-400 mt-1">
                    Client Portal diagnostics matching current active timesheets & logged records.
                  </CardDescription>
                </div>
                
                {/* Timeframe selector (Weekly vs Monthly) */}
                <div className="flex rounded-xl bg-zinc-100 p-0.5 border border-zinc-200 self-start md:self-auto">
                  <button
                    onClick={() => setTimeframe('weekly')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[10px] uppercase font-black tracking-wider transition-all",
                      timeframe === 'weekly' 
                        ? "bg-white text-zinc-900 shadow-sm" 
                        : "text-zinc-500 hover:text-zinc-900"
                    )}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setTimeframe('monthly')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[10px] uppercase font-black tracking-wider transition-all",
                      timeframe === 'monthly' 
                        ? "bg-white text-zinc-900 shadow-sm" 
                        : "text-zinc-500 hover:text-zinc-900"
                    )}
                  >
                    Monthly
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Visual Circle Meter & Hours Progress Card */}
                <div className="md:col-span-5 p-5 rounded-2xl bg-zinc-50 border border-zinc-150 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Budget Limit Status</span>
                      <Badge className={cn(
                        "text-[9px] font-bold uppercase tracking-wider px-2.5 py-1",
                        isOverBudget ? "bg-rose-50 text-rose-600 border border-rose-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                      )}>
                        {isOverBudget ? '⚠️ Budget Exceeded' : '✓ Within Budget'}
                      </Badge>
                    </div>

                    <div className="flex items-baseline mb-1">
                      <span className="text-4xl font-extrabold tracking-tight text-zinc-900">{totalHoursSpent.toFixed(2)}</span>
                      <span className="text-xs font-semibold text-zinc-400 ml-1.5">spent of <b>{budgetHours} hrs</b> budget</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="w-full bg-zinc-200 rounded-full h-3 overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            isOverBudget ? "bg-rose-500" : budgetUsagePercent > 80 ? "bg-amber-500" : "bg-emerald-500"
                          )}
                          style={{ width: `${Math.min(budgetUsagePercent, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center mt-2.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        <span>{budgetUsagePercent.toFixed(1)}% Used</span>
                        <span className={cn(
                          "font-mono",
                          isOverBudget ? "text-rose-600" : "text-emerald-600"
                        )}>
                          {isOverBudget 
                            ? `+ ${(totalHoursSpent - budgetHours).toFixed(2)} hrs exceeded` 
                            : `${Math.max(budgetHours - totalHoursSpent, 0).toFixed(2)} hrs remaining`
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Adjust Allocations - Only editable by Admin as per request */}
                  <div className="pt-5 border-t border-zinc-200 mt-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                        ⚙️ Adjust Budget Allocation
                      </Label>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <Label className="text-[9px] text-zinc-400 font-bold uppercase">Hours Limit</Label>
                        <div className="relative">
                          <Input 
                            type="number" 
                            min="0.5"
                            step="0.5"
                            value={budgetHours}
                            disabled={!isAdmin}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setProjectBudgets(prev => ({
                                ...prev,
                                [activeProjectId]: {
                                  ...currentBudgetConfig,
                                  [timeframe]: val
                                }
                              }));
                            }}
                            className="h-9 rounded-xl border-zinc-200 text-xs text-zinc-900 font-extrabold pr-7 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed"
                          />
                          {!isAdmin && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">
                              🔒
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 self-end">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          disabled={!isAdmin}
                          onClick={() => {
                            setProjectBudgets(prev => ({
                              ...prev,
                              [activeProjectId]: {
                                weekly: activeProject?.name.toLowerCase().includes('crm') || activeProject?.name.toLowerCase().includes('insight') ? 2 : 5,
                                monthly: activeProject?.name.toLowerCase().includes('crm') || activeProject?.name.toLowerCase().includes('insight') ? 8 : 15
                              }
                            }));
                          }}
                          className="h-9 w-full rounded-xl text-[9px] uppercase font-bold tracking-wider disabled:opacity-50"
                        >
                          Reset Default
                        </Button>
                      </div>
                    </div>

                    {!isAdmin ? (
                      <p className="text-[9px] text-zinc-400 font-semibold italic flex items-center gap-1 bg-zinc-100 p-2 rounded-lg mt-2">
                        🔒 Only administrators can edit budget hour limits.
                      </p>
                    ) : (
                      <p className="text-[9px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                        ✓ Authorized: You can adjust this project's allocation.
                      </p>
                    )}
                  </div>
                </div>

                {/* Right columns: Task-by-task Diagnostic Time Sunk Analyzer */}
                <div className="md:col-span-7 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Task-by-Task Diagnostic Analysis</h4>
                      <p className="text-[9px] text-zinc-400 font-medium">Which tasks consumed the most time in this period?</p>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-full">
                      {taskBreakdown.length} Tasks
                    </span>
                  </div>

                  {/* Over Budget Recommendation Alert */}
                  {isOverBudget && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-150/50 flex gap-2 text-rose-800">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-wide">Exceeded Allotted Limit</p>
                        <p className="text-[9px] font-semibold text-rose-600 mt-0.5">
                          Time logged ({totalHoursSpent.toFixed(2)} hrs) has crossed the {budgetHours.toFixed(1)} hrs threshold. 
                          {taskBreakdown.length > 0 && ` Inspect "${taskBreakdown[0].name}" which took ${taskBreakdown[0].timeInTimeframeHours.toFixed(2)} hrs.`}
                        </p>
                      </div>
                    </div>
                  )}

                  {taskBreakdown.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-zinc-150 rounded-2xl bg-zinc-50/50">
                      <Clock className="w-6 h-6 text-zinc-300 mb-2" />
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No hours logged</p>
                      <p className="text-[10px] text-zinc-400 mt-1">No tasks recorded time for this timeframe.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                      {taskBreakdown.map(t => {
                        const taskPercentOfTotal = totalHoursSpent > 0 ? (t.timeInTimeframeHours / totalHoursSpent) * 100 : 0;
                        const isMajorTimeSunk = taskPercentOfTotal > 40 || t.timeInTimeframeHours > 3;
                        
                        const hasEstimate = t.timeEstimate && t.timeEstimate > 0;
                        const percentVal = hasEstimate 
                          ? (t.timeInTimeframeHours / (t.timeEstimate || 1)) * 100 
                          : taskPercentOfTotal;
                        
                        const isOverEstimate = hasEstimate && t.timeInTimeframeHours > (t.timeEstimate || 0);

                        return (
                          <div 
                            key={t.id}
                            onClick={() => onNavigateToTask?.(t.id)}
                            className={cn(
                              "p-3.5 rounded-xl border transition-all duration-200 select-none",
                              onNavigateToTask ? "cursor-pointer animate-pulse-subtle" : "",
                              isOverEstimate
                                ? "bg-rose-500/5 border-rose-200/40 dark:border-rose-900/30 hover:bg-rose-500/10 hover:border-rose-300"
                                : isMajorTimeSunk 
                                  ? "bg-amber-500/5 border-amber-200/40 dark:border-amber-900/30 hover:bg-amber-500/10 hover:border-amber-300" 
                                  : "bg-white dark:bg-zinc-950 border-zinc-150 dark:border-zinc-850 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-50 hover:text-brand-secondary transition-colors truncate">{t.name}</h5>
                                  {isOverEstimate ? (
                                    <Badge className="bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 text-[8px] font-black uppercase tracking-widest h-4 shrink-0 px-1.5 shadow-none">
                                      ⚠️ Over Estimate
                                    </Badge>
                                  ) : isMajorTimeSunk ? (
                                    <Badge className="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 text-[8px] font-black uppercase tracking-widest h-4 shrink-0 px-1.5 shadow-none">
                                      ⚠️ Time Sink
                                    </Badge>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-zinc-500 font-bold">
                                  <span className={cn(
                                    "px-1.5 py-0.5 rounded text-[8px] uppercase font-extrabold",
                                    t.status === 'Done' || t.status === 'Approved' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800"
                                  )}>
                                    {t.status}
                                  </span>
                                  <span>•</span>
                                  <span className="text-zinc-400">Priority: {t.priority}</span>
                                  {onNavigateToTask && (
                                    <>
                                      <span>•</span>
                                      <span className="text-zinc-400 font-extrabold text-[8px] uppercase text-zinc-500 flex items-center gap-0.5 hover:text-zinc-700">Drilldown →</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 font-mono">{t.timeInTimeframeHours.toFixed(2)} hrs</span>
                                <p className="text-[9px] font-bold text-zinc-400 mt-0.5">
                                  {hasEstimate 
                                    ? `${percentVal.toFixed(0)}% of estimate (${t.timeEstimate}h)` 
                                    : `${taskPercentOfTotal.toFixed(0)}% of project`
                                  }
                                </p>
                              </div>
                            </div>

                            {/* Task percentage track */}
                            <div className="mt-3">
                              <div className="w-full bg-zinc-100 dark:bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-full rounded-full transition-all duration-300",
                                    isOverEstimate 
                                      ? "bg-rose-500" 
                                      : isMajorTimeSunk 
                                        ? "bg-amber-500" 
                                        : "bg-zinc-700 dark:bg-zinc-400"
                                  )}
                                  style={{ width: `${Math.min(percentVal, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )}
</div>
);
}
