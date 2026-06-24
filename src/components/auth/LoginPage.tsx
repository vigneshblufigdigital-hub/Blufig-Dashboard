import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '../../contexts/AuthContext';
import { MOCK_USERS } from '../../mockData';
import { UserRole, UserProfile } from '../../types';
import { toast } from 'sonner';
import { 
  Building2, 
  UserSquare2, 
  Lock, 
  Mail, 
  ArrowRight, 
  Clock, 
  ShieldCheck, 
  Sparkles,
  Users2,
  Send,
  CheckCircle2,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export function LoginPage() {
  const { setUser } = useAuth();
  
  // States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'agency' | 'client'>('agency');
  const [loading, setLoading] = useState(false);

  // First-time password configuration states
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);
  const [firstTimeUser, setFirstTimeUser] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Forgot password states
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSubmitted, setResetSubmitted] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Interactive Reset Password states (when secure reset link is clicked)
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetTokenUser, setResetTokenUser] = useState<UserProfile | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmNewPassword, setResetConfirmNewPassword] = useState('');
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error("Please enter your email address");
      return;
    }

    const matchedUser = MOCK_USERS.find(
      u => u.email.toLowerCase() === resetEmail.trim().toLowerCase()
    );

    if (!matchedUser) {
      toast.error(`No user profile found for "${resetEmail}". Select a Quick Profile below to copy its email.`);
      return;
    }

    setResetSubmitting(true);
    setTimeout(() => {
      setResetSubmitting(false);
      setResetSubmitted(true);
      setResetTokenUser(matchedUser);
      toast.success(`Password reset link initialized! Use the Mock Mail Delivery box below to complete the reset.`);
    }, 1000);
  };

  const handleCompleteReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTokenUser) return;

    if (resetNewPassword.length < 5) {
      toast.error("Password must be at least 5 characters long for security!");
      return;
    }

    if (resetNewPassword !== resetConfirmNewPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      
      // Save password
      localStorage.setItem('blufig_custom_password_' + resetTokenUser.email.toLowerCase(), resetNewPassword);
      
      toast.success(`Your secure password has been successfully configured! Please log in.`);
      
      // Clear reset states
      setIsForgotPassword(false);
      setResetSubmitted(false);
      setResetEmail('');
      setResetTokenUser(null);
      setIsResettingPassword(false);
      setResetNewPassword('');
      setResetConfirmNewPassword('');
      
      // Prefill user details
      setEmail(resetTokenUser.email);
      setPassword('');
    }, 905);
  };

  const handleFirstTimeSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstTimeUser) return;

    if (newPassword.length < 5) {
      toast.error("Password must be at least 5 characters long for security!");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      
      // Save custom password
      localStorage.setItem('blufig_custom_password_' + firstTimeUser.email.toLowerCase(), newPassword);
      
      // Log them in
      setUser(firstTimeUser);
      localStorage.setItem('blufig_logged_user', JSON.stringify(firstTimeUser));
      
      toast.success(`Your custom password was securely configured! Welcome, ${firstTimeUser.name}!`);
      
      // Clear states
      setIsFirstTimeSetup(false);
      setFirstTimeUser(null);
      setNewPassword('');
      setConfirmNewPassword('');
    }, 850);
  };

  // Filter users by role categories
  const agencyUsers = MOCK_USERS.filter(u => u.role !== UserRole.CLIENT);
  const clientUsers = MOCK_USERS.filter(u => u.role === UserRole.CLIENT);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter email address");
      return;
    }

    setLoading(true);
    
    // Check credentials against our full mock dataset
    const matchedUser = MOCK_USERS.find(
      u => u.email.toLowerCase() === email.trim().toLowerCase()
    );

    setTimeout(() => {
      setLoading(false);
      
      if (matchedUser) {
        // Look up custom password
        const savedCustomPassword = localStorage.getItem('blufig_custom_password_' + matchedUser.email.toLowerCase());
        
        // Force custom password setup if they haven't configured their own password yet
        if (!savedCustomPassword) {
          setFirstTimeUser(matchedUser);
          setIsFirstTimeSetup(true);
          toast.info(`Welcome to BluFig, ${matchedUser.name}! Since this is your first-time login, please configure your new custom password.`);
          return;
        }

        // Verify custom password
        if (password === savedCustomPassword) {
          // If they selected client tab but matched an agency user, guide them
          if (activeTab === 'client' && matchedUser.role !== UserRole.CLIENT) {
            toast.warning(`"${matchedUser.name}" looks like an Agency Member. Switched to Agency mode!`);
            setActiveTab('agency');
          } else if (activeTab === 'agency' && matchedUser.role === UserRole.CLIENT) {
            toast.warning(`"${matchedUser.name}" looks like a Client Partner. Switched to Client mode!`);
            setActiveTab('client');
          }
          
          setUser(matchedUser);
          localStorage.setItem('blufig_logged_user', JSON.stringify(matchedUser));
          toast.success(`Welcome back, ${matchedUser.name}! Logging you in as ${matchedUser.role.replace('_', ' ')}.`);
          return;
        } else {
          toast.error("Invalid secure password. Enter your custom password or click 'Forgot Password?' to reset it.");
        }
      } else {
        toast.error(`No profile found for "${email}". Click on any quick-login card below!`);
      }
    }, 600);
  };

  const selectQuickProfile = (profile: UserProfile, category: 'agency' | 'client') => {
    setEmail(profile.email);
    setActiveTab(category);

    const savedCustomPassword = localStorage.getItem('blufig_custom_password_' + profile.email.toLowerCase());
    
    // If first time profile setup
    if (!savedCustomPassword) {
      setFirstTimeUser(profile);
      setIsFirstTimeSetup(true);
      toast.info(`Configuring first login for ${profile.name}. Please set your custom password!`);
      return;
    }

    // Auto-login with configured password for sandbox comfort
    setPassword(savedCustomPassword);
    
    setUser(profile);
    localStorage.setItem('blufig_logged_user', JSON.stringify(profile));
    toast.success(`Success! Connected as ${profile.name} using your custom secure password.`);
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-zinc-50 dark:bg-zinc-950 font-sans selection:bg-brand-secondary selection:text-white transition-colors duration-300">
      
      {/* Brand Column with Creative Marketing Detail */}
      <div className="lg:col-span-5 bg-zinc-900 text-white relative p-8 sm:p-12 lg:p-16 flex flex-col justify-between overflow-hidden border-r border-zinc-805">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-800 via-zinc-900 to-black opacity-95" />
        <div className="absolute top-1/4 right-0 w-[450px] h-[450px] bg-brand-secondary/15 rounded-full blur-[120px] pointer-events-none translate-x-1/3" />
        
        {/* Top Header Logo */}
        <div className="relative z-10 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-550 to-brand-secondary flex items-center justify-center text-white font-black text-lg shadow-xl shadow-orange-550/15">
            BF
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-white">
              BLU<span className="text-orange-500">FIG</span>
            </h1>
            <p className="text-[9px] uppercase tracking-widest font-bold text-zinc-500">Creative Agency Sync</p>
          </div>
        </div>

        {/* Dynamic Display Info */}
        <div className="relative z-10 my-12 lg:my-0 space-y-6 max-w-md">
          <Badge className="bg-orange-500 text-white border-0 hover:bg-orange-650 px-2.5 py-0.5 text-[9px] uppercase font-bold tracking-widest">
            v2.1 Operations Portal
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight text-zinc-100">
            Intelligent Workflow for Client-Agency Coordination
          </h2>
          <p className="text-sm text-zinc-400 font-medium">
            Monitor real-time hours, deliver reports, trigger AI resource allocation, and review NDA-secured project invoices inside a unified sandbox.
          </p>

          <div className="pt-6 border-t border-zinc-800 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-800/80 flex items-center justify-center border border-zinc-700/80">
                <Clock className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">Live Time tracking Sync</p>
                <p className="text-[10px] text-zinc-400">Continuous background timer synchronization across workspace views.</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-800/80 flex items-center justify-center border border-zinc-700/80">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">Secure Client Isolation</p>
                <p className="text-[10px] text-zinc-400">Restricted secure domains. Clients see only their respective project metrics & invoicing.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Credit */}
        <div className="relative z-10 text-[10px] font-mono text-zinc-500">
          © 2026 BluFig Digital Marketing Operations. Private Network.
        </div>
      </div>

      {/* Login Form Column */}
      <div className="lg:col-span-7 flex flex-col justify-center p-6 sm:p-12 lg:p-16 max-w-3xl mx-auto w-full">
        <div className="mb-8 space-y-2 text-center lg:text-left">
          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
            Access Portal Gateway
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
            Choose your portal type below to access live project channels.
          </p>
        </div>

        {/* Dual Role Selector Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid grid-cols-2 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl h-11 border border-zinc-200/50 dark:border-zinc-800 shadow-inner mb-6">
            <TabsTrigger 
              value="agency" 
              className={cn(
                "rounded-lg text-xs font-extrabold uppercase tracking-widest transition-all",
                activeTab === 'agency' ? "bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white shadow-sm" : "text-zinc-500"
              )}
            >
              <Building2 className="w-3.5 h-3.5 mr-2" />
              BluFig Agency
            </TabsTrigger>
            <TabsTrigger 
              value="client" 
              className={cn(
                "rounded-lg text-xs font-extrabold uppercase tracking-widest transition-all",
                activeTab === 'client' ? "bg-white text-orange-550 dark:bg-zinc-950 dark:text-orange-400 shadow-sm" : "text-zinc-500"
              )}
            >
              <UserSquare2 className="w-3.5 h-3.5 mr-2" />
              Client Partner
            </TabsTrigger>
          </TabsList>
          <Card className="border-zinc-200/60 dark:border-zinc-800 shadow-md">
            {isFirstTimeSetup ? (
              <form onSubmit={handleFirstTimeSetup}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold flex items-center justify-between">
                    <span>Define Custom Password</span>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400 bg-zinc-50 dark:bg-zinc-900 border px-2 py-0.5 rounded">
                      First Login Verification
                    </span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Hey <strong className="text-zinc-800 dark:text-zinc-200">{firstTimeUser?.name}</strong>! As this is your very first login, please establish your own personalized secure password.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-xs font-bold uppercase tracking-widest text-zinc-400">Choose Your Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <Input 
                        id="new-password" 
                        type={showNewPassword ? "text" : "password"} 
                        placeholder="At least 5 characters long" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pl-10 pr-10 h-11 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-xl"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-zinc-405 hover:text-zinc-650 cursor-pointer focus:outline-none"
                        title={showNewPassword ? "Hide password" : "Show password"}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-xs font-bold uppercase tracking-widest text-zinc-400">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <Input 
                        id="confirm-password" 
                        type={showNewPassword ? "text" : "password"} 
                        placeholder="Confirm your secure password" 
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="pl-10 h-11 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-xl"
                        required
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 flex flex-col space-y-4">
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full h-11 rounded-xl text-xs uppercase font-extrabold tracking-widest text-white bg-orange-500 hover:bg-orange-600 shadow-md cursor-pointer"
                  >
                    {loading ? 'Encrypting Credentials...' : 'Set Password and Enter Portal'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsFirstTimeSetup(false);
                      setFirstTimeUser(null);
                      setNewPassword('');
                      setConfirmNewPassword('');
                    }}
                    className="w-full text-xs font-bold text-zinc-500 hover:text-zinc-900 hover:bg-transparent"
                  >
                    Cancel Setup
                  </Button>
                </CardFooter>
              </form>
            ) : isResettingPassword ? (
              <form onSubmit={handleCompleteReset}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold flex items-center justify-between">
                    <span>Setup Custom Password</span>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-orange-500 bg-orange-100 dark:bg-orange-950/20 px-2 py-0.5 rounded">
                      Secure Token Validation
                    </span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Update credentials for <strong className="text-zinc-800 dark:text-zinc-200">{resetTokenUser?.name}</strong> ({resetTokenUser?.email}). Set your own private secure password below.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-new-password" className="text-xs font-bold uppercase tracking-widest text-zinc-400">Choose New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <Input 
                        id="reset-new-password" 
                        type={showResetNewPassword ? "text" : "password"} 
                        placeholder="Minimum 5 characters" 
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        className="pl-10 pr-10 h-11 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-xl"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-zinc-405 hover:text-zinc-650 cursor-pointer focus:outline-none"
                      >
                        {showResetNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reset-confirm-password" className="text-xs font-bold uppercase tracking-widest text-zinc-400">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <Input 
                        id="reset-confirm-password" 
                        type={showResetNewPassword ? "text" : "password"} 
                        placeholder="Confirm secure password" 
                        value={resetConfirmNewPassword}
                        onChange={(e) => setResetConfirmNewPassword(e.target.value)}
                        className="pl-10 h-11 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-xl font-medium"
                        required
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 flex flex-col space-y-4">
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full h-11 rounded-xl text-xs uppercase font-extrabold tracking-widest text-white bg-orange-500 hover:bg-orange-600 shadow cursor-pointer"
                  >
                    {loading ? 'Re-keying accounts...' : 'Apply Security Password'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsResettingPassword(false);
                      setResetTokenUser(null);
                      setIsForgotPassword(false);
                    }}
                    className="w-full text-xs font-bold text-zinc-500 hover:text-zinc-900"
                  >
                    Cancel and Login
                  </Button>
                </CardFooter>
              </form>
            ) : isForgotPassword ? (
              <form onSubmit={handleResetPassword}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold flex items-center justify-between">
                    <span>Password Reset Request</span>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-orange-500 bg-orange-100 dark:bg-orange-950/20 px-2 py-0.5 rounded">
                      Secured Protocol
                    </span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Input your account's work email address. If an active client or agent profile is linked, a secure, single-use, timed password reset link will be transmitted instantly.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {resetSubmitted ? (
                    <div className="space-y-4">
                      <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-xl p-5 text-center space-y-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 font-sans">Dispatched Successfully</h4>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                            Secure reset credentials have been routed directly to <strong className="text-zinc-800 dark:text-zinc-200">{resetEmail}</strong>.
                          </p>
                        </div>
                      </div>

                      {/* Integrated Clickable Simulation Link requested by USER */}
                      {resetTokenUser && (
                        <div className="bg-orange-50/70 dark:bg-orange-950/15 border border-orange-200/50 dark:border-orange-900/40 rounded-xl p-4 scale-95 origin-center transition-all space-y-3 shadow-inner">
                          <div className="flex items-center space-x-2 text-xs font-black text-orange-600 dark:text-orange-450 uppercase tracking-widest">
                            <Mail className="w-4 h-4 text-orange-500 shrink-0" />
                            <span>Mock Mail Server Sync</span>
                          </div>
                          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
                            [Inbox Simulation] Secure reset authorization receipt delivered for <strong className="text-zinc-805 dark:text-zinc-205">{resetTokenUser.name}</strong>. Reset your password by clicking the token link:
                          </p>
                          <Button 
                            type="button" 
                            onClick={() => {
                              setIsResettingPassword(true);
                              setResetNewPassword('');
                              setResetConfirmNewPassword('');
                            }}
                            className="w-full bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 text-white font-extrabold text-[10px] h-9 rounded-lg uppercase tracking-widest cursor-pointer shadow-sm shadow-orange-500/10 transition-all"
                          >
                            🔗 Click here to reset your password
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="reset-email" className="text-xs font-bold uppercase tracking-widest text-zinc-400">Registered Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <Input 
                          id="reset-email" 
                          type="email" 
                          placeholder="e.g. amit@blufig.digital or sarah@acmecorp.com" 
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          className="pl-10 h-11 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-xl font-medium"
                          required
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-2 flex flex-col space-y-3">
                  {!resetSubmitted ? (
                    <Button 
                      type="submit" 
                      disabled={resetSubmitting}
                      className="w-full h-11 rounded-xl text-xs uppercase font-extrabold tracking-widest text-white bg-orange-500 hover:bg-orange-600 cursor-pointer shadow"
                    >
                      {resetSubmitting ? 'Transmitting Secure Token...' : (
                        <span className="flex items-center justify-center">
                          Transmit Reset Link
                          <Send className="w-4 h-4 ml-2" />
                        </span>
                      )}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setResetSubmitted(false);
                      setResetEmail('');
                      setResetTokenUser(null);
                    }}
                    className="w-full text-xs font-bold text-zinc-500 hover:text-zinc-900 hover:bg-transparent"
                  >
                    Return to Login Access
                  </Button>
                </CardFooter>
              </form>
            ) : (
              <form onSubmit={handleLogin}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold flex items-center justify-between">
                    <span>
                      {activeTab === 'agency' ? 'BluFig Staff Login' : 'Secure Client Entrance'}
                    </span>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400 bg-zinc-50 dark:bg-zinc-900 border px-2 py-0.5 rounded">
                      {activeTab === 'agency' ? 'Operations Base' : 'Project Domain'}
                    </span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {activeTab === 'agency' 
                      ? 'Official access for agency executives, campaign leads, account managers, and specialized experts.' 
                      : 'Confidential channel for verified client executives, strategic partners, and organization heads.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-zinc-400">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <Input 
                        id="email" 
                        type="text" 
                        placeholder={activeTab === 'agency' ? 'e.g. amit@blufig.digital' : 'e.g. sarah@acmecorp.com'} 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-11 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-xl font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-zinc-400">Password</Label>
                      <span 
                        onClick={() => {
                          setResetEmail(email || '');
                          setIsForgotPassword(true);
                        }}
                        className="text-[10px] text-zinc-400 hover:text-zinc-950 dark:hover:text-white font-extrabold cursor-pointer hover:underline"
                      >
                        Forgot Password?
                      </span>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <Input 
                        id="password" 
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••••••••" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 h-11 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-xl font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 cursor-pointer focus:outline-none"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 flex flex-col space-y-4">
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className={cn(
                      "w-full h-11 rounded-xl text-xs uppercase font-extrabold tracking-widest text-white shadow-md transition-all cursor-pointer",
                      activeTab === 'agency' 
                        ? "bg-zinc-900 hover:bg-zinc-950 dark:bg-zinc-100 dark:text-zinc-900" 
                        : "bg-orange-500 hover:bg-orange-600 shadow-orange-500/10"
                    )}
                  >
                    {loading ? 'Decrypting Access Token...' : (
                      <span className="flex items-center justify-center">
                        Confirm Entrance
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </span>
                    )}
                  </Button>
                </CardFooter>
              </form>
            )}
          </Card>
        </Tabs>

        {/* Quick Demo Access System - Exquisite Selection Cards */}
        <div className="mt-10 border-t border-zinc-200 dark:border-zinc-800 pt-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Sandbox Quick Profiles</p>
            </div>
            <span className="text-[9px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded">
              One-Click Login Included
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Quick BluFig Admins/Staff */}
            <div className="space-y-2">
              <span className="text-[9px] font-bold text-zinc-550 dark:text-zinc-500 uppercase tracking-widest block">
                ⭐ BluFig Agency Members
              </span>
              <div className="space-y-2">
                {agencyUsers.slice(0, 3).map(u => (
                  <button
                    key={u.id}
                    onClick={() => selectQuickProfile(u, 'agency')}
                    className="w-full text-left p-2.5 rounded-xl border border-zinc-200/50 dark:border-zinc-850 bg-white dark:bg-zinc-900 hover:border-zinc-900 dark:hover:border-zinc-100 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-zinc-105 dark:bg-zinc-800 text-zinc-800 dark:text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {u.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-800 dark:text-zinc-100 truncate leading-none mb-0.5">{u.name}</p>
                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider truncate">{u.designation}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[8px] font-black uppercase tracking-tighter shrink-0 opacity-80 border-zinc-200">
                      {u.role.replace('AGENCY_', '')}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Clients */}
            <div className="space-y-2">
              <span className="text-[9px] font-bold text-orange-550 dark:text-orange-400 uppercase tracking-widest block">
                💼 Client Partners (Isolated)
              </span>
              <div className="space-y-2">
                {clientUsers.slice(0, 3).map(u => (
                  <button
                    key={u.id}
                    onClick={() => selectQuickProfile(u, 'client')}
                    className="w-full text-left p-2.5 rounded-xl border border-zinc-200/50 dark:border-zinc-850 bg-white dark:bg-zinc-900 hover:border-orange-500 dark:hover:border-orange-500/80 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold text-xs flex items-center justify-center shrink-0">
                        {u.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate leading-none mb-0.5">{u.name}</p>
                        <p className="text-[9px] text-orange-500 dark:text-orange-400 font-bold uppercase tracking-wider truncate leading-none">
                          {u.email.includes('@') ? (u.email.split('@')[1]?.split('.')[0] || 'Client') : u.email}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[8px] font-black uppercase text-orange-500 dark:text-orange-450 tracking-tighter shrink-0 opacity-80 border-orange-500/20 bg-orange-500/5">
                      Client
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
