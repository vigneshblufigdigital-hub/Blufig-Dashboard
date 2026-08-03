import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  Plus, 
  Trash2, 
  Save, 
  RotateCcw, 
  CheckSquare, 
  Clock, 
  Briefcase, 
  AlertCircle, 
  ChevronRight,
  Sparkles,
  Layers,
  Settings,
  HelpCircle,
  FileCheck,
  X
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Priority } from '@/src/types';
import { getTemplates, saveTemplates, resetTemplates, TeamTemplate, TemplateTask } from '@/src/utils/templateStorage';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

export function TemplateEditor() {
  const [templates, setTemplates] = useState<TeamTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('web_dev');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  
  // Active states for editing / creating
  const [editingTask, setEditingTask] = useState<TemplateTask | null>(null);
  const [newSubTaskName, setNewSubTaskName] = useState<string>('');

  // Active states for template creation and deletion
  const [isAddTemplateOpen, setIsAddTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateEmoji, setNewTemplateEmoji] = useState('📋');
  const [deletingTemplate, setDeletingTemplate] = useState<TeamTemplate | null>(null);

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) {
      toast.error('Please enter a template name.');
      return;
    }

    const newId = 'tmpl_' + Math.random().toString(36).substr(2, 9);
    const newTmpl: TeamTemplate = {
      id: newId,
      name: `${newTemplateEmoji} ${newTemplateName.trim()}`,
      tasks: []
    };

    setTemplates(prev => [...prev, newTmpl]);
    setSelectedTemplateId(newId);
    setSelectedTaskId('');
    setEditingTask(null);

    // Reset fields
    setNewTemplateName('');
    setNewTemplateEmoji('📋');
    setIsAddTemplateOpen(false);

    toast.success('New team template added! Please click "Save Blueprint Config" to persist your changes.');
  };

  const handleDeleteTemplate = () => {
    if (!deletingTemplate) return;
    
    const targetId = deletingTemplate.id;
    if (templates.length <= 1) {
      toast.error('Cannot delete the last remaining template.');
      return;
    }

    const updated = templates.filter(t => t.id !== targetId);
    setTemplates(updated);

    if (selectedTemplateId === targetId) {
      const nextActive = updated[0];
      setSelectedTemplateId(nextActive.id);
      if (nextActive.tasks.length > 0) {
        setSelectedTaskId(nextActive.tasks[0].id);
        setEditingTask({ ...nextActive.tasks[0] });
      } else {
        setSelectedTaskId('');
        setEditingTask(null);
      }
    }

    setDeletingTemplate(null);
    toast.success(`Template "${deletingTemplate.name}" removed from working config. Click "Save Blueprint Config" to persist.`);
  };

  // Initial load
  useEffect(() => {
    const loaded = getTemplates();
    setTemplates(loaded);
    if (loaded.length > 0) {
      setSelectedTemplateId(loaded[0].id);
      if (loaded[0].tasks.length > 0) {
        setSelectedTaskId(loaded[0].tasks[0].id);
        setEditingTask({ ...loaded[0].tasks[0] });
      }
    }
  }, []);

  // Sync edit form when selected template changes or selected task changes
  const activeTemplate = templates.find(t => t.id === selectedTemplateId);

  const selectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const tmpl = templates.find(t => t.id === id);
    if (tmpl && tmpl.tasks.length > 0) {
      setSelectedTaskId(tmpl.tasks[0].id);
      setEditingTask({ ...tmpl.tasks[0] });
    } else {
      setSelectedTaskId('');
      setEditingTask(null);
    }
  };

  const selectTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    if (activeTemplate) {
      const task = activeTemplate.tasks.find(t => t.id === taskId);
      if (task) {
        setEditingTask({ ...task });
      } else {
        setEditingTask(null);
      }
    }
  };

  const handleFieldChange = (field: keyof TemplateTask, value: any) => {
    if (!editingTask) return;
    const updated = { ...editingTask, [field]: value };
    setEditingTask(updated);

    // Update in-memory state immediately so left column stays in sync
    setTemplates(prev => prev.map(tmpl => {
      if (tmpl.id === selectedTemplateId) {
        return {
          ...tmpl,
          tasks: tmpl.tasks.map(t => t.id === editingTask.id ? updated : t)
        };
      }
      return tmpl;
    }));
  };

  const handleAddSubTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !newSubTaskName.trim()) return;

    const currentSubTasks = editingTask.subTasks || [];
    const updatedSubTasks = [...currentSubTasks, newSubTaskName.trim()];
    
    handleFieldChange('subTasks', updatedSubTasks);
    setNewSubTaskName('');
    toast.success('Checklist item added to template task!');
  };

  const handleRemoveSubTask = (index: number) => {
    if (!editingTask || !editingTask.subTasks) return;
    const updatedSubTasks = editingTask.subTasks.filter((_, idx) => idx !== index);
    handleFieldChange('subTasks', updatedSubTasks);
  };

  const handleAddTaskToTemplate = () => {
    if (!activeTemplate) return;

    const newId = 't_custom_' + Math.random().toString(36).substr(2, 9);
    const newTaskItem: TemplateTask = {
      id: newId,
      name: 'New Template Task',
      type: selectedTemplateId === 'web_dev' ? 'Web Development' : 
            selectedTemplateId === 'design' ? 'Design' :
            selectedTemplateId === 'content' ? 'Content' : 'Strategy',
      timeEstimate: 4.0,
      priority: Priority.NORMAL,
      subTasks: []
    };

    setTemplates(prev => prev.map(tmpl => {
      if (tmpl.id === selectedTemplateId) {
        return {
          ...tmpl,
          tasks: [...tmpl.tasks, newTaskItem]
        };
      }
      return tmpl;
    }));

    setSelectedTaskId(newId);
    setEditingTask(newTaskItem);
    toast.success('New template task added! Customize details below.');
  };

  const handleDeleteTaskFromTemplate = (taskId: string) => {
    if (!activeTemplate) return;

    const updatedTasks = activeTemplate.tasks.filter(t => t.id !== taskId);
    setTemplates(prev => prev.map(tmpl => {
      if (tmpl.id === selectedTemplateId) {
        return {
          ...tmpl,
          tasks: updatedTasks
        };
      }
      return tmpl;
    }));

    if (selectedTaskId === taskId) {
      if (updatedTasks.length > 0) {
        setSelectedTaskId(updatedTasks[0].id);
        setEditingTask({ ...updatedTasks[0] });
      } else {
        setSelectedTaskId('');
        setEditingTask(null);
      }
    }
    toast.success('Task removed from template.');
  };

  const handleSaveAll = () => {
    saveTemplates(templates);
    // Emit a custom window event so other components (e.g., TaskEngine, App.tsx) know to reload templates if they need to.
    window.dispatchEvent(new Event('blufig_templates_updated'));
    toast.success('All templates saved and integrated successfully!');
  };

  const handleResetDefaults = () => {
    if (confirm('Are you sure you want to reset all team templates to their factory defaults? This will overwrite your custom modifications.')) {
      const reseted = resetTemplates();
      setTemplates(reseted);
      // Select the first one
      if (reseted.length > 0) {
        const first = reseted.find(t => t.id === selectedTemplateId) || reseted[0];
        setSelectedTemplateId(first.id);
        if (first.tasks.length > 0) {
          setSelectedTaskId(first.tasks[0].id);
          setEditingTask({ ...first.tasks[0] });
        } else {
          setSelectedTaskId('');
          setEditingTask(null);
        }
      }
      window.dispatchEvent(new Event('blufig_templates_updated'));
      toast.success('Reset all templates to defaults!');
    }
  };

  return (
    <div className="space-y-6" id="template-editor-root">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow">
              <Settings className="w-4 h-4 animate-spin-slow" />
            </span>
            <h2 className="text-xl font-bold text-zinc-950 dark:text-zinc-50 tracking-tight">
              Team Task Templates Editor
            </h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl">
            As an administrator, configure the blueprint tasks and automatic checklist items (subtasks) that get populated whenever a new project is initialized or team tasks are auto-generated.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-center">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleResetDefaults}
            className="text-xs gap-1 border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Defaults
          </Button>
          <Button 
            size="sm" 
            onClick={handleSaveAll}
            className="text-xs gap-1 bg-zinc-950 text-white hover:bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 shadow"
          >
            <Save className="w-3.5 h-3.5" />
            Save Blueprint Config
          </Button>
        </div>
      </div>

      {/* Grid of Templates Selectors */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {templates.map(tmpl => {
          const isActive = selectedTemplateId === tmpl.id;
          return (
            <div
              key={tmpl.id}
              onClick={() => selectTemplate(tmpl.id)}
              className={cn(
                "p-3 rounded-xl border text-left transition-all duration-200 relative overflow-hidden group cursor-pointer select-none",
                isActive 
                  ? "bg-zinc-900 border-zinc-900 dark:bg-zinc-100 dark:border-zinc-100 text-white dark:text-zinc-900 shadow-md"
                  : "bg-white border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50/50 dark:bg-zinc-950 dark:border-zinc-800 dark:hover:border-zinc-700"
              )}
            >
              {/* Delete Template (Only if more than 1 template exists) */}
              {templates.length > 1 && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingTemplate(tmpl);
                  }}
                  className={cn(
                    "absolute top-1.5 right-1.5 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-150 z-20 cursor-pointer",
                    isActive 
                      ? "text-zinc-300 hover:text-rose-400 hover:bg-zinc-800" 
                      : "text-zinc-400 hover:text-rose-600 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                  )}
                  title={`Delete template "${tmpl.name}"`}
                >
                  <Trash2 className="w-3 h-3" />
                </div>
              )}

              <div className="text-xs font-semibold truncate relative z-10 pr-4">
                {tmpl.name}
              </div>
              <div className={cn(
                "text-[10px] font-mono mt-1 relative z-10",
                isActive ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-400"
              )}>
                {tmpl.tasks.length} standard tasks
              </div>
              {isActive && (
                <div className="absolute top-0 right-0 w-8 h-8 bg-brand-secondary/10 dark:bg-zinc-900/5 rounded-full filter blur-sm translate-x-2 -translate-y-2" />
              )}
            </div>
          );
        })}

        {/* Add Template Button */}
        <button
          onClick={() => setIsAddTemplateOpen(true)}
          className="p-3 rounded-xl border border-dashed border-zinc-300 hover:border-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-300 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 transition-all duration-200 text-left flex flex-col justify-center items-center min-h-[62px] cursor-pointer"
        >
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
            <Plus className="w-3.5 h-3.5" />
            Add Template
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: List of Template Tasks */}
        <div className="lg:col-span-4 space-y-3">
          <Card className="border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden">
            <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/30 py-3.5 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-zinc-500" />
                  <span className="font-semibold text-xs text-zinc-700 dark:text-zinc-300">
                    Blueprint Tasks
                  </span>
                </div>
                <Button 
                  size="xs" 
                  onClick={handleAddTaskToTemplate}
                  className="h-7 px-2.5 text-[10px] bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 gap-1 rounded-md"
                >
                  <Plus className="w-3 h-3" /> Add Task
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[480px] overflow-y-auto divide-y divide-zinc-50 dark:divide-zinc-900">
              {activeTemplate && activeTemplate.tasks.length > 0 ? (
                activeTemplate.tasks.map(task => {
                  const isSelected = selectedTaskId === task.id;
                  return (
                    <div 
                      key={task.id}
                      onClick={() => selectTask(task.id)}
                      className={cn(
                        "p-3.5 flex items-center justify-between cursor-pointer transition-colors duration-150 group",
                        isSelected 
                          ? "bg-zinc-50 dark:bg-zinc-900/50 border-l-2 border-zinc-900 dark:border-zinc-100" 
                          : "hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20"
                      )}
                    >
                      <div className="min-w-0 pr-2">
                        <div className={cn(
                          "text-xs font-semibold truncate",
                          isSelected ? "text-zinc-950 dark:text-zinc-50" : "text-zinc-700 dark:text-zinc-300"
                        )}>
                          {task.name || 'Untitled Task'}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium">
                            {task.type}
                          </span>
                          <span className="text-zinc-200 dark:text-zinc-800">•</span>
                          <span className="flex items-center gap-0.5 text-[9px] font-mono text-zinc-500">
                            <Clock className="w-2.5 h-2.5 text-zinc-400" />
                            {task.timeEstimate}h
                          </span>
                          {task.subTasks && task.subTasks.length > 0 && (
                            <>
                              <span className="text-zinc-200 dark:text-zinc-800">•</span>
                              <span className="flex items-center gap-0.5 text-[9px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-1 rounded font-medium">
                                <FileCheck className="w-2.5 h-2.5" />
                                {task.subTasks.length} check items
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTaskFromTemplate(task.id);
                          }}
                          className="h-7 w-7 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                          title="Delete from template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                        <ChevronRight className="w-4 h-4 text-zinc-400" />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-zinc-400 dark:text-zinc-600 text-xs">
                  No tasks configured in this template yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Edit Task Configuration */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {editingTask ? (
              <motion.div
                key={editingTask.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
              >
                <Card className="border-zinc-100 dark:border-zinc-800 shadow-sm">
                  <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                          Edit Blueprint Task Configuration
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Configure properties and automatic subtasks checklist.
                        </CardDescription>
                      </div>
                      <div className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded font-mono text-zinc-500">
                        ID: {editingTask.id}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 space-y-5">
                    {/* Basic properties */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5 md:col-span-2">
                        <Label htmlFor="task-name" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          Task Name
                        </Label>
                        <Input
                          id="task-name"
                          value={editingTask.name}
                          onChange={(e) => handleFieldChange('name', e.target.value)}
                          className="text-xs h-9 bg-zinc-50/50 dark:bg-zinc-900/50"
                          placeholder="e.g. Regular maintenance tasks"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="task-category" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          Category/Type
                        </Label>
                        <Input
                          id="task-category"
                          value={editingTask.type}
                          onChange={(e) => handleFieldChange('type', e.target.value)}
                          className="text-xs h-9 bg-zinc-50/50 dark:bg-zinc-900/50"
                          placeholder="e.g. Web Development, Design, Strategy"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="task-estimate" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                            Time Estimate (Hrs)
                          </Label>
                          <Input
                            id="task-estimate"
                            type="number"
                            step="0.01"
                            value={editingTask.timeEstimate}
                            onChange={(e) => handleFieldChange('timeEstimate', parseFloat(e.target.value) || 0)}
                            className="text-xs h-9 font-mono bg-zinc-50/50 dark:bg-zinc-900/50"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="task-priority" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                            Priority
                          </Label>
                          <Select
                            value={editingTask.priority}
                            onValueChange={(val) => handleFieldChange('priority', val)}
                          >
                            <SelectTrigger id="task-priority" className="text-xs h-9 bg-zinc-50/50 dark:bg-zinc-900/50">
                              <SelectValue placeholder="Priority" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={Priority.LOW}>🟢 Low</SelectItem>
                              <SelectItem value={Priority.NORMAL}>🔵 Normal</SelectItem>
                              <SelectItem value={Priority.HIGH}>🟡 High</SelectItem>
                              <SelectItem value={Priority.CRITICAL}>🔴 Critical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Subtasks Checklist Builder */}
                    <div className="border-t border-zinc-100 dark:border-zinc-800 pt-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-50">
                            Automatic Checklist Items (Subtasks)
                          </h4>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                            These items will automatically be injected as incomplete subtasks whenever this template is applied.
                          </p>
                        </div>
                        <span className="text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                          {editingTask.subTasks?.length || 0} Subtasks
                        </span>
                      </div>

                      {/* Add Checklist Form */}
                      <form onSubmit={handleAddSubTask} className="flex gap-2">
                        <Input
                          value={newSubTaskName}
                          onChange={(e) => setNewSubTaskName(e.target.value)}
                          placeholder="Type checklist item name (e.g. Conduct Tag Manager container audit) and press Enter"
                          className="text-xs h-8 bg-zinc-50/50 dark:bg-zinc-900/50"
                        />
                        <Button 
                          type="submit" 
                          size="sm" 
                          className="h-8 text-xs bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 rounded-lg gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add
                        </Button>
                      </form>

                      {/* List of subtasks */}
                      <div className="space-y-1 bg-zinc-50/50 dark:bg-zinc-900/20 border border-zinc-100 dark:border-zinc-800/80 p-2.5 rounded-xl max-h-[250px] overflow-y-auto">
                        {editingTask.subTasks && editingTask.subTasks.length > 0 ? (
                          editingTask.subTasks.map((stName, idx) => (
                            <div 
                              key={idx}
                              className="flex items-center justify-between bg-white dark:bg-zinc-950 p-2 border border-zinc-100 dark:border-zinc-900 rounded-lg text-xs hover:border-zinc-200 transition-colors group"
                            >
                              <div className="flex items-center gap-2 pr-2 min-w-0">
                                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-600 shrink-0 select-none">
                                  {idx + 1}.
                                </span>
                                <CheckSquare className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                                <span className="text-zinc-600 dark:text-zinc-300 truncate font-medium">
                                  {stName}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveSubTask(idx)}
                                className="h-6 w-6 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))
                        ) : (
                          <div className="py-6 text-center text-zinc-400 dark:text-zinc-600 text-xs italic flex flex-col items-center justify-center gap-1.5">
                            <HelpCircle className="w-4 h-4 text-zinc-300 dark:text-zinc-700" />
                            No checklist items configured for this task.
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center text-zinc-400 dark:text-zinc-600 text-xs flex flex-col items-center justify-center gap-2 h-[450px]">
                <Layers className="w-8 h-8 text-zinc-300 dark:text-zinc-700 animate-pulse" />
                Select a blueprint task on the left or click "Add Task" to customize.
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Add Template Modal */}
      <AnimatePresence>
        {isAddTemplateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-md w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-sans">Add New Team Template</h3>
                    <p className="text-[10px] text-zinc-500">Create a new workspace preset for standard project plans.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAddTemplateOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleCreateTemplate} className="p-6 space-y-4">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Choose Icon/Emoji</Label>
                    <div className="grid grid-cols-6 gap-2">
                      {['💻', '🎨', '✍️', '🔍', '📣', '⚙️', '📈', '🔒', '👥', '🚀', '🛠️', '📅'].map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setNewTemplateEmoji(emoji)}
                          className={cn(
                            "h-10 text-lg rounded-xl flex items-center justify-center border transition-all cursor-pointer",
                            newTemplateEmoji === emoji 
                              ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:border-zinc-100" 
                              : "bg-white border-zinc-100 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800"
                          )}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Template Name</Label>
                    <Input 
                      required
                      placeholder="e.g. CRO & Page Audits"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      className="rounded-xl text-xs h-9"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end space-x-2 pt-4 border-t border-zinc-100 dark:border-zinc-900 mt-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddTemplateOpen(false)}
                    className="rounded-xl text-xs h-8"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs h-8 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    Create Template
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Template Modal */}
      <AnimatePresence>
        {deletingTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-md w-full overflow-hidden p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-sans">Delete Team Template?</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Are you sure you want to delete <span className="font-bold text-zinc-900 dark:text-zinc-100">{deletingTemplate.name}</span>?
                  </p>
                  <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium pt-1">
                    This will remove this preset from the working team templates. Any active projects will remain untouched, but new projects cannot select this template unless you reset to defaults.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-900">
                <Button 
                  variant="outline" 
                  onClick={() => setDeletingTemplate(null)}
                  className="rounded-xl text-xs h-8"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleDeleteTemplate}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-8"
                >
                  Delete Template
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
