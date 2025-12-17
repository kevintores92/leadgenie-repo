import React from "react";
import { 
  LayoutDashboard, Users, MessageSquare, PieChart, Settings, Bell, 
  Search, Mail, Clock, AlertCircle, HelpCircle, Flame, 
  Droplets, Phone, Zap, ChevronDown, HelpCircle as Help
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart as RePieChart, Pie, Cell
} from "recharts";

// Mock Data
const lineChartData = [
  { day: "Monday", sent: 6.0 },
  { day: "Tuesday", sent: 2.0 },
  { day: "Wednesday", sent: 0.5 },
  { day: "Thursday", sent: 0.5 },
  { day: "Friday", sent: 0.5 },
  { day: "Saturday", sent: 0.5 },
  { day: "Sunday", sent: 0.5 },
];

const pieChartData = [
  { name: "Hot Leads", value: 0, color: "#ef4444" },
  { name: "Warm Leads", value: 0, color: "#f97316" },
  { name: "Nurture", value: 0, color: "#eab308" },
  { name: "Drips", value: 0, color: "#3b82f6" },
  { name: "No Status", value: 100, color: "#e2e8f0" },
];

const campaigns = [
  { name: "Ground Up - Entity - 1st Number", fire: 11, drop: 8, y: 0, drop2: 22 },
  { name: "Ground Up - First name - 1st Number", fire: 4, drop: 0, y: 0, drop2: 9 },
  { name: "Ground Up (Updated) - Number 2", fire: 2, drop: 1, y: 0, drop2: 7 },
];

const dripAutomations = [
  { name: "Not Ready (Unconfirmed Props)", count: 10 },
  { name: "Long-Term Follow-Up", count: 10 },
  { name: "1st Week (stopped responding)", count: 8 },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Top Header */}
      <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-background/50 backdrop-blur-sm z-10">
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        
        <div className="flex items-center space-x-6">
          <div className="hidden md:flex items-center space-x-2 bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-full text-xs font-medium border border-emerald-500/20">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            <span>100DLC Registration: Complete</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-primary">office@goblinvestments.com</span>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">O</div>
          </div>
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Row 1: Stats & Lead Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* What's on your plate */}
            <div className="md:col-span-4 bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold">What's on your plate</h3>
                <Help className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <PlateCard icon={<Mail className="text-primary" size={16} />} count={3} label="Unread" sub="respond now" />
                <PlateCard icon={<Clock className="text-blue-400" size={16} />} count={5} label="Unanswered" sub="reply now" />
                <PlateCard icon={<Bell className="text-red-400" size={16} />} count={0} label="Reminders" sub="view reminders" />
                <PlateCard icon={<Help className="text-yellow-400" size={16} />} count={5} label="No Status" sub="view inbox" />
              </div>
            </div>

            {/* Prospect Leads */}
            <div className="md:col-span-4 bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold">Prospect Leads</h3>
                <div className="flex items-center text-xs text-muted-foreground">
                  This Week <ChevronDown className="h-3 w-3 ml-1" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full border-4 border-primary flex items-center justify-center text-xs font-bold">100%</div>
                    <div>
                      <div className="text-sm font-medium">7/7</div>
                      <div className="text-xs text-muted-foreground">Average Delivery Rate</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50 opacity-70">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full border-4 border-muted flex items-center justify-center text-xs font-bold text-muted-foreground">0%</div>
                    <div>
                      <div className="text-sm font-medium">0/7</div>
                      <div className="text-xs text-muted-foreground">Average Response Rate</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Lead Breakdown */}
            <div className="md:col-span-4 bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold">Lead Breakdown</h3>
              </div>
              <div className="flex items-center justify-between">
                <div className="h-32 w-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={55}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="space-y-2 text-xs">
                  {pieChartData.map((item, i) => (
                    <div key={i} className="flex items-center justify-between w-[120px]">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: item.color }}></div>
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-mono">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Campaigns & Automations */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Top 3 Campaigns */}
            <div className="md:col-span-5 bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold">Top 3 Campaigns</h3>
                <Help className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between text-xs text-muted-foreground px-2 border-b border-border/30 pb-2">
                  <span>Campaign Name</span>
                  <div className="flex space-x-6">
                    <Flame className="h-3 w-3" />
                    <Droplets className="h-3 w-3" />
                    <span className="w-3 text-center">Y</span>
                    <Droplets className="h-3 w-3" />
                  </div>
                </div>
                {campaigns.map((camp, i) => (
                  <div key={i} className="flex justify-between items-center text-sm px-2 py-1 hover:bg-white/5 rounded transition-colors">
                    <span className="truncate max-w-[180px] text-muted-foreground">{camp.name}</span>
                    <div className="flex space-x-6 text-foreground font-mono">
                      <span className="w-4 text-center">{camp.fire}</span>
                      <span className="w-4 text-center">{camp.drop}</span>
                      <span className="w-4 text-center">{camp.y}</span>
                      <span className="w-4 text-center">{camp.drop2}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Conversations & Reply Time */}
            <div className="md:col-span-3 flex flex-col gap-6">
              <div className="flex-1 bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Active Conversations</h4>
                  <span className="text-[10px] text-muted-foreground">This Week</span>
                </div>
                <div className="text-3xl font-bold">0</div>
                <div className="flex items-center mt-1 text-xs text-red-400">
                  <span className="mr-1">↓</span>
                  <span>4 from last week</span>
                </div>
              </div>
              <div className="flex-1 bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Average Reply Time</h4>
                  <span className="text-[10px] text-muted-foreground">This Week</span>
                </div>
                <div className="text-3xl font-bold">0 <span className="text-base font-normal text-muted-foreground">min</span></div>
                <div className="flex items-center mt-1 text-xs text-emerald-400">
                  <span className="mr-1">↓</span>
                  <span>89 min from last week</span>
                </div>
              </div>
            </div>

            {/* Drip Automations */}
            <div className="md:col-span-4 bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold">Drip Automations</h3>
                <div className="flex items-center text-xs text-primary font-medium border border-primary/30 rounded-full px-2 py-0.5">
                  100%
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-4">1 out of 1 Drips sent today</p>
              <div className="space-y-4">
                <div className="bg-secondary/20 rounded p-3">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400 mb-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-sm"></div>
                    <span>Upcoming Drips</span>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span>Tomorrow</span>
                      <span>0</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span>Next 7 days</span>
                      <span>8</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Next 30 days</span>
                      <span>39</span>
                    </div>
                  </div>
                </div>

                <div className="bg-secondary/20 rounded p-3">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-purple-400 mb-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-sm"></div>
                    <span>Top Drip Automations</span>
                  </div>
                  <div className="space-y-1">
                    {dripAutomations.map((drip, i) => (
                      <div key={i} className="flex justify-between text-[10px] text-muted-foreground">
                        <span className="truncate max-w-[180px]">{drip.name}</span>
                        <span>{drip.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Text Activity */}
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-6">
            <div className="flex flex-row items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <button className="px-3 py-1.5 bg-primary text-white text-xs rounded font-medium">Text Activity</button>
                <button className="px-3 py-1.5 text-muted-foreground text-xs hover:text-foreground">Load Activity</button>
                <Help className="h-3 w-3 text-muted-foreground" />
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                This Week
              </div>
            </div>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} />
                  <Line type="monotone" dataKey="sent" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function PlateCard({ icon, count, label, sub }) {
  return (
    <div className="p-3 rounded-lg border border-border/50 bg-secondary/20 hover:bg-secondary/40 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="p-1.5 bg-background rounded-full border border-border/50">
          {icon}
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold">{count}</div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-[10px] text-primary cursor-pointer hover:underline mt-1">{sub} ›</div>
      </div>
    </div>
  );
}
