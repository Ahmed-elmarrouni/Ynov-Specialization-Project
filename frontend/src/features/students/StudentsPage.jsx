import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, Search, ChevronLeft, ChevronRight, GraduationCap,
  Activity, CheckCircle2, BarChart2, TrendingUp, ArrowUpDown, ChevronUp, ChevronDown, Layers
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ComposedChart, LineChart, AreaChart, Area, BarChart, Bar, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import { fetchStudents } from '../../services/students';
import api from '../../services/api';

// --- 1. KPI Card Component ---
// const StatCard = ({ title, value, icon: Icon }) => (
//   <div className="relative overflow-hidden bg-surface/40 backdrop-blur-xl border border-border/40 rounded-xl p-6 shadow-sm group hover:border-primary/30 transition-all duration-300">
//     <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors duration-300" />
//     <div className="flex items-center justify-between gap-4">
//       <div className="space-y-1.5">
//         <p className="text-xs font-bold text-text-muted uppercase tracking-widest">{title}</p>
//         <h3 className="text-3xl font-extrabold text-secondary tracking-tight group-hover:text-primary transition-colors duration-300">
//           {value}
//         </h3>
//       </div>
//       <div className="p-3 bg-linear-to-br from-primary/10 to-primary/5 border border-primary/10 text-primary rounded-xl transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-primary/5 shrink-0">
//         <Icon className="w-5 h-5 stroke-[2.25]" />
//       </div>
//     </div>
//   </div>
// );

// --- 2. Status Badge Component ---
const StatusBadge = ({ status }) => {
  const styles = {
    ACTIVE: "bg-success/10 text-success border-success/20",
    SUSPENDED: "bg-warning/10 text-warning border-warning/20",
    DROPPED: "bg-error/10 text-error border-error/20",
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles[status] || styles.ACTIVE}`}>{status}</span>;
};

// --- 3. Dynamic Cohort Performance Component (Shape Shifter) ---
const CohortPerformanceChart = ({ data }) => {
  const [viewType, setViewType] = useState('composed');

  const renderChart = () => {
    switch (viewType) {
      case 'bar':
        return (
          <BarChart data={data} margin={{ top: 20, right: 0, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis dataKey="cohort_name" stroke="#94a3b8" fontSize={11} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Bar dataKey="avg_grade" name="Avg Grade" fill="#00babc" radius={[4, 4, 0, 0]} barSize={25} />
            <Bar dataKey="absence_rate" name="Absence Rate (%)" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={25} />
          </BarChart>
        );
      case 'line':
        return (
          <LineChart data={data} margin={{ top: 20, right: 10, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis dataKey="cohort_name" stroke="#94a3b8" fontSize={11} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Line type="monotone" dataKey="avg_grade" name="Avg Grade" stroke="#00babc" strokeWidth={3} dot={{ r: 5 }} />
            <Line type="monotone" dataKey="absence_rate" name="Absence Rate (%)" stroke="#ef4444" strokeWidth={3} dot={{ r: 5 }} />
          </LineChart>
        );
      case 'composed':
      default:
        return (
          <ComposedChart data={data} margin={{ top: 20, right: 0, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis dataKey="cohort_name" stroke="#94a3b8" fontSize={11} tickLine={false} />
            <YAxis yAxisId="left" stroke="#00babc" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis yAxisId="right" orientation="right" stroke="#ef4444" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Bar yAxisId="left" dataKey="avg_grade" name="Avg Grade" fill="#00babc" radius={[4, 4, 0, 0]} barSize={30} />
            <Line yAxisId="right" type="monotone" dataKey="absence_rate" name="Absence Rate (%)" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </ComposedChart>
        );
    }
  };

  return (
    <div className="bg-surface/50 backdrop-blur-md border border-border/50 rounded-2xl p-8 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-xl font-bold text-secondary">Cohort Performance</h2>
          <p className="text-sm text-text-muted">Metrics correlation tracking across groups</p>
        </div>

        <div className="flex bg-background/50 border border-border rounded-lg p-1 select-none">
          <button onClick={() => setViewType('composed')} className={`p-2 rounded-md transition-all ${viewType === 'composed' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-secondary'}`} title="Correlation View">
            <Layers className="w-4 h-4" />
          </button>
          <button onClick={() => setViewType('bar')} className={`p-2 rounded-md transition-all ${viewType === 'bar' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-secondary'}`} title="Side-by-Side View">
            <BarChart2 className="w-4 h-4" />
          </button>
          <button onClick={() => setViewType('line')} className={`p-2 rounded-md transition-all ${viewType === 'line' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-secondary'}`} title="Trend Lines">
            <TrendingUp className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// --- 4. Dynamic Distribution Chart Component ---
const DistributionChart = ({ data }) => {
  const [chartType, setChartType] = useState('area');

  const renderChart = () => {
    switch (chartType) {
      case 'area':
        return (
          <AreaChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis dataKey="score" stroke="#94a3b8" fontSize={12} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }}
              labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
              itemStyle={{ color: '#ffffff' }}
            />
            <Area type="monotone" dataKey="count" name="Students" stroke="#00babc" fill="#00babc" fillOpacity={0.3} strokeWidth={3} />
          </AreaChart>
        );
      case 'line':
        return (
          <LineChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis dataKey="score" stroke="#94a3b8" fontSize={12} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }}
              labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
              itemStyle={{ color: '#ffffff' }}
            />            <Line type="monotone" dataKey="count" name="Students" stroke="#00babc" strokeWidth={3} dot={{ r: 4, fill: '#00babc' }} activeDot={{ r: 8 }} />
          </LineChart>
        );
      case 'bar':
      default:
        return (
          <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis dataKey="score" stroke="#94a3b8" fontSize={12} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }}
              labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
              itemStyle={{ color: '#ffffff' }}
            />            <Bar dataKey="count" name="Students" fill="#00babc" radius={[4, 4, 0, 0]} />
          </BarChart>
        );
    }
  };

  return (
    <div className="bg-surface/50 backdrop-blur-md border border-border/50 rounded-2xl p-8 shadow-sm">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-xl font-bold text-secondary">Global Grade Distribution</h2>
          <p className="text-sm text-text-muted">Statistical density of all recorded grades (/20)</p>
        </div>

        <div className="flex bg-background/50 border border-border rounded-lg p-1 select-none">
          <button onClick={() => setChartType('bar')} className={`p-2 rounded-md transition-all ${chartType === 'bar' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-secondary'}`} title="Histogram">
            <BarChart2 className="w-5 h-5" />
          </button>
          <button onClick={() => setChartType('area')} className={`p-2 rounded-md transition-all ${chartType === 'area' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-secondary'}`} title="Density">
            <Activity className="w-5 h-5" />
          </button>
          <button onClick={() => setChartType('line')} className={`p-2 rounded-md transition-all ${chartType === 'line' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-secondary'}`} title="Trend">
            <TrendingUp className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// --- 5. Main Page Component ---
const StudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total_students: 0, overall_average: 0, pass_rate: 0 });

  // Chart Data States
  const [apiChartData, setApiChartData] = useState([]);
  const [distData, setDistData] = useState([]);

  // Table States
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: '', cohort_id: '' });

  // Sorting State
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [studentData, statsRes, classData, distRes] = await Promise.all([
        fetchStudents(page, 10, search, filters),
        api.get('/analytics/global-stats'),
        api.get('/analytics/class-comparison'),
        api.get('/analytics/grade-distribution')
      ]);
      setStudents(studentData.items || []);
      setTotal(studentData.total || 0);
      setStats(statsRes.data);
      setApiChartData(Array.isArray(classData.data) ? classData.data : classData.data || []);
      setDistData(Array.isArray(distRes.data) ? distRes.data : distRes.data || []);
    } catch (err) {
      toast.error('Failed to load dashboard data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, filters]);

  useEffect(() => {
    const timer = setTimeout(loadData, 400);
    return () => clearTimeout(timer);
  }, [loadData]);

  // --- Sorting Logic ---
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedStudents = useMemo(() => {
    let sortableItems = [...students];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [students, sortConfig]);

  const SortableHeader = ({ label, sortKey }) => (
    <th
      className="px-6 py-4 cursor-pointer hover:bg-background/50 transition-colors group select-none"
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center gap-2">
        {label}
        <div className="flex flex-col text-text-muted/50 group-hover:text-primary transition-colors">
          {sortConfig.key === sortKey ? (
            sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />
          ) : (
            <ArrowUpDown className="w-3 h-3" />
          )}
        </div>
      </div>
    </th>
  );

  return (
    <div className="space-y-8 pb-10">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-secondary">Students Management</h1>
          <p className="text-text-muted mt-1">Analytics, performance tracking, and student database.</p>
        </div>

      </div>

      {/* KPI Section */}
      {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Enrolled" value={total} icon={Users} />
        <StatCard title="Global Average" value={`${stats.overall_average}/20`} icon={Activity} />
        <StatCard title="Global Pass Rate" value={`${stats.pass_rate}%`} icon={CheckCircle2} />
      </div> */}

      {/* Advanced Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Chart 1: Dynamic Cohort Performance Shape Shifter */}
        <CohortPerformanceChart data={apiChartData} />

        {/* Chart 2: Grade Distribution Shape Shifter */}
        <DistributionChart data={distData} />
      </div>

      {/* Table Section */}
      <div className="bg-surface/50 backdrop-blur-md border border-border/50 rounded-2xl overflow-hidden shadow-sm">

        {/* Toolbar & Filters */}
        <div className="p-6 border-b border-border/50 flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              type="text"
              placeholder="Search by name, email or ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-background/50 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            {/* Cohort Filter */}
            <select
              value={filters.cohort_id}
              onChange={(e) => { setFilters({ ...filters, cohort_id: e.target.value }); setPage(1); }}
              className="w-full sm:w-auto px-4 py-2.5 bg-background/50 border border-border rounded-xl text-sm font-medium outline-none cursor-pointer hover:border-primary/50 transition-colors"
            >
              <option value="">All Cohorts</option>
              <option value="1">B3 Data & IA - G1</option>
              <option value="2">B3 DevOps - G1</option>
              <option value="3">M1 Tech & Biz - Soir</option>
            </select>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
              className="w-full sm:w-auto px-4 py-2.5 bg-background/50 border border-border rounded-xl text-sm font-medium outline-none cursor-pointer hover:border-primary/50 transition-colors"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="DROPPED">Dropped</option>
            </select>
          </div>
        </div>

        {/* Interactive Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-background/30 text-xs font-bold text-text-muted uppercase tracking-wider">
                <SortableHeader label="Student" sortKey="first_name" />
                <SortableHeader label="ID Number" sortKey="student_id_number" />
                <SortableHeader label="Cohort" sortKey="cohort_name" />
                <SortableHeader label="Status" sortKey="enrollment_status" />
                <SortableHeader label="Avg Grade" sortKey="overall_average" />
                <SortableHeader label="Absences" sortKey="total_absences" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 relative">
              <AnimatePresence mode="popLayout">
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="py-20 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-text-muted text-sm font-medium">Refreshing list...</p>
                      </div>
                    </td>
                  </tr>
                ) : sortedStudents.length > 0 ? (
                  sortedStudents.map((student) => (
                    <motion.tr
                      key={student.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-primary/5 transition-colors group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20">
                            {student.first_name[0]}{student.last_name[0]}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-secondary">{student.first_name} {student.last_name}</div>
                            <div className="text-xs text-text-muted">{student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-text-main">{student.student_id_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="flex items-center text-sm text-text-main">
                          <GraduationCap className="w-4 h-4 mr-2 text-text-muted" />
                          {student.cohort_name || 'Unassigned'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={student.enrollment_status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-bold ${student.overall_average >= 10 ? 'text-success' : 'text-error'}`}>
                          {student.overall_average.toFixed(2)} / 20
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${student.total_absences > 3 ? 'text-error' : 'text-text-main'}`}>
                          {student.total_absences}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-20 text-center text-text-muted">
                      No students found matching your criteria.
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-6 border-t border-border/50 flex items-center justify-between">
          <p className="text-sm text-text-muted">
            Showing <span className="font-bold text-text-main">{(page - 1) * 10 + 1}</span> to <span className="font-bold text-text-main">{Math.min(page * 10, total)}</span> of <span className="font-bold text-text-main">{total}</span> students
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 border border-border rounded-lg disabled:opacity-30 cursor-pointer hover:bg-background transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page * 10 >= total}
              className="p-2 border border-border rounded-lg disabled:opacity-30 cursor-pointer hover:bg-background transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentsPage;