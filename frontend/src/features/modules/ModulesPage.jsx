import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Layers, AlertCircle, TrendingUp, BarChart2,
  Activity, Search, ArrowUpDown, ChevronUp, ChevronDown, Monitor,
  Target, Circle, Hexagon, PieChart as PieChartIcon
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, BarChart, Bar, Cell, AreaChart, Area, LineChart, Line, PieChart, Pie
} from 'recharts';
import moduleService from '../../services/modules';

// --- 1. KPI Card Component ---
// const StatCard = ({ title, value, icon: Icon, colorClass = "from-primary/10 to-primary/5" }) => (
//   <div className="relative overflow-hidden bg-surface/40 backdrop-blur-xl border border-border/40 rounded-xl p-6 shadow-sm group hover:border-primary/30 transition-all duration-300">
//     <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors duration-300" />
//     <div className="flex items-center justify-between gap-4">
//       <div className="space-y-1.5">
//         <p className="text-xs font-bold text-text-muted uppercase tracking-widest">{title}</p>
//         <h3 className="text-3xl font-extrabold text-secondary tracking-tight group-hover:text-primary transition-colors duration-300">
//           {value}
//         </h3>
//       </div>
//       <div className={`p-3 bg-linear-to-br ${colorClass} border border-primary/10 text-primary rounded-xl transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-primary/5 shrink-0`}>
//         <Icon className="w-5 h-5 stroke-[2.25]" />
//       </div>
//     </div>
//   </div>
// );

// --- 2. Status Badge Component ---
const StatusBadge = ({ average }) => {
  let config = { label: "Healthy", styles: "bg-success/10 text-success border-success/20" };
  if (average < 10) config = { label: "Critical", styles: "bg-error/10 text-error border-error/20" };
  else if (average < 12) config = { label: "Warning", styles: "bg-warning/10 text-warning border-warning/20" };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${config.styles}`}>{config.label}</span>;
};

// --- 3. Ultra-Detailed Custom Tooltip ---
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#1e293b] p-4 border-none rounded-xl shadow-xl min-w-50 z-50 relative">
        <p className="text-white font-bold text-sm mb-1">{data.name || data.type || label}</p>
        {data.code && <p className="text-white/60 text-xs mb-3 font-mono border-b border-white/10 pb-2">Code: {data.code}</p>}

        <div className="space-y-1.5">
          {payload.map((entry, index) => (
            <p key={index} className="text-white/90 text-xs flex justify-between items-center gap-4">
              <span className="capitalize">{entry.name}: </span>
              <span className="font-mono font-bold" style={{ color: entry.color }}>
                {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
              </span>
            </p>
          ))}
          {data.pass_rate !== undefined && (
            <p className="text-white/90 text-xs flex justify-between items-center gap-4 pt-1.5 mt-1.5 border-t border-white/10">
              <span>Pass Rate:</span>
              <span className="font-mono font-bold text-success">{Number(data.pass_rate).toFixed(1)}%</span>
            </p>
          )}
          {data.credits !== undefined && payload[0].name !== 'Credits' && (
            <p className="text-white/90 text-xs flex justify-between items-center gap-4">
              <span>Credits:</span>
              <span className="font-mono font-bold text-white/70">{data.credits} ECTS</span>
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

// --- 4. Shape-Shifting: Credits Correlation Chart ---
const CreditsCorrelationChart = ({ data }) => {
  const [chartType, setChartType] = useState('area');

  // CRITICAL FIX: Force numeric casting to prevent Recharts from crashing silently
  const safeData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data.map(d => ({
      ...d,
      credits: Number(d.credits) || 0,
      overall_average: Number(d.overall_average) || 0,
      pass_rate: Number(d.pass_rate) || 0,
    })).sort((a, b) => a.credits - b.credits);
  }, [data]);

  const renderChart = () => {
    if (safeData.length === 0) return <div className="flex h-full items-center justify-center text-text-muted">No correlation data available</div>;

    switch (chartType) {
      case 'area':
        return (
          <AreaChart data={safeData} margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis dataKey="code" stroke="#94a3b8" fontSize={12} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} domain={[0, 20]} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="overall_average" name="Avg Score" stroke="#00babc" fill="#00babc" fillOpacity={0.3} strokeWidth={3} />
          </AreaChart>
        );
      case 'bar':
        return (
          <BarChart data={safeData} margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis dataKey="code" stroke="#94a3b8" fontSize={12} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} domain={[0, 20]} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
            <Bar dataKey="overall_average" name="Avg Score" fill="#00babc" radius={[4, 4, 0, 0]} />
          </BarChart>
        );
      case 'scatter':
      default:
        return (
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis type="number" dataKey="credits" name="Credits" stroke="#94a3b8" fontSize={12} tickLine={false} domain={['dataMin - 1', 'dataMax + 1']} label={{ value: 'Credits', position: 'insideBottomRight', offset: -10, fill: '#94a3b8', fontSize: 10 }} />
            <YAxis type="number" dataKey="overall_average" name="Avg Score" stroke="#94a3b8" fontSize={12} tickLine={false} domain={[0, 20]} />
            <ZAxis type="number" dataKey="pass_rate" range={[100, 500]} name="Pass Rate" />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name="Modules" data={safeData} fill="#00babc">
              {safeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.overall_average < 10 ? '#ef4444' : entry.overall_average < 12 ? '#f59e0b' : '#00babc'} />
              ))}
            </Scatter>
          </ScatterChart>
        );
    }
  };

  return (
    <div className="bg-surface/50 backdrop-blur-md border border-border/50 rounded-2xl p-8 shadow-sm flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-secondary">Credits vs. Difficulty</h2>
          <p className="text-sm text-text-muted">Analyzing if high-credit modules cause failure cascades.</p>
        </div>
        <div className="flex bg-background/50 border border-border rounded-lg p-1">
          <button onClick={() => setChartType('bar')} className={`p-2 rounded-md transition-all ${chartType === 'bar' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-secondary'}`} title="Bars">
            <BarChart2 className="w-4 h-4" />
          </button>
          <button onClick={() => setChartType('area')} className={`p-2 rounded-md transition-all ${chartType === 'area' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-secondary'}`} title="Trend Density">
            <Activity className="w-4 h-4" />
          </button>
        </div>
      </div>
      {/* Explicit height prevents layout collapsing */}
      <div style={{ height: '320px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">{renderChart()}</ResponsiveContainer>
      </div>
    </div>
  );
};

// --- 5. Shape-Shifting: Evaluation Impact Component ---
const EvaluationImpactChart = ({ data }) => {
  const [chartType, setChartType] = useState('bar');
  const COLORS = ['#10b981', '#00babc', '#ef4444'];

  // CRITICAL FIX: Numeric mapping
  const safeData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data.map(d => ({
      ...d,
      average_score: Number(d.average_score) || 0,
      highest_score: Number(d.highest_score) || 0,
      lowest_score: Number(d.lowest_score) || 0,
    }));
  }, [data]);

  const renderChart = () => {
    if (safeData.length === 0) return <div className="flex h-full items-center justify-center text-text-muted">No evaluation data available</div>;

    switch (chartType) {
      case 'radar':
        return (
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={safeData}>
            <PolarGrid stroke="#333" />
            <PolarAngleAxis dataKey="type" stroke="#94a3b8" fontSize={12} />
            <PolarRadiusAxis angle={30} domain={[0, 20]} stroke="#94a3b8" fontSize={10} />
            <Tooltip content={<CustomTooltip />} />
            <Radar name="Highest Score" dataKey="highest_score" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
            <Radar name="Avg Score" dataKey="average_score" stroke="#00babc" fill="#00babc" fillOpacity={0.5} />
            <Radar name="Lowest Score" dataKey="lowest_score" stroke="#ef4444" fill="#ef4444" fillOpacity={0.5} />
            <Legend />
          </RadarChart>
        );
      case 'donut':
        return (
          <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Pie data={safeData} dataKey="average_score" nameKey="type" cx="50%" cy="50%" innerRadius={60} outerRadius={90} label>
              {safeData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
            </Pie>
          </PieChart>
        );
      case 'bar':
      default:
        return (
          <BarChart data={safeData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis dataKey="type" stroke="#94a3b8" fontSize={12} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} domain={[0, 20]} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
            <Legend iconType="circle" />
            <Bar dataKey="highest_score" name="Highest Score" fill="#10b981" radius={[4, 4, 0, 0]} barSize={25} />
            <Bar dataKey="average_score" name="Avg Score" fill="#00babc" radius={[4, 4, 0, 0]} barSize={25} />
            <Bar dataKey="lowest_score" name="Lowest Score" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={25} />
          </BarChart>
        );
    }
  };

  return (
    <div className="bg-surface/50 backdrop-blur-md border border-border/50 rounded-2xl p-8 shadow-sm flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-secondary">Evaluation Impact</h2>
          <p className="text-sm text-text-muted">Comparing spread (Highest, Avg, Lowest) by Type.</p>
        </div>
        <div className="flex bg-background/50 border border-border rounded-lg p-1">
          <button onClick={() => setChartType('bar')} className={`p-2 rounded-md transition-all ${chartType === 'bar' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-secondary'}`} title="Bars">
            <BarChart2 className="w-4 h-4" />
          </button>
          <button onClick={() => setChartType('donut')} className={`p-2 rounded-md transition-all ${chartType === 'donut' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-secondary'}`} title="Donut">
            <PieChartIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div style={{ height: '320px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">{renderChart()}</ResponsiveContainer>
      </div>
    </div>
  );
};

// --- 6. Main Modules Page ---
const ModulesPage = () => {
  const [modules, setModules] = useState([]);
  const [evalStats, setEvalStats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);
  const [cohortData, setCohortData] = useState({});
  const [loadingCohort, setLoadingCohort] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'overall_average', direction: 'asc' });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [modulesRes, evalStatsRes] = await Promise.all([
        moduleService.getModules(),
        moduleService.getEvaluationStats()
      ]);
      setModules(modulesRes || []);
      setEvalStats(evalStatsRes || []);
    } catch (err) {
      toast.error('Failed to load modules dashboard');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRowClick = async (moduleId) => {
    if (expandedRow === moduleId) {
      setExpandedRow(null);
      return;
    }
    setExpandedRow(moduleId);
    if (!cohortData[moduleId]) {
      setLoadingCohort(moduleId);
      try {
        const data = await moduleService.getCohortBreakdown(moduleId);
        setCohortData(prev => ({ ...prev, [moduleId]: data }));
      } catch (err) { toast.error('Failed to load cohort breakdown'); }
      finally { setLoadingCohort(null); }
    }
  };

  const filteredModules = useMemo(() => {
    return modules.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.code.toLowerCase().includes(search.toLowerCase()));
  }, [modules, search]);

  const sortedModules = useMemo(() => {
    let sortableItems = [...filteredModules];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredModules, sortConfig]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const activeModulesCount = modules.length;
  const schoolWideAvg = modules.length > 0 ? (modules.reduce((acc, m) => acc + m.overall_average, 0) / modules.length).toFixed(2) : 0;
  const criticalModulesCount = modules.filter(m => m.overall_average < 10).length;

  const SortableHeader = ({ label, sortKey }) => (
    <th className="px-6 py-4 cursor-pointer hover:bg-background/50 transition-colors group select-none" onClick={() => handleSort(sortKey)}>
      <div className="flex items-center gap-2">
        {label}
        <div className="flex flex-col text-text-muted/50 group-hover:text-primary transition-colors">
          {sortConfig.key === sortKey ? (
            sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />
          ) : (<ArrowUpDown className="w-3 h-3" />)}
        </div>
      </div>
    </th>
  );

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold text-secondary">Modules & Evaluations</h1>
        <p className="text-text-muted mt-1">Cross-cohort difficulty analysis and evaluation metrics.</p>
      </div>

      {/* KPI Section */}
      {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Active Modules" value={activeModulesCount} icon={BookOpen} />
        <StatCard title="Global Module Avg" value={`${schoolWideAvg}/20`} icon={Activity} />
        <StatCard title="Critical Modules" value={criticalModulesCount} icon={AlertCircle} colorClass={criticalModulesCount > 0 ? "from-error/20 to-error/5 text-error" : "from-success/20 to-success/5 text-success"} />
      </div> */}

      {/* Advanced Shape-Shifting Recharts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CreditsCorrelationChart data={modules} />
        <EvaluationImpactChart data={evalStats} />
      </div>

      {/* Data Table Section */}
      <div className="bg-surface/50 backdrop-blur-md border border-border/50 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input type="text" placeholder="Search module name or code..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-background/50 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all" />
          </div>
          <div className="flex items-center gap-2 text-text-muted text-sm font-medium">
            <Target className="w-4 h-4" />
            <span>Click any row to view cohort breakdown</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-background/30 text-xs font-bold text-text-muted uppercase tracking-wider">
                <SortableHeader label="Module" sortKey="name" />
                <SortableHeader label="Code" sortKey="code" />
                <SortableHeader label="Credits" sortKey="credits" />
                <SortableHeader label="Avg Grade" sortKey="overall_average" />
                <SortableHeader label="Pass Rate" sortKey="pass_rate" />
                <SortableHeader label="Evals" sortKey="total_evaluations" />
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="py-20 text-center">
                    <div className="flex justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                  </td>
                </tr>
              ) : sortedModules.length > 0 ? (
                sortedModules.map((module) => (
                  <React.Fragment key={module.id}>
                    <tr onClick={() => handleRowClick(module.id)} className={`cursor-pointer transition-all duration-200 ${expandedRow === module.id ? 'bg-primary/10' : 'hover:bg-primary/5'}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 text-primary rounded-lg"><Layers className="w-4 h-4" /></div>
                          <span className="font-bold text-secondary">{module.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-text-main">{module.code}</td>
                      <td className="px-6 py-4 text-sm font-medium text-text-main">{module.credits} ECTS</td>
                      <td className="px-6 py-4"><div className={`font-bold ${module.overall_average >= 12 ? 'text-success' : module.overall_average >= 10 ? 'text-warning' : 'text-error'}`}>{Number(module.overall_average).toFixed(2)}</div></td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-background rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${module.pass_rate >= 70 ? 'bg-success' : module.pass_rate >= 50 ? 'bg-warning' : 'bg-error'}`} style={{ width: `${module.pass_rate}%` }} />
                          </div>
                          <span className="text-xs font-bold text-text-muted">{Number(module.pass_rate).toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-text-muted font-medium">{module.total_evaluations}</td>
                      <td className="px-6 py-4"><StatusBadge average={module.overall_average} /></td>
                    </tr>

                    {/* Drill-down Accordion */}
                    <AnimatePresence>
                      {expandedRow === module.id && (
                        <tr>
                          <td colSpan="7" className="p-0 border-none">
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-background/30">
                              <div className="p-8 border-t border-border/20">
                                <h3 className="text-sm font-bold text-secondary uppercase tracking-widest flex items-center gap-2 mb-6"><Monitor className="w-4 h-4" /> Cohort Breakdown for {module.name}</h3>
                                {loadingCohort === module.id ? (
                                  <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
                                ) : cohortData[module.id] && cohortData[module.id].length > 0 ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="h-48 w-full">
                                      <ResponsiveContainer width="100%" height="100%">
                                        <BarChart layout="vertical" data={cohortData[module.id]} margin={{ left: 40, right: 40 }}>
                                          <XAxis type="number" hide domain={[0, 20]} />
                                          <YAxis dataKey="cohort_name" type="category" stroke="#94a3b8" fontSize={10} width={100} tickLine={false} axisLine={false} />
                                          <Tooltip content={<CustomTooltip />} />
                                          <Bar dataKey="average_grade" name="Avg Grade" fill="#00babc" radius={[0, 4, 4, 0]} barSize={20} />
                                        </BarChart>
                                      </ResponsiveContainer>
                                    </div>
                                    <div className="space-y-3">
                                      {cohortData[module.id].map((cohort, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-surface/50 rounded-xl border border-border/50">
                                          <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary font-bold text-xs">{cohort.cohort_name.substring(0, 2)}</div>
                                            <span className="text-sm font-medium text-text-main">{cohort.cohort_name}</span>
                                          </div>
                                          <div className="flex items-center gap-6">
                                            <div className="text-right">
                                              <p className="text-[10px] text-text-muted uppercase font-bold">Avg Grade</p>
                                              <p className={`text-sm font-bold ${cohort.average_grade >= 10 ? 'text-success' : 'text-error'}`}>{Number(cohort.average_grade).toFixed(2)}/20</p>
                                            </div>
                                            <div className="text-right">
                                              <p className="text-[10px] text-text-muted uppercase font-bold">Pass Rate</p>
                                              <p className="text-sm font-bold text-secondary">{Number(cohort.pass_rate).toFixed(1)}%</p>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-8 text-text-muted text-sm">No cohort data available for this module.</div>
                                )}
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-20 text-center text-text-muted">No modules found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ModulesPage;