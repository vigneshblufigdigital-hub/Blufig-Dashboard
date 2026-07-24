import React, { useState } from 'react';
import { 
  User as UserIcon, 
  Settings, 
  HelpCircle, 
  BookOpen, 
  Check, 
  Sparkles,
  Info,
  Layers,
  Clock,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Monitor,
  Phone,
  Mail,
  FolderDot,
  Lightbulb,
  CornerDownRight,
  RefreshCw,
  Eye,
  Lock,
  Server
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { UserProfile, UserRole, Department, ADMIN_ROLES, isSuperAdmin } from '../../types';
import { MOCK_USERS } from '../../mockData';
import { toast } from 'sonner';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';

// Preset Avatars (Emoji Glyphs) for awesome UX
const PRESET_AVATARS = [
  { emoji: '👨‍💻', label: 'Tech Specialist' },
  { emoji: '👩‍💻', label: 'Client Lead' },
  { emoji: '🚀', label: 'Operations Lead' },
  { emoji: '🎨', label: 'Creative Designer' },
  { emoji: '⚡', label: 'Digital Expert' },
  { emoji: '📈', label: 'Account Executive' },
  { emoji: '🌟', label: 'Strategic Partner' },
  { emoji: '🦁', label: 'Team Champion' }
];

interface UserProfileViewProps {
  usersList: UserProfile[];
  onUpdateUsers: (updated: UserProfile[]) => void;
  onOpenRoleSwitcher?: () => void;
}

export function UserProfileView({ usersList, onUpdateUsers, onOpenRoleSwitcher }: UserProfileViewProps) {
  const { user, setUser } = useAuth();
  const { theme, themeMode, setThemeMode, toggleTheme, fontSize, setFontSize } = useTheme();
  
  if (!user) return null;

  // Form states local
  const [profileName, setProfileName] = useState(user.name);
  const [profileDesignation, setProfileDesignation] = useState(user.designation || 'Specialist');
  const [profileEmail, setProfileEmail] = useState(user.email);
  const [profileAvatar, setProfileAvatar] = useState(user.avatarUrl || '👨‍💻');
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [workLocation, setWorkLocation] = useState<'In Office' | 'Work From Home' | 'Leave' | 'Appear Away'>(user.workLocation || 'In Office');
  const [selectedFolder, setSelectedFolder] = useState<'profile' | 'preferences' | 'knowledge' | 'tree'>('profile');
  const [searchTermTree, setSearchTermTree] = useState('');
  
  // Selected tree node for detail popover / side drawer
  const [selectedTreeMember, setSelectedTreeMember] = useState<UserProfile | null>(user);

  // Admin Editing Member states
  const [isEditingMember, setIsEditingMember] = useState(false);
  const [editMemberId, setEditMemberId] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editDepartment, setEditDepartment] = useState<Department>(Department.MANAGEMENT);
  const [editRole, setEditRole] = useState<UserRole>(UserRole.ACCOUNT_MANAGER);
  const [editSkills, setEditSkills] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editWorkLocation, setEditWorkLocation] = useState<'In Office' | 'Work From Home' | 'Leave' | 'Appear Away'>('In Office');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');

  const handleStartEditMember = (member: UserProfile) => {
    setEditMemberId(member.id);
    setEditName(member.name);
    setEditEmail(member.email);
    setEditDesignation(member.designation || '');
    setEditDepartment(member.department);
    setEditRole(member.role);
    setEditSkills((member.skillTags || []).join(', '));
    setEditAvatarUrl(member.avatarUrl || '');
    setEditWorkLocation(member.workLocation || 'In Office');
    setEditStatus(member.status || 'active');
    setIsEditingMember(true);
  };

  const handleSaveMemberEdit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!editName.trim()) {
      toast.error("Name cannot be empty!");
      return;
    }
    if (!editEmail.trim()) {
      toast.error("Email cannot be empty!");
      return;
    }

    const updatedMember: UserProfile = {
      id: editMemberId,
      name: editName.trim(),
      email: editEmail.trim(),
      designation: editDesignation.trim() || 'Specialist',
      department: editDepartment,
      role: editRole,
      skillTags: editSkills.split(',').map(s => s.trim()).filter(Boolean),
      avatarUrl: editAvatarUrl || '👨‍💻',
      workLocation: editWorkLocation,
      status: editStatus
    };

    // Update overall list of users
    const updatedList = usersList.map(u => u.id === editMemberId ? updatedMember : u);
    onUpdateUsers(updatedList);

    // If we updated the current logged-in user, sync context and localStorage
    if (user.id === editMemberId) {
      setUser(updatedMember);
      localStorage.setItem('blufig_logged_user', JSON.stringify(updatedMember));
    }

    // Update current selected teammate in the side panel
    if (selectedTreeMember?.id === editMemberId) {
      setSelectedTreeMember(updatedMember);
    }

    setIsEditingMember(false);
    toast.success(`Profile for ${updatedMember.name} has been updated successfully!`);
  };

  // Auto-fill custom avatar if it's not a standard preset
  React.useEffect(() => {
    if (user.avatarUrl && !PRESET_AVATARS.some(a => a.emoji === user.avatarUrl)) {
      setCustomAvatarUrl(user.avatarUrl);
    }
  }, [user]);

  React.useEffect(() => {
    if (user) {
      setProfileEmail(user.email);
    }
  }, [user]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();

    if (!profileEmail.trim() || !profileEmail.includes('@')) {
      toast.error("Please enter a valid email address!");
      return;
    }

    const finalAvatar = customAvatarUrl.trim() || profileAvatar;
    const updatedUser: UserProfile = {
      ...user,
      email: profileEmail.trim(),
      avatarUrl: finalAvatar,
      workLocation: workLocation
    };

    // Update context state
    setUser(updatedUser);
    localStorage.setItem('blufig_logged_user', JSON.stringify(updatedUser));

    // Update overall users list
    const updatedList = usersList.map(u => u.id === user.id ? updatedUser : u);
    onUpdateUsers(updatedList);
    
    toast.success("Profile preferences and details updated successfully!");
  };

  // Show all agency teammates without department isolation or hierarchy constraints
  const myTeamList = usersList.filter(u => u.role !== UserRole.CLIENT);

  const ceo = usersList.find(u => u.role === UserRole.AGENCY_ADMIN);
  const director = usersList.find(u => u.role === UserRole.ACCOUNT_DIRECTOR);

  // --- Full Agency Organogram Calculations ---
  // Amit is the CEO. All leads & managers fall under Amit, and employees and respective teams come under managers.
  // We exclude Client profiles in the organogram.
  const allStaff = usersList.filter(u => u.role !== UserRole.CLIENT);
  const organogramCeo = allStaff.find(u => u.role === UserRole.AGENCY_ADMIN) || allStaff.find(u => u.id === '001') || allStaff[0];

  const organogramIsLeadOrManager = (u: UserProfile) => {
    if (u.id === organogramCeo?.id) return false;
    const r = (u.role || '').toLowerCase();
    const d = (u.designation || '').toLowerCase();
    return r.includes('lead') || r.includes('manager') || r.includes('director') ||
           d.includes('lead') || d.includes('manager') || d.includes('director');
  };

  const organogramLeadsAndManagers = allStaff.filter(organogramIsLeadOrManager);
  
  const organogramEmployees = allStaff.filter(u => {
    if (u.id === organogramCeo?.id) return false;
    return !organogramIsLeadOrManager(u);
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Settings Navigation Sidebar */}
      <div className="lg:col-span-3 space-y-2">
        <Card className="p-4 border-zinc-200/60 dark:border-zinc-800 shadow-sm bg-card">
          <div className="flex items-center space-x-3 mb-4 p-2 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="w-12 h-12 rounded-full border-2 border-zinc-100 dark:border-zinc-800 shadow-lg flex items-center justify-center text-xl select-none overflow-hidden bg-zinc-50 dark:bg-zinc-900 shrink-0">
              {user.avatarUrl && (user.avatarUrl.startsWith('http') || user.avatarUrl.startsWith('/') || user.avatarUrl.startsWith('data:')) ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span>{user.avatarUrl || user.name.charAt(0)}</span>
              )}
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 line-clamp-1">{user.name}</h4>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider">{user.designation}</p>
              <div className="mt-1">
                <span className={cn(
                  "inline-flex items-center text-[8.5px] font-black uppercase tracking-wider py-0.5 px-2 rounded-full border shadow-sm",
                  user.workLocation === 'Work From Home' ? "bg-blue-500/5 text-blue-600 border-blue-500/10 dark:text-blue-400" :
                  user.workLocation === 'Leave' ? "bg-rose-500/5 text-rose-600 border-rose-500/10 dark:text-rose-400" :
                  user.workLocation === 'Appear Away' ? "bg-zinc-500/5 text-zinc-500 border-zinc-500/10 dark:text-zinc-400" :
                  "bg-emerald-500/5 text-emerald-600 border-emerald-500/10 dark:text-emerald-400"
                )}>
                  <span className={cn(
                    "w-1 h-1 rounded-full mr-1 shrink-0",
                    user.workLocation === 'Work From Home' ? "bg-blue-500" :
                    user.workLocation === 'Leave' ? "bg-rose-500" :
                    user.workLocation === 'Appear Away' ? "bg-zinc-400" :
                    "bg-emerald-500"
                  )} />
                  {user.workLocation || 'In Office'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => setSelectedFolder('profile')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors text-left cursor-pointer ${
                selectedFolder === 'profile' 
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm' 
                  : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900 dark:text-zinc-400'
              }`}
            >
              <UserIcon className="w-4 h-4 shrink-0" />
              <span>Modify Profile</span>
            </button>

            <button
              onClick={() => setSelectedFolder('preferences')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors text-left cursor-pointer ${
                selectedFolder === 'preferences' 
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm' 
                  : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900 dark:text-zinc-400'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>System preferences</span>
            </button>

            <button
              onClick={() => setSelectedFolder('knowledge')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors text-left cursor-pointer ${
                selectedFolder === 'knowledge' 
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm' 
                  : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900 dark:text-zinc-400'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>Platform How-To Guide</span>
            </button>

            {user.role !== UserRole.CLIENT && (
              <button
                onClick={() => setSelectedFolder('tree')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors text-left cursor-pointer ${
                  selectedFolder === 'tree' 
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm' 
                    : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900 dark:text-zinc-400'
                }`}
              >
                <Layers className="w-4 h-4 shrink-0" />
                <span>Teammates Directory</span>
              </button>
            )}


          </div>
        </Card>
        
        {/* Short info card */}
        <Card className="p-4 border-dashed border-zinc-200 dark:border-zinc-800 text-center space-y-2 bg-zinc-50/50 dark:bg-zinc-900/30">
          <Info className="w-4 h-4 mx-auto text-orange-500" />
          <h5 className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Security Snapshot</h5>
          <p className="text-[10px] text-zinc-400 leading-normal font-medium">Your account belongs to the secure BluFig Operational Group, tracked instantly under audit standards.</p>
        </Card>
      </div>

      {/* Main Configurations Content panel */}
      <div className="lg:col-span-9">
        <AnimatePresence mode="wait">
          {/* PROFILE TAB */}
          {selectedFolder === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <Card className="p-6 border-zinc-200/60 dark:border-zinc-800 shadow-md">
                <div className="pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-6">
                  <h3 className="text-lg font-bold flex items-center">
                    <UserIcon className="w-5 h-5 mr-2 text-brand-secondary" />
                    Modify Your Personal Profile
                  </h3>
                  <p className="text-xs text-zinc-400 dark:text-zinc-400 mt-1">
                    Control how your details appear inside tasks, deliverables, and automated workflows.
                  </p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="prof-name" className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center justify-between">
                        <span>Full Name</span>
                        <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-extrabold bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded flex items-center select-none font-sans gap-1">
                          <Lock className="w-2.5 h-2.5" /> Locked
                        </span>
                      </Label>
                      <Input 
                        id="prof-name"
                        value={user.name}
                        readOnly
                        disabled
                        className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 font-semibold text-zinc-500 cursor-not-allowed select-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="prof-desig" className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center justify-between">
                        <span>Designation / Role Title</span>
                        <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-extrabold bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded flex items-center select-none font-sans gap-1">
                          <Lock className="w-2.5 h-2.5" /> Locked
                        </span>
                      </Label>
                      <Input 
                        id="prof-desig"
                        value={user.designation}
                        readOnly
                        disabled
                        className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 font-semibold text-zinc-500 cursor-not-allowed select-none"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="prof-email" className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center justify-between">
                        <span>Email Address (For Task & Handoff Notifications)</span>
                        <span className="text-[9px] uppercase tracking-wider text-orange-600 dark:text-orange-400 font-extrabold bg-orange-50 dark:bg-orange-950/40 px-1.5 py-0.5 rounded flex items-center select-none font-sans gap-1 animate-pulse">
                          ● Notification Target
                        </span>
                      </Label>
                      <Input 
                        id="prof-email"
                        type="email"
                        placeholder="e.g. vigneshatwork21@gmail.com"
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        className="rounded-xl border-zinc-200 focus-visible:ring-brand-secondary dark:border-zinc-800 bg-white dark:bg-zinc-950 font-semibold text-zinc-900 dark:text-zinc-100"
                      />
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 leading-normal">
                        Change this to your actual email address (e.g. <strong className="text-zinc-500 dark:text-zinc-400">vigneshatwork21@gmail.com</strong>) so that whenever a task is assigned to you, the system routes notifications directly to your real inbox.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 block pb-1">
                      Select Personal Avatar (Emoji Glyph)
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      {PRESET_AVATARS.map((item) => (
                        <button
                          key={item.emoji}
                          type="button"
                          onClick={() => {
                            setProfileAvatar(item.emoji);
                            setCustomAvatarUrl(''); // Reset custom URL
                          }}
                          className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                            profileAvatar === item.emoji && !customAvatarUrl
                              ? 'border-brand-secondary bg-orange-500/10 dark:bg-orange-550/10 shadow-sm'
                              : 'border-zinc-200/50 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/50'
                          }`}
                        >
                          <span className="text-2xl select-none">{item.emoji}</span>
                          <span className="text-[8px] text-zinc-400 dark:text-zinc-500 font-extrabold uppercase mt-1 truncate max-w-full">
                            {item.label.split(' ')[0]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 block pb-1">
                      Or Choose Modern Default Picture
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setCustomAvatarUrl('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80');
                          setProfileAvatar('👨‍💻');
                        }}
                        className={`p-2.5 rounded-xl border flex items-center space-x-3 transition-all cursor-pointer ${
                          customAvatarUrl === 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'
                            ? 'border-brand-secondary bg-orange-500/10 shadow-sm'
                            : 'border-zinc-200 hover:bg-zinc-50 bg-white dark:bg-zinc-950 dark:border-zinc-800'
                        }`}
                      >
                        <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80" className="w-10 h-10 rounded-full object-cover border" alt="Male" />
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Default Men Pic</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomAvatarUrl('https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80');
                          setProfileAvatar('👩‍💻');
                        }}
                        className={`p-2.5 rounded-xl border flex items-center space-x-3 transition-all cursor-pointer ${
                          customAvatarUrl === 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80'
                            ? 'border-brand-secondary bg-orange-500/10 shadow-sm'
                            : 'border-zinc-200 hover:bg-zinc-50 bg-white dark:bg-zinc-950 dark:border-zinc-800'
                        }`}
                      >
                        <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80" className="w-10 h-10 rounded-full object-cover border" alt="Female" />
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Default Women Pic</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-zinc-400 block">
                      Upload Profile Picture from Local Computer
                    </Label>
                    <div className="flex items-center space-x-4">
                      {/* Avatar Preview */}
                      <div className="w-16 h-16 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex items-center justify-center overflow-hidden shrink-0">
                        {customAvatarUrl ? (
                          <img 
                            src={customAvatarUrl} 
                            alt="Avatar Preview" 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-3xl select-none">{profileAvatar}</span>
                        )}
                      </div>
                      
                      {/* Upload Box */}
                      <div className="flex-1">
                        <label className="flex flex-col items-center justify-center h-16 px-4 py-2 bg-white dark:bg-zinc-950 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl cursor-pointer hover:border-brand-secondary hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-all">
                          <div className="flex flex-col items-center justify-center space-y-1">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center">
                              Drag & drop or <span className="text-brand-secondary">browse files</span>
                            </span>
                            <span className="text-[9px] text-zinc-400 dark:text-zinc-500">
                              Supports JPG, PNG up to 2MB
                            </span>
                          </div>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 2 * 1024 * 1024) {
                                  toast.error("File size exceeds 2MB limit!");
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  const resultStr = reader.result as string;
                                  setCustomAvatarUrl(resultStr);
                                  setProfileAvatar(resultStr);
                                  toast.success("Profile picture loaded from local computer!");
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <Label htmlFor="prof-location" className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                      Current Work Location / Status
                    </Label>
                    <Select 
                      value={workLocation} 
                      onValueChange={(val: any) => setWorkLocation(val)}
                    >
                      <SelectTrigger id="prof-location" className="h-11 rounded-xl border-zinc-200 dark:border-zinc-800 text-xs font-semibold bg-white dark:bg-zinc-950">
                        <SelectValue placeholder="In Office" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="In Office">🏢 In Office</SelectItem>
                        <SelectItem value="Work From Home">🏠 Work From Home</SelectItem>
                        <SelectItem value="Leave">🌴 On Leave</SelectItem>
                        <SelectItem value="Appear Away">🌙 Appear Away</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800/80 space-y-1.5 font-sans">
                    <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Account Specifications (Locked)</div>
                    <div className="grid grid-cols-2 gap-4 pt-1 pb-2 border-b border-zinc-200/40 dark:border-zinc-800">
                      <div>
                        <div className="text-zinc-400 dark:text-zinc-500 text-[10px]">Strategic Group</div>
                        <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300 capitalize">{user.role.replace('_', ' ')}</div>
                      </div>
                      <div>
                        <div className="text-zinc-400 dark:text-zinc-500 text-[10px]">Department</div>
                        <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{user.department}</div>
                      </div>
                    </div>

                    {user.role === UserRole.AGENCY_ADMIN && onOpenRoleSwitcher && (
                      <div className="pt-2 z-10 relative">
                        <Button
                          type="button"
                          onClick={() => {
                            onOpenRoleSwitcher();
                            toast.info("Sandbox Switcher Opened! Choose an identity from the popup.", { id: 'switcher-open' });
                          }}
                          variant="ghost"
                          className="w-full text-[10px] font-bold tracking-widest uppercase border border-dashed border-orange-500/30 text-orange-500 bg-orange-500/5 hover:bg-orange-500/10 hover:text-orange-600 h-9 rounded-xl flex items-center justify-center cursor-pointer shadow-sm transition-all"
                        >
                          <RefreshCw className="w-3 h-3 mr-2 text-orange-500 animate-spin-slow" />
                          Open Identity Switcher
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button 
                      type="submit"
                      className="bg-zinc-900 hover:bg-zinc-950 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-bold uppercase tracking-widest text-xs h-11 px-6 rounded-xl cursor-pointer"
                    >
                      Save Profile Changes
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          )}

          {/* PREFERENCES TAB */}
          {selectedFolder === 'preferences' && (
            <motion.div
              key="preferences"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <Card className="p-6 border-zinc-200/60 dark:border-zinc-800 shadow-md">
                <div className="pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-6">
                  <h3 className="text-lg font-bold flex items-center">
                    <Settings className="w-5 h-5 mr-2 text-brand-secondary" />
                    Configure System Preferences
                  </h3>
                  <p className="text-xs text-zinc-400 dark:text-zinc-400 mt-1">
                    Fine-tune accessibility, font-scaling sizes, and theme states for a bespoke workspace layout.
                  </p>
                </div>

                <div className="space-y-8">
                  {/* Theme Select */}
                  <div className="space-y-3">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-extrabold uppercase tracking-widest text-zinc-900 dark:text-zinc-100">
                        Interactive Visual Theme
                      </Label>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">
                        Toggle between high-contrast dark visual mode or ambient daylight light theme.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <button
                        onClick={() => setThemeMode('light')}
                        className={`p-4 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                          themeMode === 'light' 
                            ? 'border-brand-secondary bg-orange-500/5 shadow-sm' 
                            : 'border-zinc-200/60 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Light Daylight</div>
                          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold">Clean charcoal accents & soft whites</div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${themeMode === 'light' ? 'border-brand-secondary text-brand-secondary' : 'border-zinc-300'}`}>
                          {themeMode === 'light' && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </button>

                      <button
                        onClick={() => setThemeMode('dark')}
                        className={`p-4 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                          themeMode === 'dark' 
                            ? 'border-brand-secondary bg-orange-500/10 dark:border-brand-secondary shadow-sm' 
                            : 'border-zinc-200/60 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Midnight Dark</div>
                          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold">Deep onyx blacks & neon gold highlights</div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${themeMode === 'dark' ? 'border-brand-secondary text-brand-secondary' : 'border-zinc-300'}`}>
                          {themeMode === 'dark' && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </button>

                      <button
                        onClick={() => setThemeMode('system')}
                        className={`p-4 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                          themeMode === 'system' 
                            ? 'border-brand-secondary bg-orange-500/10 dark:border-brand-secondary shadow-sm' 
                            : 'border-zinc-200/60 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">System Preference</div>
                          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold">Auto-sync with OS appearance setting</div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${themeMode === 'system' ? 'border-brand-secondary text-brand-secondary' : 'border-zinc-300'}`}>
                          {themeMode === 'system' && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Font Scaling Select */}
                  <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-extrabold uppercase tracking-widest text-zinc-900 dark:text-zinc-100">
                        Layout Sizing & Font Scaling
                      </Label>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">
                        Increasing the layout font size makes texts, card tables, and dashboard details more legible.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {(['sm', 'base', 'lg', 'xl'] as const).map((size) => {
                        const sizeLabels = {
                          sm: { title: "Dense (Small)", desc: "14px standard" },
                          base: { title: "Balanced (Medium)", desc: "16px default" },
                          lg: { title: "Spacious (Large)", desc: "18px layout" },
                          xl: { title: "Accessible (XL)", desc: "20px display" }
                        };
                        return (
                          <button
                            key={size}
                            onClick={() => {
                              setFontSize(size);
                              toast.success(`Font scaling size adjusted to: ${sizeLabels[size].title}`);
                            }}
                            className={`p-3.5 rounded-xl border flex flex-col items-center text-center transition-all cursor-pointer ${
                              fontSize === size 
                                ? 'border-brand-secondary bg-orange-500/5 shadow-sm' 
                                : 'border-zinc-200/60 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
                            }`}
                          >
                            <span className={`font-semibold ${
                              size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm font-bold' : size === 'xl' ? 'text-base font-extrabold' : 'text-xs font-medium'
                            } text-zinc-800 dark:text-zinc-200`}>
                              {sizeLabels[size].title}
                            </span>
                            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-1 uppercase tracking-wider font-semibold">
                              {sizeLabels[size].desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Live Preview Pane */}
                    <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800/60 space-y-2">
                      <div className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400">Live Workspace Scaling Preview</div>
                      <p className="text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">
                        This is an example text. Clicking options above instantly updates relative sizes, permitting high visual readability across our complex deliverable board matrices.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* HOW-TO GUIDE TAB */}
          {selectedFolder === 'knowledge' && (
            <motion.div
              key="knowledge"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <Card className="p-6 border-zinc-200/60 dark:border-zinc-800 shadow-md">
                <div className="pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-6">
                  <h3 className="text-lg font-bold flex items-center">
                    <BookOpen className="w-5 h-5 mr-2 text-brand-secondary" />
                    BluFig Dashboard: Quick Start & How-To Manual
                  </h3>
                  <p className="text-xs text-zinc-400 dark:text-zinc-400 mt-1">
                    Understand platform architecture, live timer guidelines, and workflow tracking policies.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Item 1 */}
                  <div className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 transition-colors">
                    <h4 className="text-xs font-extrabold uppercase tracking-widest text-zinc-800 dark:text-zinc-200 flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-orange-500" />
                      ⏱️ Tracking Work-Hours via Live Tracker
                    </h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                      To log tracking time on any task, navigate to the <strong className="text-zinc-800 dark:text-zinc-200">Tasks</strong> tab, open an active row, and toggle the green tracker icon. When active, a dynamic global timer pulses in your top header, remaining synchronized across browser screens. You can review detailed logs inside the <strong className="text-zinc-800 dark:text-zinc-200">Time Tracking</strong> panel.
                    </p>
                  </div>

                  {/* Item 2 */}
                  <div className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 transition-colors">
                    <h4 className="text-xs font-extrabold uppercase tracking-widest text-zinc-800 dark:text-zinc-200 flex items-center">
                      <RefreshCw className="w-4 h-4 mr-2 text-blue-500" />
                      🔄 Task Automation & Recurrence Spawning
                    </h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                      When creating tasks, check the <strong className="text-zinc-800 dark:text-zinc-200">Recurring Task Automation</strong> option. This automatically registers duplicate tasks spaced evenly over your selected week/month period, enabling immediate scheduling and workflow pipeline creation.
                    </p>
                  </div>

                  {/* Item 3 */}
                  <div className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 transition-colors">
                    <h4 className="text-xs font-extrabold uppercase tracking-widest text-zinc-800 dark:text-zinc-200 flex items-center">
                      <Layers className="w-4 h-4 mr-2 text-emerald-500" />
                      🎨 Workflow Milestones & Deliverables
                    </h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                      Use the <strong className="text-zinc-800 dark:text-zinc-200">Projects</strong> workspace to see visual kanban board stacks segregated by current campaign streams. You can click on any individual project item to filter associated tasks or drill down into custom multi-sequential workflow steps designed for technical teams.
                    </p>
                  </div>

                  {/* Item 4 */}
                  <div className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 transition-colors">
                    <h4 className="text-xs font-extrabold uppercase tracking-widest text-zinc-800 dark:text-zinc-200 flex items-center">
                      <Lightbulb className="w-4 h-4 mr-2 text-purple-500" />
                      💡 ProTip: Security Isolation Constraints
                    </h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                      For secure profile protection, clicking your profile badge restricts the demo "Identity Switcher" tool solely to Agency Administrators. Client and expert profiles are heavily isolated to secure work data and protect operational confidentiality.
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* FLAT TEAMMATES DIRECTORY TAB */}
          {selectedFolder === 'tree' && (
            <motion.div
              key="tree"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <Card className="p-6 border-zinc-200/60 dark:border-zinc-800 shadow-md">
                <div className="pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-6 font-sans">
                  <h3 className="text-lg font-bold flex items-center">
                    <Layers className="w-5 h-5 mr-2 text-brand-secondary" />
                    Teammates Directory
                  </h3>
                  <p className="text-xs text-zinc-400 dark:text-zinc-400 mt-1">
                    Manage and view BluFig digital workforce colleagues. Click any colleague card to instantly inspect specialized skill tags, email listings, and general department roles.
                  </p>
                </div>

                {/* Filter and search bars */}
                <div className="mb-6">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </span>
                    <Input
                      type="text"
                      placeholder="Search teammates by name, designation, or department..."
                      value={searchTermTree}
                      onChange={(e) => setSearchTermTree(e.target.value)}
                      className="pl-10 h-11 rounded-xl bg-white dark:bg-zinc-950 border-zinc-200/80 dark:border-zinc-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  {/* Grid layout containing flat teammate cards */}
                  <div className="xl:col-span-8 bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-5 rounded-2xl border border-zinc-100 dark:border-zinc-900 min-w-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
                      {myTeamList
                        .filter(u => {
                          const s = searchTermTree.toLowerCase();
                          return u.name.toLowerCase().includes(s) || 
                                 u.designation.toLowerCase().includes(s) || 
                                 u.department.toLowerCase().includes(s);
                        })
                        .map(member => {
                          const loc = (member.workLocation || 'In Office').toLowerCase();
                          const isHome = loc.includes('home');
                          const isLeave = loc.includes('leave');
                          const isAway = loc.includes('away');
                          return (
                            <div
                              key={member.id}
                              onClick={() => setSelectedTreeMember(member)}
                              className={cn(
                                "p-4 rounded-xl border cursor-pointer transition-all duration-300 bg-card flex flex-col justify-between relative group hover:shadow-md",
                                selectedTreeMember?.id === member.id
                                  ? "border-brand-secondary ring-1 ring-orange-500/20 bg-orange-500/5 dark:bg-orange-550/5"
                                  : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800"
                              )}
                            >
                              <div className="flex items-start space-x-3">
                                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border shadow-inner flex items-center justify-center shrink-0 overflow-hidden text-xl font-bold font-mono">
                                  {member.avatarUrl && (member.avatarUrl.startsWith('http') || member.avatarUrl.startsWith('/')) ? (
                                    <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <span>{member.avatarUrl || '👨‍💻'}</span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-brand-secondary transition-colors">
                                    {member.name}
                                  </h4>
                                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider truncate">
                                    {member.designation}
                                  </p>

                                  {/* Work Location indicator below designation */}
                                  <div className="mt-1.5 shrink-0">
                                    <span className={cn(
                                      "inline-flex items-center text-[8px] font-extrabold uppercase tracking-wide py-0.5 px-2 rounded-full border shadow-sm",
                                      isHome ? "bg-blue-500/5 text-blue-600 border-blue-500/10 dark:text-blue-400" :
                                      isLeave ? "bg-rose-500/5 text-rose-600 border-rose-500/10 dark:text-rose-400" :
                                      isAway ? "bg-zinc-500/5 text-zinc-500 border-zinc-500/10 dark:text-zinc-400" :
                                      "bg-emerald-500/5 text-emerald-600 border-emerald-500/10 dark:text-emerald-400"
                                    )}>
                                      <span className={cn(
                                        "w-1 h-1 rounded-full mr-1 shrink-0",
                                        isHome ? "bg-blue-500" :
                                        isLeave ? "bg-rose-500" :
                                        isAway ? "bg-zinc-400" :
                                        "bg-emerald-500"
                                      )} />
                                      {member.workLocation || 'In Office'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 bg-zinc-50 dark:bg-zinc-900 px-2 py-0.5 rounded">
                                  {member.department}
                                </span>
                                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium font-mono truncate max-w-[120px]">
                                  {member.email}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      {myTeamList.filter(u => {
                        const s = searchTermTree.toLowerCase();
                        return u.name.toLowerCase().includes(s) || 
                               u.designation.toLowerCase().includes(s) || 
                               u.department.toLowerCase().includes(s);
                      }).length === 0 && (
                        <div className="col-span-2 py-12 text-center text-zinc-400 text-xs">
                          No colleagues match your current search terms.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* High Quality Detail Side-Panel */}
                  <div className="xl:col-span-4 bg-zinc-50/50 dark:bg-zinc-900/40 p-4 border rounded-2xl space-y-4 border-zinc-200/60 dark:border-zinc-800">
                    <div className="text-center pb-4 border-b border-zinc-200/60 dark:border-zinc-800 space-y-2">
                      <div className="w-16 h-16 rounded-full bg-card shadow border-2 border-zinc-100 dark:border-zinc-800 flex items-center justify-center text-3xl mx-auto select-none overflow-hidden">
                        {selectedTreeMember?.avatarUrl && (selectedTreeMember.avatarUrl.startsWith('http') || selectedTreeMember.avatarUrl.startsWith('/')) ? (
                          <img src={selectedTreeMember.avatarUrl} alt={selectedTreeMember.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        ) : (
                          <span>{selectedTreeMember?.avatarUrl || '👨‍💻'}</span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center justify-center space-x-1">
                          <span>{selectedTreeMember?.name}</span>
                          {selectedTreeMember?.id === user.id && (
                            <span className="text-[8px] uppercase tracking-widest font-black text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">You</span>
                          )}
                        </h4>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider">{selectedTreeMember?.designation}</p>
                        
                        {/* Work Location below designation in side panel */}
                        {selectedTreeMember && (
                          <div className="mt-1.5 flex flex-col items-center space-y-2">
                            <span className={cn(
                              "inline-flex items-center text-[8px] font-black uppercase tracking-wider py-0.5 px-2.5 rounded-full border shadow-sm",
                              (selectedTreeMember.workLocation || 'In Office').toLowerCase().includes('home') ? "bg-blue-500/5 text-blue-600 border-blue-500/10 dark:text-blue-400" :
                              (selectedTreeMember.workLocation || 'In Office').toLowerCase().includes('leave') ? "bg-rose-500/5 text-rose-600 border-rose-500/10 dark:text-rose-450" :
                              (selectedTreeMember.workLocation || 'In Office').toLowerCase().includes('away') ? "bg-zinc-500/5 text-zinc-500 border-zinc-500/10 dark:text-zinc-400" :
                              "bg-emerald-500/5 text-emerald-600 border-emerald-500/10 dark:text-emerald-400"
                            )}>
                              <span className={cn(
                                "w-1 h-1 rounded-full mr-1.5 shrink-0",
                                (selectedTreeMember.workLocation || 'In Office').toLowerCase().includes('home') ? "bg-blue-500" :
                                (selectedTreeMember.workLocation || 'In Office').toLowerCase().includes('leave') ? "bg-rose-550" :
                                (selectedTreeMember.workLocation || 'In Office').toLowerCase().includes('away') ? "bg-zinc-400" :
                                "bg-emerald-500"
                              )} />
                              {selectedTreeMember.workLocation || 'In Office'}
                            </span>

                            {ADMIN_ROLES.includes(user.role) && (
                              <Button
                                size="sm"
                                type="button"
                                onClick={() => handleStartEditMember(selectedTreeMember)}
                                className="text-[9px] font-extrabold uppercase tracking-wider h-7 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 px-3 py-1 rounded-lg cursor-pointer flex items-center shadow-sm"
                              >
                                <Settings className="w-3 h-3 mr-1 text-orange-500" />
                                Edit Full Profile
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3.5 text-xs">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Work Email Address</span>
                        <div className="flex items-center space-x-2 text-zinc-700 dark:text-zinc-300 font-medium font-sans mt-0.5">
                          <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="truncate">{selectedTreeMember?.email}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Assigned Department</span>
                        <div className="flex items-center space-x-2 text-zinc-700 dark:text-zinc-300 font-medium font-sans mt-0.5">
                          <FolderDot className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>{selectedTreeMember?.department}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Expertise Specialties</span>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {selectedTreeMember?.skillTags?.map((tag, idx) => (
                            <span 
                              key={idx}
                              className="text-[9px] bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-300/40 px-2 py-0.5 rounded-md font-medium tracking-wide"
                            >
                              {tag}
                            </span>
                          )) || <span className="text-[10px] text-zinc-400 italic">None assigned</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Admin Edit Member Dialog */}
      <Dialog open={isEditingMember} onOpenChange={setIsEditingMember}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto rounded-2xl bg-card border-zinc-200 dark:border-zinc-800 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              Edit Employee Profile: <span className="text-orange-500">{editName}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveMemberEdit} className="space-y-5 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Left Column Fields */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-name" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Full Name</Label>
                  <Input 
                    id="edit-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 h-10 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-email" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Work Email</Label>
                  <Input 
                    id="edit-email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 h-10 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-desig" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Designation / Role Title</Label>
                  <Input 
                    id="edit-desig"
                    value={editDesignation}
                    onChange={(e) => setEditDesignation(e.target.value)}
                    className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 h-10 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-dept" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Assigned Department</Label>
                  <Select 
                    value={editDepartment} 
                    onValueChange={(val: Department) => setEditDepartment(val)}
                  >
                    <SelectTrigger id="edit-dept" className="h-10 rounded-xl border-zinc-200 dark:border-zinc-800 text-xs font-semibold bg-white dark:bg-zinc-950">
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(Department).map((dept) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-role" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Strategic Role & Access</Label>
                  <Select 
                    value={editRole} 
                    onValueChange={(val: UserRole) => setEditRole(val)}
                  >
                    <SelectTrigger id="edit-role" className="h-10 rounded-xl border-zinc-200 dark:border-zinc-800 text-xs font-semibold bg-white dark:bg-zinc-950">
                      <SelectValue placeholder="Select Access Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(UserRole).map((role) => (
                        <SelectItem key={role} value={role}>{role.replace('_', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Right Column Fields */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Profile Image / Photo</Label>
                  
                  <div className="flex items-center space-x-3">
                    {/* Avatar Preview */}
                    <div className="w-12 h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center overflow-hidden shrink-0">
                      {editAvatarUrl && (editAvatarUrl.startsWith('http') || editAvatarUrl.startsWith('/') || editAvatarUrl.startsWith('data:')) ? (
                        <img 
                          src={editAvatarUrl} 
                          alt="Avatar Preview" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-2xl select-none">{editAvatarUrl || '👤'}</span>
                      )}
                    </div>
                    
                    {/* Upload File */}
                    <div className="flex-1">
                      <label className="flex flex-col items-center justify-center h-12 px-3 py-1 bg-white dark:bg-zinc-950 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl cursor-pointer hover:border-brand-secondary hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-all">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider text-center">
                          Upload file (<span className="text-brand-secondary">Browse</span>)
                        </span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 2 * 1024 * 1024) {
                                toast.error("File size exceeds 2MB limit!");
                                return;
                              }
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                const resultStr = reader.result as string;
                                setEditAvatarUrl(resultStr);
                                toast.success("Profile photo uploaded successfully!");
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <Input 
                    placeholder="Or paste profile image URL directly..." 
                    className="rounded-xl h-9 text-xs border-zinc-200 bg-white dark:bg-zinc-950 mt-2"
                    value={editAvatarUrl}
                    onChange={(e) => setEditAvatarUrl(e.target.value)}
                  />

                  {/* Preset Quick Select */}
                  <div className="space-y-1 mt-1">
                    <span className="text-[8px] uppercase font-black tracking-widest text-zinc-400">Quick Presets</span>
                    <div className="flex flex-wrap gap-1 p-1 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-100 dark:border-zinc-800">
                      {['👨‍💻', '👩‍💻', '🚀', '🎨', '⚡', '📈', '🌟', '🦁', '🦉', '🍕', '🎯', '💡'].map((emoji) => (
                        <button
                          type="button"
                          key={emoji}
                          onClick={() => setEditAvatarUrl(emoji)}
                          className={cn(
                            "w-6 h-6 flex items-center justify-center text-xs rounded bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all border",
                            editAvatarUrl === emoji ? "border-brand-secondary bg-orange-50/50 dark:bg-orange-950/25" : "border-zinc-200/50 dark:border-zinc-800"
                          )}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-location" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Work Location</Label>
                    <Select 
                      value={editWorkLocation} 
                      onValueChange={(val: any) => setEditWorkLocation(val)}
                    >
                      <SelectTrigger id="edit-location" className="h-10 rounded-xl border-zinc-200 dark:border-zinc-800 text-xs font-semibold bg-white dark:bg-zinc-950">
                        <SelectValue placeholder="Location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="In Office">🏢 In Office</SelectItem>
                        <SelectItem value="Work From Home">🏠 Home</SelectItem>
                        <SelectItem value="Leave">🌴 Leave</SelectItem>
                        <SelectItem value="Appear Away">🌙 Away</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-status" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Status</Label>
                    <Select 
                      value={editStatus} 
                      onValueChange={(val: any) => setEditStatus(val)}
                    >
                      <SelectTrigger id="edit-status" className="h-10 rounded-xl border-zinc-200 dark:border-zinc-800 text-xs font-semibold bg-white dark:bg-zinc-950">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">🟢 Active</SelectItem>
                        <SelectItem value="inactive">🔴 Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-skills" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Expertise Specialty Skills</Label>
                  <Input 
                    id="edit-skills"
                    placeholder="React, Design, Performance, Copywriting"
                    value={editSkills}
                    onChange={(e) => setEditSkills(e.target.value)}
                    className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 h-10 text-xs font-semibold"
                  />
                  <span className="text-[9px] text-zinc-400 block leading-tight">Separate skills with commas (e.g. SEO, HubSpot, UI Design)</span>
                </div>
              </div>

            </div>

            <DialogFooter className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setIsEditingMember(false)}
                className="rounded-xl text-xs font-bold uppercase tracking-wider h-10 px-4 border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 cursor-pointer"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="rounded-xl text-xs font-bold uppercase tracking-wider h-10 px-6 bg-zinc-900 hover:bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 cursor-pointer"
              >
                Save Profile Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
