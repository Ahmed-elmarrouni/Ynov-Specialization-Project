import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, UserPlus, FileText, Settings, Shield, GraduationCap,
  Briefcase, TrendingUp, Activity, Bell, Calendar, Search, ArrowRight, Filter
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import dashboardService from '../../services/dashboard';
import api from '../../services/api';
// --- 1. KPI Card Component ---
const StatCard = ({ title, value, icon: Icon, colorClass = "from-primary/10 to-primary/5" }) => (
  <div className="relative overflow-hidden bg-surface/40 backdrop-blur-xl border border-border/40 rounded-xl p-6 shadow-sm group hover:border-primary/30 transition-all duration-300">
    <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors duration-300" />
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-1.5">
        <p className="text-xs font-bold text-text-muted uppercase tracking-widest">{title}</p>
        <h3 className="text-3xl font-extrabold text-secondary tracking-tight group-hover:text-primary transition-colors duration-300">
          {value}
        </h3>
      </div>
      <div className={`p-3 bg-linear-to-br ${colorClass} border border-primary/10 text-primary rounded-xl transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-primary/5 shrink-0`}>
        <Icon className="w-5 h-5 stroke-[2.25]" />
      </div>
    </div>
  </div>
);

// --- 2. Custom Tooltip ---
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1e293b] p-3 border-none rounded-xl shadow-xl">
        <p className="text-white font-bold text-sm mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-white/80 text-xs">
            <span className="capitalize">{entry.name}: </span>
            <span className="font-mono">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// --- 3. Role Badge ---
const RoleBadge = ({ role }) => {
  const styles = {
    admin: "bg-error/10 text-error border-error/20",
    teacher: "bg-success/10 text-success border-success/20",
    student: "bg-primary/10 text-primary border-primary/20",
    pedagogical_manager: "bg-warning/10 text-warning border-warning/20",
  };
  const labels = {
    admin: "Admin",
    teacher: "Teacher",
    student: "Student",
    pedagogical_manager: "Pedago Manager",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${styles[role] || "bg-surface/20 text-text-muted border-border/20"}`}>
      {labels[role] || role}
    </span>
  );
};

// --- 4. Main Page Component ---
const DashboardPage = () => {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState(null);
  const [radarData, setRadarData] = useState([]);
  const [timelineData, setTimelineData] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Table Filtering States
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // --- Secure Report Generator ---
  const handleGenerateReport = async () => {
    const toastId = toast.loading('Generating secure report...');
    try {
      // 1. Fetch the report securely using Axios (token is attached automatically)
      const response = await api.get('/reports/download', {
        responseType: 'text' // We are expecting an HTML string
      });

      // 2. Open a blank window
      const reportWindow = window.open('', '_blank');

      // 3. Write the secure HTML into the new window
      reportWindow.document.open();
      reportWindow.document.write(response.data);
      reportWindow.document.close();

      // 4. (Optional) Automatically trigger the print/Save as PDF dialog
      setTimeout(() => {
        reportWindow.print();
      }, 500);

      toast.success('Report generated successfully!', { id: toastId });
    } catch (err) {
      toast.error('Failed to generate report. Ensure you have Admin/Manager privileges.', { id: toastId });
      console.error(err);
    }
  };

  const loadData = useCallback(async (isInitial = true) => {
    if (isInitial) setIsLoading(true);
    try {
      if (isInitial) {
        const [kpiRes, radarRes, timelineRes] = await Promise.all([
          dashboardService.getKPIs(),
          dashboardService.getRadarStats(),
          dashboardService.getActivityTimeline()
        ]);
        setKpis(kpiRes);
        setRadarData(radarRes);
        setTimelineData(timelineRes);
      }

      const usersRes = await dashboardService.getRecentUsers(search, roleFilter);
      setRecentUsers(usersRes);
    } catch (err) {
      toast.error('Failed to load dashboard data');
      console.error(err);
    } finally {
      if (isInitial) setIsLoading(false);
    }
  }, [search, roleFilter]);

  // Initial load
  useEffect(() => {
    loadData(true);
  }, []);

  // Re-fetch users when search or role changes (with debounce for search)
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, roleFilter, loadData]);

  if (isLoading && !kpis) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Row 1: KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Students" value={kpis?.students_count || 0} icon={Users} />
        <StatCard title="Active Teachers" value={kpis?.teachers_count || 0} icon={Briefcase} colorClass="from-success/10 to-success/5" />
        <StatCard title="Admins" value={kpis?.admins_count || 0} icon={Shield} colorClass="from-error/10 to-error/5" />
        <StatCard title="Pedago Managers" value={kpis?.pedagogical_managers_count || 0} icon={GraduationCap} colorClass="from-warning/10 to-warning/5" />
      </div>

      {/* Row 2: Visuals & Actions */}
      <div className="grid grid-cols-12 gap-6">
        {/* Radar Chart: Program Performance */}
        <div className="col-span-12 lg:col-span-4 bg-surface/50 backdrop-blur-md border border-border/50 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-secondary mb-1">Program Comparison</h2>
          <p className="text-xs text-text-muted mb-6">Normalized metrics across departments</p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="program_name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 20]} tick={{ fill: '#94a3b8', fontSize: 8 }} />
                <Radar name="Avg Grade" dataKey="avg_grade" stroke="#00babc" fill="#00babc" fillOpacity={0.5} />
                <Radar name="Pass Rate" dataKey="pass_rate" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Area Chart: Activity Timeline */}
        <div className="col-span-12 lg:col-span-5 bg-surface/50 backdrop-blur-md border border-border/50 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-secondary mb-1">Academic Trend</h2>
          <p className="text-xs text-text-muted mb-6">Performance activity over the entire recorded period</p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00babc" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00babc" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} domain={[0, 20]} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="value" name="Avg Score" stroke="#00babc" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="col-span-12 lg:col-span-3 bg-surface/50 backdrop-blur-md border border-border/50 rounded-2xl p-6 shadow-sm flex flex-col">
          <h2 className="text-lg font-bold text-secondary mb-6">Quick Actions</h2>
          <div className="space-y-4 flex-1">
            <button
              onClick={() => navigate('/settings?tab=team')}
              className="w-full flex items-center justify-between p-4 bg-background/50 hover:bg-primary/10 border border-border/50 hover:border-primary/30 rounded-xl transition-all duration-300 group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <UserPlus className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-secondary">Add New User</span>
              </div>
              <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
            </button>
            <button
              onClick={handleGenerateReport}
              className="w-full flex items-center justify-between p-4 bg-background/50 hover:bg-primary/10 border border-border/50 hover:border-primary/30 rounded-xl transition-all duration-300 group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-lg"><FileText className="w-4 h-4" /></div>
                <span className="text-sm font-bold text-secondary">Global Report</span>
              </div>
              <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="w-full flex items-center justify-between p-4 bg-background/50 hover:bg-primary/10 border border-border/50 hover:border-primary/30 rounded-xl transition-all duration-300 group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <Settings className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-secondary">System Settings</span>
              </div>
              <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
            </button>
          </div>
          <div className="mt-auto pt-6">
            <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl">
              <p className="text-[10px] text-primary font-bold uppercase tracking-wider mb-1">Current Performance</p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-black text-secondary">{kpis?.school_wide_average || 0}</span>
                <span className="text-sm font-bold text-text-muted mb-1">/ 20</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: User List Table */}
      <div className="bg-surface/50 backdrop-blur-md border border-border/50 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-secondary">Recent Registrations</h2>
            <div className="flex items-center gap-2 text-text-muted text-sm font-medium">
              <Activity className="w-4 h-4" />
              <span>Last 50 entries</span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-background/50 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <div className="relative md:w-48">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-background/50 border border-border rounded-xl text-sm outline-none cursor-pointer hover:border-primary/50 transition-colors appearance-none"
              >
                <option value="">All Roles</option>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
                <option value="pedagogical_manager">Manager</option>
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-background/30 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                <th className="px-6 py-4">Full Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {recentUsers.length > 0 ? (
                recentUsers.map((user, idx) => (
                  <motion.tr
                    key={user.email}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="hover:bg-primary/5 transition-colors group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {user.first_name[0]}{user.last_name[0]}
                        </div>
                        <span className="text-sm font-bold text-secondary">{user.first_name} {user.last_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-text-muted font-mono">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-text-muted">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="py-20 text-center text-text-muted text-sm">
                    No users found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
