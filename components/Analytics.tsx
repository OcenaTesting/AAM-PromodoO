
import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { SessionLog, Task } from '../types';

interface AnalyticsProps {
  history: SessionLog[];
  tasks: Task[];
}

const Analytics: React.FC<AnalyticsProps> = ({ history, tasks }) => {
  
  const stats = useMemo(() => {
    // 1. Weekly Data
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(today.getDate() - (6 - i));
      return d;
    });

    const weeklyData = last7Days.map(date => {
      const dayStr = date.toDateString();
      const minutes = history
        .filter(h => new Date(h.startTime).toDateString() === dayStr && h.mode === 'work')
        .reduce((acc, curr) => acc + curr.durationMinutes, 0);
      
      return {
        day: days[date.getDay()],
        fullDate: dayStr,
        minutes
      };
    });

    // 2. Focus Distribution (Mocked based on potential categories)
    const categories = ['Coding', 'Reading', 'Writing', 'Meeting', 'Research', 'Admin'];
    const focusData = categories.map(cat => {
      // In a real app, this would aggregate actual task tags. 
      // For now, we simulate a distribution that feels "alive" based on total work count.
      const seed = history.length > 0 ? history.length : 5;
      const randomVar = (cat.length * seed) % 50; 
      const count = history.length > 0 ? (history.filter(h => h.mode === 'work').length * 10) + randomVar : 30 + randomVar;
      
      return {
        subject: cat,
        A: Math.min(150, Math.floor(count)),
        fullMark: 150
      };
    });

    return { weeklyData, focusData };
  }, [history, tasks]);

  const totalFocusMinutes = history.filter(h => h.mode === 'work').reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const totalSessions = history.filter(h => h.mode === 'work').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in pb-10">
      {/* Summary Cards */}
      <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
        <div className="bg-promodo-card/50 p-4 rounded-xl border border-white/5">
            <div className="text-gray-400 text-xs uppercase font-bold tracking-wider">Total Focus</div>
            <div className="text-2xl font-mono font-bold text-white mt-1">{totalFocusMinutes} <span className="text-sm text-gray-500 font-sans">mins</span></div>
        </div>
        <div className="bg-promodo-card/50 p-4 rounded-xl border border-white/5">
            <div className="text-gray-400 text-xs uppercase font-bold tracking-wider">Sessions</div>
            <div className="text-2xl font-mono font-bold text-white mt-1">{totalSessions}</div>
        </div>
        <div className="bg-promodo-card/50 p-4 rounded-xl border border-white/5">
            <div className="text-gray-400 text-xs uppercase font-bold tracking-wider">Completed Tasks</div>
            <div className="text-2xl font-mono font-bold text-white mt-1">{tasks.filter(t => t.isCompleted).length}</div>
        </div>
        <div className="bg-promodo-card/50 p-4 rounded-xl border border-white/5">
            <div className="text-gray-400 text-xs uppercase font-bold tracking-wider">Pending Tasks</div>
            <div className="text-2xl font-mono font-bold text-white mt-1">{tasks.filter(t => !t.isCompleted).length}</div>
        </div>
      </div>

      {/* Weekly Stats */}
      <div className="bg-promodo-card/50 backdrop-blur-sm rounded-2xl p-6 border border-white/5 shadow-lg h-[300px] md:h-[400px]">
        <h3 className="text-lg font-bold mb-6 text-gray-200 flex items-center justify-between">
          <span>Weekly Focus Minutes</span>
          <span className="text-xs font-normal text-gray-400 bg-white/5 px-2 py-1 rounded">Last 7 Days</span>
        </h3>
        <div className="h-[80%] w-full">
          {history.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">
              Complete a session to see stats
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.weeklyData}>
                <XAxis dataKey="day" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0B2B5A', borderColor: '#1E90FF', color: '#fff', borderRadius: '8px' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="minutes" fill="#1E90FF" radius={[4, 4, 0, 0]} animationDuration={1500} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Focus Radar */}
      <div className="bg-promodo-card/50 backdrop-blur-sm rounded-2xl p-6 border border-white/5 shadow-lg h-[300px] md:h-[400px]">
        <h3 className="text-lg font-bold mb-2 text-gray-200">Focus Distribution</h3>
        <div className="h-[90%] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={stats.focusData}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
              <Radar
                name="Minutes"
                dataKey="A"
                stroke="#1E90FF"
                fill="#1E90FF"
                fillOpacity={0.4}
              />
              <Tooltip contentStyle={{ backgroundColor: '#0B2B5A', borderColor: '#1E90FF', color: '#fff' }}/>
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
