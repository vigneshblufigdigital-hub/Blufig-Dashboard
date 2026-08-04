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
  TrendingUp,
  Users,
  Folder,
  Lock,
  Settings,
  LayoutGrid,
  Briefcase,
  ShieldCheck,
  Sparkles,
  Layers,
  RefreshCw,
  Sliders,
  Database,
  User,
  Globe,
  CalendarDays,
  UserCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
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
import { ClientReport, Project, UserRole, ADMIN_ROLES, Task, ProjectType, TaskStatus, Priority, isSuperAdmin, UserProfile, Department } from '@/src/types';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { MOCK_USERS } from '../../mockData';

interface ClientReportsProps {
  reports: ClientReport[];
  projects: Project[];
  tasks?: Task[];
  users?: UserProfile[];
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
  users = [],
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

  const [activeTab, setActiveTab] = useState<'budget' | 'monthend' | 'reports'>('budget');
  const [selectedClientIdState, setSelectedClientIdState] = useState<string>('');
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly'>('monthly');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [leadReportSelectedDepartment, setLeadReportSelectedDepartment] = useState<string>('all');
  const [leadReportSelectedProjectId, setLeadReportSelectedProjectId] = useState<string>('all');
  const [leadReportSelectedMonth, setLeadReportSelectedMonth] = useState<string>('2026-07');
  const [showITDecisionMatrix, setShowITDecisionMatrix] = useState(false);

  // User Role Scope & Role Hierarchy Analysis
  const isHead = React.useMemo(() => {
    if (!user) return false;
    return (
      user.role === UserRole.AGENCY_ADMIN ||
      user.role === UserRole.ACCOUNT_DIRECTOR ||
      Boolean(user.isSuperAdmin) ||
      isSuperAdmin(user)
    );
  }, [user]);

  const isManager = React.useMemo(() => {
    if (!user || isHead) return false;
    return ADMIN_ROLES.includes(user.role);
  }, [user, isHead]);

  const isEmployee = !isHead && !isManager;

  // Employee filter state
  const [reportSelectedEmployeeId, setReportSelectedEmployeeId] = useState<string>('all');

  // Timeframe Wise Filtering (week, month, quarter, year)
  const [reportTimeframeType, setReportTimeframeType] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  // Timeframe selection values
  const [selectedWeek, setSelectedWeek] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const jan1 = new Date(year, 0, 1);
    const days = Math.floor((d.getTime() - jan1.getTime()) / (24 * 60 * 60 * 1000));
    const weekNum = Math.ceil((days + jan1.getDay() + 1) / 7);
    return `${year}-W${String(weekNum).padStart(2, '0')}`;
  });

  const [selectedQuarterYear, setSelectedQuarterYear] = useState<string>(() => `${new Date().getFullYear()}`);
  const [selectedQuarter, setSelectedQuarter] = useState<string>(() => {
    const q = Math.floor(new Date().getMonth() / 3) + 1;
    return `Q${q}`;
  });

  const [selectedYear, setSelectedYear] = useState<string>(() => `${new Date().getFullYear()}`);

  // Automatically enforce role default constraints
  React.useEffect(() => {
    if (isEmployee && user) {
      setReportSelectedEmployeeId(user.id);
      if (user.department) setLeadReportSelectedDepartment(user.department);
    } else if (isManager && user) {
      if (user.department && leadReportSelectedDepartment === 'all') {
        setLeadReportSelectedDepartment(user.department);
      }
    }
  }, [user, isEmployee, isManager]);

  const allAppUsers = users.length ? users : MOCK_USERS;

  // Available Employees for Manager and Head
  const availableEmployees = React.useMemo(() => {
    if (isEmployee && user) {
      return allAppUsers.filter(u => u.id === user.id);
    }
    if (isManager && user) {
      return allAppUsers.filter(u => u.department === user.department || u.id === user.id);
    }
    return allAppUsers.filter(u => u.role !== UserRole.CLIENT);
  }, [allAppUsers, user, isEmployee, isManager]);

  // Helper function to test if a date string falls in the selected timeframe
  const checkDateInTimeframe = React.useCallback((dateInput?: string | Date | null): boolean => {
    if (!dateInput) return true;
    const date = typeof dateInput === 'string' ? new Date(dateInput.split('T')[0]) : new Date(dateInput);
    if (isNaN(date.getTime())) return true;

    if (reportTimeframeType === 'week') {
      const parts = selectedWeek.split('-W');
      if (parts.length === 2) {
        const y = parseInt(parts[0], 10);
        const w = parseInt(parts[1], 10);
        const jan1 = new Date(y, 0, 1);
        const dayOfWeek = jan1.getDay() || 7;
        const firstMonday = new Date(jan1);
        if (dayOfWeek <= 4) {
          firstMonday.setDate(jan1.getDate() - dayOfWeek + 1);
        } else {
          firstMonday.setDate(jan1.getDate() + (8 - dayOfWeek));
        }
        const weekStart = new Date(firstMonday);
        weekStart.setDate(firstMonday.getDate() + (w - 1) * 7);
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        return date >= weekStart && date <= weekEnd;
      }
      return true;
    }

    if (reportTimeframeType === 'month') {
      const [yStr, mStr] = leadReportSelectedMonth.split('-');
      if (!yStr || !mStr) return true;
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10) - 1;
      return date.getFullYear() === y && date.getMonth() === m;
    }

    if (reportTimeframeType === 'quarter') {
      const y = parseInt(selectedQuarterYear, 10);
      const qNum = parseInt(selectedQuarter.replace('Q', ''), 10);
      const startM = (qNum - 1) * 3;
      const endM = startM + 2;
      return date.getFullYear() === y && date.getMonth() >= startM && date.getMonth() <= endM;
    }

    if (reportTimeframeType === 'year') {
      const y = parseInt(selectedYear, 10);
      return date.getFullYear() === y;
    }

    return true;
  }, [reportTimeframeType, selectedWeek, leadReportSelectedMonth, selectedQuarterYear, selectedQuarter, selectedYear]);

  // Real live data from props (dummy/seeded projects and tasks removed)
  const demoProjects = projects;
  const demoTasks = tasks;

  const [selectedReportProjectId, setSelectedReportProjectId] = useState<string>('all');

  const [projectBudgets, setProjectBudgets] = useState<Record<string, { weekly: number; monthly: number }>>(() => {
    const initial: Record<string, { weekly: number; monthly: number }> = {};
    demoProjects.forEach(p => {
      let weekly = p.timingHours || 6;
      let monthly = weekly * 4;
      const nameLower = p.name.toLowerCase();
      if (nameLower.includes('crm') || nameLower.includes('insight')) {
        weekly = p.timingHours || 4;
        monthly = weekly * 4;
      }
      initial[p.id] = { weekly, monthly };
    });
    return initial;
  });

  const isDateInTimeframe = (dateStr: string | undefined, type: 'weekly' | 'monthly') => {
    if (!dateStr) return type === 'monthly';
    const date = new Date(dateStr.split('T')[0]);
    const refDate = new Date();
    
    const dateMs = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const refMs = Date.UTC(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
    
    const diffDays = (refMs - dateMs) / (1000 * 60 * 60 * 24);
    
    if (type === 'weekly') {
      return diffDays >= -1 && diffDays < 7;
    } else {
      return diffDays >= -1 && diffDays < 30;
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
      
      const pBudgetConfig = projectBudgets[p.id] || { weekly: 6, monthly: 24 };
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
    link.setAttribute('download', `Project_Time_Allocation_${timeframe}_${new Date().toISOString().split('T')[0]}.csv`);
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
      
      const pBudgetConfig = projectBudgets[p.id] || { weekly: 6, monthly: 24 };
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
    doc.text('PROJECT TIME ALLOCATION UTILIZATION & VELOCITY REPORT', 20, 42);

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
    doc.text('BLUFIG Operations System • Project Time Utilization & Velocity Report', 20, 280);
    doc.text('Confidential Internal Report • Page 1 of 1', 190, 280, { align: 'right' });

    doc.save(`Project_Time_Allocation_${timeframe}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const isAdmin = user && (ADMIN_ROLES.includes(user.role) || isSuperAdmin(user));

  // Filter projects by selection
  const activeProjects = selectedReportProjectId === 'all'
    ? demoProjects
    : demoProjects.filter(p => p.id === selectedReportProjectId);

  const activeTasks = demoTasks.filter(t => activeProjects.some(p => p.id === t.projectId));
  
  const totalSecondsSpent = activeTasks.reduce((sum, t) => {
    const elapsedSeconds = (elapsedTimes && elapsedTimes[t.id] !== undefined)
      ? elapsedTimes[t.id]
      : (t.timeLoggedSeconds || ((t.timeLogged || 0) * 3600));

    if (isDateInTimeframe(t.updatedAt || t.createdAt, timeframe) || t.id === activeTimerTaskId) {
      return sum + elapsedSeconds;
    }
    return sum;
  }, 0);
  const totalHoursSpent = totalSecondsSpent / 3600;

  // Budget for selected project(s) and timeframe
  let budgetHours = 0;
  if (selectedReportProjectId === 'all') {
    budgetHours = demoProjects.reduce((sum, p) => {
      const cfg = projectBudgets[p.id] || { weekly: 6, monthly: 24 };
      return sum + (timeframe === 'weekly' ? cfg.weekly : cfg.monthly);
    }, 0);
  } else {
    const selectedProjObj = demoProjects.find(p => p.id === selectedReportProjectId);
    if (selectedProjObj) {
      const cfg = projectBudgets[selectedProjObj.id] || {
        weekly: selectedProjObj.timingHours || 6,
        monthly: (selectedProjObj.timingHours || 6) * 4
      };
      budgetHours = timeframe === 'weekly' ? cfg.weekly : cfg.monthly;
    } else {
      budgetHours = timeframe === 'weekly' ? 10 : 40;
    }
  }

  const isOverBudget = totalHoursSpent > budgetHours;
  const budgetUsagePercent = budgetHours > 0 ? (totalHoursSpent / budgetHours) * 100 : 0;

  // Sort tasks by time spent in the selected timeframe
  const taskBreakdown = activeTasks
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
              className={cn(
                buttonVariants({}),
                "bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl px-6 h-11 font-bold text-xs uppercase tracking-widest shadow-lg shadow-zinc-200 flex items-center justify-center cursor-pointer"
              )}
            >
              <Plus className="w-4 h-4 mr-2" />
              Submit New Report
            </DialogTrigger>
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
      <div className="flex border-b border-zinc-100 mb-6 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          onClick={() => setActiveTab('budget')}
          className={cn(
            "px-5 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer",
            activeTab === 'budget' 
              ? "border-zinc-900 text-zinc-900" 
              : "border-transparent text-zinc-400 hover:text-zinc-600"
          )}
        >
          📊 Time Utilization & Allocation Monitor
        </button>
        <button
          onClick={() => setActiveTab('monthend')}
          className={cn(
            "px-5 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer",
            activeTab === 'monthend' 
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-black" 
              : "border-transparent text-zinc-400 hover:text-zinc-600"
          )}
        >
          <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
          <span>Month-End Lead & Asset Breakdown Report</span>
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={cn(
            "px-5 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all shrink-0 cursor-pointer",
            activeTab === 'reports' 
              ? "border-zinc-900 text-zinc-900" 
              : "border-transparent text-zinc-400 hover:text-zinc-600"
          )}
        >
          📄 Published Reports
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
  ) : activeTab === 'budget' ? (
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
          
          const pBudgetConfig = projectBudgets[p.id] || { weekly: 6, monthly: 24 };
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
          <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-5 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-zinc-900 dark:text-white" />
                  Project Time Allocation & Utilization Monitor
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-1 font-medium">
                  Monitor task velocity, view total hours logged, and drill down on diagnostic trends across your workspace projects.
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
                    <span className="text-rose-500 font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                      Attention required immediately
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      All projects within threshold
                    </span>
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

      {/* MAIN FULL-WIDTH DATA SECTION: Detailed Time spent and Budget Tracker */}
      <div className="w-full space-y-6">
        <Card className="border-zinc-200 rounded-2xl shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-zinc-900 text-white hover:bg-zinc-800 text-[9px] font-bold tracking-widest uppercase">
                      PROJECT TIME & BUDGET DIAGNOSTICS
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-black tracking-tight text-zinc-900 mt-2 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-zinc-700" />
                    <span>
                      {selectedReportProjectId === 'all' 
                        ? 'All Workspace Projects' 
                        : (demoProjects.find(p => p.id === selectedReportProjectId)?.name || 'Project Details')}
                    </span>
                  </CardTitle>
                  <CardDescription className="text-xs font-semibold text-zinc-500 mt-1.5 leading-relaxed">
                    Time tracking & budget diagnostics across {demoProjects.length} active projects:
                  </CardDescription>

                  {/* Responsive Project Tabs / Pills */}
                  {demoProjects.length > 0 && (
                    <div className="mt-4 space-y-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 block">
                        Select Project Filter:
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-0.5">
                        <button
                          onClick={() => setSelectedReportProjectId('all')}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border cursor-pointer",
                            selectedReportProjectId === 'all'
                              ? "bg-zinc-900 text-white border-zinc-900 shadow-sm"
                              : "bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border-zinc-200"
                          )}
                        >
                          <LayoutGrid className="w-3.5 h-3.5" />
                          <span>All Projects ({demoProjects.length})</span>
                        </button>
                        {demoProjects.map(p => {
                          const isSelected = selectedReportProjectId === p.id;
                          return (
                            <button
                              key={p.id}
                              onClick={() => setSelectedReportProjectId(p.id)}
                              className={cn(
                                "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border cursor-pointer",
                                isSelected
                                  ? "bg-zinc-900 text-white border-zinc-900 shadow-sm"
                                  : "bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border-zinc-200"
                              )}
                            >
                              <Briefcase className="w-3.5 h-3.5" />
                              <span>{p.name}</span>
                              {p.timingHours && (
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[8px] font-black",
                                  isSelected ? "bg-white/20 text-white" : "bg-zinc-200 text-zinc-700"
                                )}>
                                  {p.timingHours}h/wk
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Timeframe selector (Weekly vs Monthly) */}
                <div className="flex rounded-xl bg-zinc-100 p-0.5 border border-zinc-200 self-start md:self-auto shrink-0">
                  <button
                    onClick={() => setTimeframe('weekly')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[10px] uppercase font-black tracking-wider transition-all cursor-pointer",
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
                      "px-4 py-2 rounded-lg text-[10px] uppercase font-black tracking-wider transition-all cursor-pointer",
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
                
                {/* Left columns: Budget Tracker & Pie Chart */}
                <div className="md:col-span-5 flex flex-col gap-6">
                  {/* Budget Limit Status & Adjust Budget */}
                  <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-100 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Budget Limit Status</span>
                        <Badge className={cn(
                          "text-[9px] font-bold uppercase tracking-wider px-2.5 py-1",
                          isOverBudget ? "bg-rose-50 text-rose-600 border border-rose-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        )}>
                          <span className="flex items-center gap-1">
                            {isOverBudget ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                            <span>{isOverBudget ? 'Budget Exceeded' : 'Within Budget'}</span>
                          </span>
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

                    {/* Adjust Allocations */}
                    <div className="pt-5 border-t border-zinc-200 mt-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                          <Settings className="w-3.5 h-3.5 text-zinc-500" />
                          <span>Adjust Budget Allocation</span>
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
                              disabled={!isAdmin || selectedReportProjectId === 'all'}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                if (selectedReportProjectId !== 'all') {
                                  setProjectBudgets(prev => ({
                                    ...prev,
                                    [selectedReportProjectId]: {
                                      ...(prev[selectedReportProjectId] || { weekly: 6, monthly: 24 }),
                                      [timeframe]: val
                                    }
                                  }));
                                }
                              }}
                              className="h-9 rounded-xl border-zinc-200 text-xs text-zinc-900 font-extrabold pr-7 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed"
                            />
                            {(!isAdmin || selectedReportProjectId === 'all') && (
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400">
                                <Lock className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex-1 self-end">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={!isAdmin || selectedReportProjectId === 'all'}
                            onClick={() => {
                              if (selectedReportProjectId !== 'all') {
                                const pObj = demoProjects.find(p => p.id === selectedReportProjectId);
                                const defaultW = pObj?.timingHours || 6;
                                setProjectBudgets(prev => ({
                                  ...prev,
                                  [selectedReportProjectId]: {
                                    weekly: defaultW,
                                    monthly: defaultW * 4
                                  }
                                }));
                              }
                            }}
                            className="h-9 w-full rounded-xl text-[9px] uppercase font-bold tracking-wider disabled:opacity-50 cursor-pointer"
                          >
                            Reset Default
                          </Button>
                        </div>
                      </div>

                      {selectedReportProjectId === 'all' ? (
                        <p className="text-[9px] text-zinc-400 font-semibold italic flex items-center gap-1.5 bg-zinc-100 p-2 rounded-lg mt-2">
                          <span>Select an individual project filter above to edit its budget allocation.</span>
                        </p>
                      ) : !isAdmin ? (
                        <p className="text-[9px] text-zinc-400 font-semibold italic flex items-center gap-1.5 bg-zinc-100 p-2 rounded-lg mt-2">
                          <Lock className="w-3 h-3 text-zinc-400" />
                          <span>Only administrators can edit budget hour limits.</span>
                        </p>
                      ) : (
                        <p className="text-[9px] text-emerald-600 font-bold flex items-center gap-1.5 mt-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Authorized: You can adjust this project's allocation.</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* PIE CHART: Project Hours Distribution */}
                  {(() => {
                    let pieData: { name: string; value: number }[] = [];
                    if (selectedReportProjectId === 'all') {
                      pieData = demoProjects.map(p => {
                        const pTasks = demoTasks.filter(t => t.projectId === p.id);
                        const pSecs = pTasks.reduce((sum, t) => {
                          if (isDateInTimeframe(t.updatedAt || t.createdAt, timeframe) || t.id === activeTimerTaskId) {
                            return sum + ((elapsedTimes && elapsedTimes[t.id] !== undefined)
                              ? elapsedTimes[t.id]
                              : (t.timeLoggedSeconds || ((t.timeLogged || 0) * 3600)));
                          }
                          return sum;
                        }, 0);
                        return {
                          name: p.name,
                          value: parseFloat((pSecs / 3600).toFixed(2))
                        };
                      }).filter(item => item.value > 0);
                    } else {
                      pieData = activeTasks.map(t => {
                        const elapsed = (elapsedTimes && elapsedTimes[t.id] !== undefined)
                          ? elapsedTimes[t.id]
                          : (t.timeLoggedSeconds || ((t.timeLogged || 0) * 3600));
                        const tSecs = isDateInTimeframe(t.updatedAt || t.createdAt, timeframe) || t.id === activeTimerTaskId ? elapsed : 0;
                        return {
                          name: t.name,
                          value: parseFloat((tSecs / 3600).toFixed(2))
                        };
                      }).filter(item => item.value > 0);
                    }

                    const PIE_COLORS = ['#18181b', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

                    return (
                      <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-100 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Project timing distribution</span>
                            <Badge className="bg-zinc-200 text-zinc-800 text-[8px] font-bold tracking-widest uppercase">
                              PIE CHART
                            </Badge>
                          </div>

                          {pieData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center text-zinc-400 italic">
                              <Clock className="w-6 h-6 text-zinc-300 mb-2" />
                              <p className="text-xs font-bold uppercase tracking-widest">No logged hours</p>
                              <p className="text-[9px] mt-0.5">Nothing to display in pie chart for this interval.</p>
                            </div>
                          ) : (
                            <div>
                              {/* Recharts Pie */}
                              <div className="h-[140px] w-full min-w-0 flex items-center justify-center relative mt-2">
                                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                  <PieChart>
                                    <Pie
                                      data={pieData}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={30}
                                      outerRadius={52}
                                      paddingAngle={4}
                                      dataKey="value"
                                    >
                                      {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                      ))}
                                    </Pie>
                                    <Tooltip 
                                      contentStyle={{ 
                                        borderRadius: '12px', 
                                        border: 'none', 
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                        backgroundColor: '#fff',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        color: '#18181b'
                                      }}
                                      formatter={(value) => [`${value} hrs`, 'Time Spent']}
                                    />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>

                              {/* Custom Legend Grid */}
                              <div className="space-y-1.5 mt-2 max-h-[110px] overflow-y-auto pr-1">
                                {pieData.map((entry, index) => (
                                  <div key={entry.name} className="flex items-center justify-between text-[10px] py-0.5 border-b border-zinc-100 last:border-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div 
                                        className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse-subtle" 
                                        style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                                      />
                                      <span className="font-bold text-zinc-600 truncate">{entry.name}</span>
                                    </div>
                                    <span className="font-black font-mono text-zinc-900 shrink-0">{entry.value.toFixed(1)} hrs</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
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
                    <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-zinc-100 rounded-2xl bg-zinc-50/50">
                      <Clock className="w-6 h-6 text-zinc-300 mb-2" />
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No hours logged</p>
                      <p className="text-[10px] text-zinc-400 mt-1">No tasks recorded time for this timeframe.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                      {taskBreakdown.map(t => {
                        const taskPercentOfTotal = totalHoursSpent > 0 ? (t.timeInTimeframeHours / totalHoursSpent) * 100 : 0;
                        const isMajorTimeSunk = taskPercentOfTotal > 40 || t.timeInTimeframeHours > 3;
                        
                        const hasEstimate = t.timeEstimate && t.timeEstimate > 0;
                        const percentVal = hasEstimate 
                          ? (t.timeInTimeframeHours / (t.timeEstimate || 1)) * 100 
                          : taskPercentOfTotal;
                        
                        const isOverEstimate = hasEstimate && t.timeInTimeframeHours > (t.timeEstimate || 0);

                        // Find project for badge
                        const taskProj = demoProjects.find(p => p.id === t.projectId);

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
                                  : "bg-white dark:bg-zinc-950 border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-50 hover:text-brand-secondary transition-colors truncate">{t.name}</h5>
                                  {isOverEstimate ? (
                                    <Badge className="bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 text-[8px] font-black uppercase tracking-widest h-4 shrink-0 px-1.5 shadow-none flex items-center gap-1">
                                      <AlertTriangle className="w-2.5 h-2.5" />
                                      <span>Over Estimate</span>
                                    </Badge>
                                  ) : isMajorTimeSunk ? (
                                    <Badge className="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 text-[8px] font-black uppercase tracking-widest h-4 shrink-0 px-1.5 shadow-none flex items-center gap-1">
                                      <AlertTriangle className="w-2.5 h-2.5" />
                                      <span>Time Sink</span>
                                    </Badge>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-zinc-500 font-bold flex-wrap">
                                  {taskProj && (
                                    <span className="text-zinc-900 font-extrabold bg-zinc-100 p-0.5 px-1.5 rounded text-[8px] uppercase flex items-center gap-1">
                                      <Folder className="w-2.5 h-2.5 text-zinc-500" />
                                      <span>{taskProj.name}</span>
                                    </span>
                                  )}
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
                                    : `${taskPercentOfTotal.toFixed(0)}% of total`
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
  ) : (
    /* Month-End Lead & Asset Breakdown Report View */
    <div className="space-y-6">
      {/* Header Controls Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-3xl shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                <span>Performance & Time Tracking Report</span>
              </h3>
              {isEmployee && (
                <Badge variant="outline" className="bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 text-xs px-2.5 py-0.5 font-bold flex items-center gap-1">
                  <User className="w-3 h-3 text-amber-600" />
                  <span>My Own Reports</span>
                </Badge>
              )}
              {isManager && (
                <Badge variant="outline" className="bg-indigo-50 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 text-xs px-2.5 py-0.5 font-bold flex items-center gap-1">
                  <Users className="w-3 h-3 text-indigo-600" />
                  <span>{user?.department || 'Department'} Team Report</span>
                </Badge>
              )}
              {isHead && (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 text-xs px-2.5 py-0.5 font-bold flex items-center gap-1">
                  <Globe className="w-3 h-3 text-emerald-600" />
                  <span>Company-Wide Report</span>
                </Badge>
              )}
            </div>
            <p className="text-xs text-zinc-500 font-medium mt-1">
              {isEmployee
                ? "View your personal logged hours, completed subtasks, revision rounds, and time allocation across projects."
                : isManager
                ? `Track deliverable progress, revision cycles, and logged hours for your team (${user?.department || 'Department'}) or individual members.`
                : "Executive view across all company departments, client projects, and individual team members."}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowITDecisionMatrix(true)}
            className="h-9 px-3 text-xs font-bold rounded-xl border-indigo-200 dark:border-indigo-900 bg-indigo-50/80 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 hover:bg-indigo-100 flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>IT Decision Matrix</span>
          </Button>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* 1. Timeframe Type Switcher */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl gap-1">
            <button
              onClick={() => setReportTimeframeType('week')}
              className={cn(
                "px-2.5 py-1 text-xs font-extrabold rounded-lg transition-all cursor-pointer",
                reportTimeframeType === 'week'
                  ? "bg-white dark:bg-zinc-900 text-indigo-600 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              )}
            >
              Week Wise
            </button>
            <button
              onClick={() => setReportTimeframeType('month')}
              className={cn(
                "px-2.5 py-1 text-xs font-extrabold rounded-lg transition-all cursor-pointer",
                reportTimeframeType === 'month'
                  ? "bg-white dark:bg-zinc-900 text-indigo-600 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              )}
            >
              Month Wise
            </button>
            <button
              onClick={() => setReportTimeframeType('quarter')}
              className={cn(
                "px-2.5 py-1 text-xs font-extrabold rounded-lg transition-all cursor-pointer",
                reportTimeframeType === 'quarter'
                  ? "bg-white dark:bg-zinc-900 text-indigo-600 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              )}
            >
              Quarter Wise
            </button>
            <button
              onClick={() => setReportTimeframeType('year')}
              className={cn(
                "px-2.5 py-1 text-xs font-extrabold rounded-lg transition-all cursor-pointer",
                reportTimeframeType === 'year'
                  ? "bg-white dark:bg-zinc-900 text-indigo-600 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              )}
            >
              Year Wise
            </button>
          </div>

          {/* 2. Timeframe Selection Inputs */}
          {reportTimeframeType === 'week' && (
            <Input
              type="week"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="h-9 text-xs font-bold rounded-xl border-zinc-200 dark:border-zinc-800 w-[160px]"
            />
          )}

          {reportTimeframeType === 'month' && (
            <Input
              type="month"
              value={leadReportSelectedMonth}
              onChange={(e) => setLeadReportSelectedMonth(e.target.value)}
              className="h-9 text-xs font-bold rounded-xl border-zinc-200 dark:border-zinc-800 w-[140px]"
            />
          )}

          {reportTimeframeType === 'quarter' && (
            <div className="flex items-center gap-1.5">
              <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                <SelectTrigger className="h-9 text-xs font-bold rounded-xl border-zinc-200 dark:border-zinc-800 w-[110px]">
                  <SelectValue placeholder="Quarter" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Q1" className="text-xs font-medium">Q1 (Jan-Mar)</SelectItem>
                  <SelectItem value="Q2" className="text-xs font-medium">Q2 (Apr-Jun)</SelectItem>
                  <SelectItem value="Q3" className="text-xs font-medium">Q3 (Jul-Sep)</SelectItem>
                  <SelectItem value="Q4" className="text-xs font-medium">Q4 (Oct-Dec)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedQuarterYear} onValueChange={setSelectedQuarterYear}>
                <SelectTrigger className="h-9 text-xs font-bold rounded-xl border-zinc-200 dark:border-zinc-800 w-[90px]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="2024" className="text-xs font-medium">2024</SelectItem>
                  <SelectItem value="2025" className="text-xs font-medium">2025</SelectItem>
                  <SelectItem value="2026" className="text-xs font-medium">2026</SelectItem>
                  <SelectItem value="2027" className="text-xs font-medium">2027</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {reportTimeframeType === 'year' && (
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-9 text-xs font-bold rounded-xl border-zinc-200 dark:border-zinc-800 w-[110px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="2024" className="text-xs font-medium">2024</SelectItem>
                <SelectItem value="2025" className="text-xs font-medium">2025</SelectItem>
                <SelectItem value="2026" className="text-xs font-medium">2026</SelectItem>
                <SelectItem value="2027" className="text-xs font-medium">2027</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* 3. Employee Filter Dropdown */}
          <Select 
            value={reportSelectedEmployeeId} 
            onValueChange={setReportSelectedEmployeeId}
            disabled={isEmployee}
          >
            <SelectTrigger className="h-9 text-xs font-bold rounded-xl border-zinc-200 dark:border-zinc-800 w-[190px]">
              <SelectValue placeholder="Filter by Employee" />
            </SelectTrigger>
            <SelectContent className="rounded-xl max-h-60">
              {isEmployee ? (
                <SelectItem value={user?.id || 'me'} className="text-xs font-bold">
                  {user?.name || 'My Own Report'} (Only Me)
                </SelectItem>
              ) : (
                <>
                  <SelectItem value="all" className="text-xs font-bold">
                    {isManager ? "👥 All Team Members" : "🌐 All Employees"}
                  </SelectItem>
                  {availableEmployees.map(u => (
                    <SelectItem key={u.id} value={u.id} className="text-xs">
                      {u.name} ({u.designation || u.department})
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>

          {/* 4. Department Filter */}
          <Select value={leadReportSelectedDepartment} onValueChange={setLeadReportSelectedDepartment}>
            <SelectTrigger className="h-9 text-xs font-bold rounded-xl border-zinc-200 dark:border-zinc-800 w-[170px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="text-xs font-bold">All Departments</SelectItem>
              <SelectItem value={Department.DESIGN} className="text-xs font-medium">Design</SelectItem>
              <SelectItem value={Department.CONTENT} className="text-xs font-medium">Content</SelectItem>
              <SelectItem value={Department.WEB_DEVELOPMENT} className="text-xs font-medium">Web Development</SelectItem>
              <SelectItem value={Department.DIGITAL_MARKETING} className="text-xs font-medium">Digital Marketing</SelectItem>
              <SelectItem value={Department.CLIENT_SERVICING} className="text-xs font-medium">Client Servicing</SelectItem>
            </SelectContent>
          </Select>

          {/* 5. Project Filter */}
          <Select value={leadReportSelectedProjectId} onValueChange={setLeadReportSelectedProjectId}>
            <SelectTrigger className="h-9 text-xs font-bold rounded-xl border-zinc-200 dark:border-zinc-800 w-[180px]">
              <SelectValue placeholder="Select Client/Project" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="text-xs font-bold">All Clients & Projects</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Report Data Calculations */}
      {(() => {
        const isUserAssignedSubtask = (st: any, targetUserId: string, parentTask: any) => {
          if (st.assigneeId === targetUserId) return true;
          if (st.assigneeIds?.includes(targetUserId)) return true;
          if (st.timeEntries?.some((e: any) => e.userId === targetUserId)) return true;
          if (!st.assigneeId && (!st.assigneeIds || st.assigneeIds.length === 0) && parentTask.assigneeId === targetUserId) return true;
          return false;
        };

        const filteredTasks = tasks.filter(t => {
          const matchesProject = leadReportSelectedProjectId === 'all' || t.projectId === leadReportSelectedProjectId;
          const matchesDept = leadReportSelectedDepartment === 'all' || t.department === leadReportSelectedDepartment;
          if (!matchesProject || !matchesDept) return false;

          if (isEmployee && user) {
            const isAssigned = t.assigneeId === user.id ||
              t.createdById === user.id ||
              (t.subTasks || []).some(st => isUserAssignedSubtask(st, user.id, t));
            if (!isAssigned) return false;
          } else if (isManager && user) {
            const isDept = t.department === user.department;
            const isTeam = (t.subTasks || []).some(st => {
              const assignees = st.assigneeIds || (st.assigneeId ? [st.assigneeId] : []);
              return assignees.some(aId => availableEmployees.some(e => e.id === aId));
            }) || t.assigneeId === user.id;
            if (!isDept && !isTeam) return false;
          }

          return true;
        });

        const allSubtasks = filteredTasks.flatMap(t => 
          (t.subTasks || [])
            .filter(st => {
              const stDate = st.createdAt || st.dueDate || t.updatedAt || t.createdAt;
              if (!checkDateInTimeframe(stDate)) return false;

              if (reportSelectedEmployeeId !== 'all') {
                return isUserAssignedSubtask(st, reportSelectedEmployeeId, t);
              } else if (isEmployee && user) {
                return isUserAssignedSubtask(st, user.id, t);
              }

              return true;
            })
            .map(st => ({ ...st, parentTask: t }))
        );
        
        const totalLoggedHours = allSubtasks.reduce((sum, st) => sum + (st.timeLogged || (st.timeLoggedSeconds ? st.timeLoggedSeconds / 3600 : 0)), 0);

        const amRevisionCycles = allSubtasks.filter(st => st.status === TaskStatus.CHANGES_REQUESTED_AM || st.status === TaskStatus.REVIEW).length;
        const clientRevisionCycles = allSubtasks.filter(st => st.status === TaskStatus.CHANGES_REQUESTED_CLIENT || st.status === TaskStatus.UNDER_CLIENT_REVIEW).length;
        const deadlineShifts = filteredTasks.reduce((sum, t) => sum + (t.deadlineChangeCount || 0), 0);

        // Group subtasks by Asset Type
        const assetTypeMap: Record<string, { count: number; hours: number }> = {};
        allSubtasks.forEach(st => {
          const typeKey = st.assetType || 'General Deliverable';
          const hrs = st.timeLogged || (st.timeLoggedSeconds ? st.timeLoggedSeconds / 3600 : 0);
          if (!assetTypeMap[typeKey]) assetTypeMap[typeKey] = { count: 0, hours: 0 };
          assetTypeMap[typeKey].count += 1;
          assetTypeMap[typeKey].hours += hrs;
        });

        // Group subtasks by Work Category
        const workCategoryMap: Record<string, { count: number; hours: number }> = {};
        allSubtasks.forEach(st => {
          const catKey = st.workCategory || 'BAU';
          const hrs = st.timeLogged || (st.timeLoggedSeconds ? st.timeLoggedSeconds / 3600 : 0);
          if (!workCategoryMap[catKey]) workCategoryMap[catKey] = { count: 0, hours: 0 };
          workCategoryMap[catKey].count += 1;
          workCategoryMap[catKey].hours += hrs;
        });

        // Per-Member time tracking
        const memberHoursMap: Record<string, { name: string; designation?: string; hours: number; subtasksCount: number; revisionCycles: number }> = {};
        allSubtasks.forEach(st => {
          const hrs = st.timeLogged || (st.timeLoggedSeconds ? st.timeLoggedSeconds / 3600 : 0);
          const assignees = st.assigneeIds && st.assigneeIds.length > 0 ? st.assigneeIds : (st.assigneeId ? [st.assigneeId] : ['unassigned']);
          
          const isRev = st.status === TaskStatus.CHANGES_REQUESTED_AM || st.status === TaskStatus.CHANGES_REQUESTED_CLIENT;
          
          assignees.forEach(uId => {
            // Apply Employee & Manager visibility rules to the per-member table
            if (reportSelectedEmployeeId !== 'all' && uId !== reportSelectedEmployeeId) return;
            if (isEmployee && user && uId !== user.id) return;
            if (isManager && user && uId !== 'unassigned' && !availableEmployees.some(e => e.id === uId)) return;

            const uObj = allAppUsers.find(u => u.id === uId);
            const uName = uObj?.name || (uId === 'unassigned' ? 'Unassigned / Global' : `User (${uId.slice(0, 6)})`);
            const uDesig = uObj?.designation || uObj?.department;
            if (!memberHoursMap[uId]) {
              memberHoursMap[uId] = { name: uName, designation: uDesig, hours: 0, subtasksCount: 0, revisionCycles: 0 };
            }
            memberHoursMap[uId].hours += hrs / assignees.length;
            memberHoursMap[uId].subtasksCount += 1;
            if (isRev) memberHoursMap[uId].revisionCycles += 1;
          });
        });

        return (
          <div className="space-y-6">
            {/* Metric Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 p-4 rounded-2xl">
                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Total Deliverables</p>
                <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">{allSubtasks.length}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">Across {filteredTasks.length} parent tasks</p>
              </div>

              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 p-4 rounded-2xl">
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Hours Logged</p>
                <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1 font-mono">{totalLoggedHours.toFixed(1)}h</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">Subtask timesheet sum</p>
              </div>

              <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 p-4 rounded-2xl">
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">AM Revisions</p>
                <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">{amRevisionCycles}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">Internal review cycles</p>
              </div>

              <div className="bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 p-4 rounded-2xl">
                <p className="text-[10px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">Client Revisions</p>
                <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">{clientRevisionCycles}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">External feedback rounds</p>
              </div>

              <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 p-4 rounded-2xl col-span-2 md:col-span-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">Deadline Shifts</p>
                <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">{deadlineShifts}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">Due date modifications</p>
              </div>
            </div>

            {/* Asset Type Breakdown & Work Category Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Asset Type Breakdown */}
              <Card className="rounded-3xl border-zinc-200 dark:border-zinc-800 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    <span>Deliverable Volume & Hours by Asset Type</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Breakdown of static posts, reels, blogs, UI components, etc.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.keys(assetTypeMap).length === 0 ? (
                    <p className="text-xs text-zinc-400 italic py-4 text-center">No subtask asset types recorded for selected filters.</p>
                  ) : (
                    Object.entries(assetTypeMap).map(([asset, data]) => {
                      const pct = totalLoggedHours > 0 ? (data.hours / totalLoggedHours) * 100 : 0;
                      return (
                        <div key={asset} className="space-y-1 bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-zinc-800 dark:text-zinc-200">{asset}</span>
                            <span className="text-indigo-600 font-mono">{data.count} items • {data.hours.toFixed(1)} hrs</span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              {/* Work Category Breakdown */}
              <Card className="rounded-3xl border-zinc-200 dark:border-zinc-800 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-emerald-500" />
                    <span>Work Category Distribution</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    BAU vs Adhoc vs Feature vs Strategy work split
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.keys(workCategoryMap).length === 0 ? (
                    <p className="text-xs text-zinc-400 italic py-4 text-center">No category data recorded for selected filters.</p>
                  ) : (
                    Object.entries(workCategoryMap).map(([cat, data]) => {
                      const pct = totalLoggedHours > 0 ? (data.hours / totalLoggedHours) * 100 : 0;
                      return (
                        <div key={cat} className="space-y-1 bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-zinc-800 dark:text-zinc-200">{cat}</span>
                            <span className="text-emerald-600 font-mono">{data.count} items • {data.hours.toFixed(1)} hrs ({pct.toFixed(0)}%)</span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Team Member Workload & Contribution Table */}
            <Card className="rounded-3xl border-zinc-200 dark:border-zinc-800 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500" />
                  <span>Per-Member Contribution & Revision Load</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Time logged, subtask load, and revision cycles per team member
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[10px] uppercase font-black text-zinc-400">
                        <th className="py-2 px-3">Team Member</th>
                        <th className="py-2 px-3">Subtasks</th>
                        <th className="py-2 px-3">Revision Cycles</th>
                        <th className="py-2 px-3">Logged Hours</th>
                        <th className="py-2 px-3">Share of Capacity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
                      {Object.entries(memberHoursMap).map(([mId, data]) => {
                        const share = totalLoggedHours > 0 ? (data.hours / totalLoggedHours) * 100 : 0;
                        return (
                          <tr key={mId} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                            <td className="py-2.5 px-3 font-bold text-zinc-900 dark:text-zinc-100">{data.name}</td>
                            <td className="py-2.5 px-3 text-zinc-600 dark:text-zinc-400">{data.subtasksCount} items</td>
                            <td className="py-2.5 px-3">
                              <Badge variant="outline" className={cn("text-[10px] font-bold", data.revisionCycles > 0 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200")}>
                                {data.revisionCycles} cycles
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{data.hours.toFixed(1)} hrs</td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${share}%` }} />
                                </div>
                                <span className="text-[10px] text-zinc-400 font-mono">{share.toFixed(0)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}
    </div>
  )}

  {/* IT Decision Matrix Modal */}
  <Dialog open={showITDecisionMatrix} onOpenChange={setShowITDecisionMatrix}>
    <DialogContent className="max-w-3xl rounded-3xl p-6 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 space-y-4">
      <DialogHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
        <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
          <ShieldCheck className="w-5 h-5 text-indigo-500" />
          <DialogTitle className="text-lg font-black tracking-tight">IT / Operational Architecture Decision Matrix</DialogTitle>
        </div>
        <p className="text-xs text-zinc-500">
          Cross-department architecture guidelines for data migration, reporting hierarchy, notifications, and permissions.
        </p>
      </DialogHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 p-4 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-extrabold text-xs">
            <Database className="w-4 h-4 text-indigo-500" />
            <span>1. Data Migration & Legacy System Sync</span>
          </div>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
            Subtask records store parentTaskId, AssetType, and WorkCategory tags. Legacy tasks auto-hydrate single-item subtasks so reporting metrics work retroactively without data loss.
          </p>
        </div>

        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 p-4 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-extrabold text-xs">
            <BarChart3 className="w-4 h-4 text-emerald-500" />
            <span>2. Cross-Team Reporting Structure</span>
          </div>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
            Reports roll up from Subtask → Parent Task → Project → Client → Department. Month-End Lead reports reflect actual logged hours against monthly project allocations.
          </p>
        </div>

        <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 p-4 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-extrabold text-xs">
            <RefreshCw className="w-4 h-4 text-amber-500" />
            <span>3. Handoff & Notification Dispatch</span>
          </div>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
            When subtask status changes to Review or Client Review, push notifications trigger to Account Managers and assigned specialists for immediate handoff.
          </p>
        </div>

        <div className="bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 p-4 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-sky-900 dark:text-sky-200 font-extrabold text-xs">
            <Lock className="w-4 h-4 text-sky-500" />
            <span>4. Department Access Control & Scope</span>
          </div>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
            Team members access their department boards and My Tasks capacity columns. Team Leads and Management access the cross-team Month-End Lead Report.
          </p>
        </div>
      </div>

      <DialogFooter className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
        <Button onClick={() => setShowITDecisionMatrix(false)} className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold text-xs rounded-xl px-6">
          Close Matrix
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</div>
);
}
