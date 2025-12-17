import React from "react";
import { 
  LayoutDashboard, Users, MessageSquare, PieChart, Settings, Bell, 
  Search, Menu, Mail, Clock, AlertCircle, HelpCircle, Flame, 
  Droplets, UserMinus, Phone, Zap, ChevronDown, Filter, MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart as RePieChart, Pie, Cell, Legend
} from "recharts";

// Mock Data
const lineChartData = [
  { day: "Monday", sent: 6.0, received: 0 },
  { day: "Tuesday", sent: 2.0, received: 0 },
  { day: "Wednesday", sent: 0.5, received: 0 },
  { day: "Thursday", sent: 0.5, received: 0 },
  { day: "Friday", sent: 0.5, received: 0 },
  { day: "Saturday", sent: 0.5, received: 0 },
  { day: "Sunday", sent: 0.5, received: 0 },
];

const pieChartData = [
  { name: "Hot Leads", value: 0, color: "#ef4444" },
  { name: "Warm Leads", value: 0, color: "#f97316" },
  { name: "Nurture", value: 0, color: "#eab308" },
  { name: "Drips", value: 0, color: "#3b82f6" },
  { name: "No Status", value: 100, color: "#e2e8f0" }, // Grey for empty/no status
];

const campaigns = [
  { name: "Ground Up - Entity - 1st Number", fire: 11, drop: 8, y: 0, drop2: 22 },
  { name: "Ground Up - First name - 1st Number", fire: 4, drop: 0, y: 0, drop2: 9 },
  { name: "Ground Up (Updated) - Number 2", fire: 2, drop: 1, y: 0, drop2: 7 },
];

const dripAutomations = [
  { name: "Not Ready (Unconfirmed Props)", count: 10 },
  { name: "Long-Term Follow-Up (If Not Intere...", count: 10 },
  { name: "1st Week (stopped responding)", count: 8 },
];

export default function DashboardPage() {
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar - Icon Only / Slim to match style */}
      <aside className="hidden md:flex flex-col w-16 border-r border-border bg-sidebar items-center py-6 space-y-6">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(0,180,216,0.5)]">
          <Zap className="text-white h-6 w-6" fill="currentColor" />
        </div>
        
        <nav className="flex-1 flex flex-col space-y-4 mt-6">
          <SidebarIcon icon={<LayoutDashboard />} active />
          <SidebarIcon icon={<Users />} />
          <SidebarIcon icon={<MessageSquare />} />
          <SidebarIcon icon={<PieChart />} />
          <SidebarIcon icon={<Settings />} />
        </nav>

        <div className="flex flex-col space-y-4">
          <SidebarIcon icon={<HelpCircle />} />
          <Avatar className="h-10 w-10 ring-2 ring-primary/20">
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-background/50 backdrop-blur-sm z-10">
          <h1 className="text-xl font-heading font-semibold text-foreground">Dashboard</h1>
          
          <div className="flex items-center space-x-6">
            <div className="hidden md:flex items-center space-x-2 bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-full text-xs font-medium border border-emerald-500/20">
              <CheckCircleMini />
              <span>100DLC Registration Status: Complete</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-muted-foreground text-sm">
                 <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center">0%</div>
                 <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center">30%</div>
              </div>
              <span className="text-sm text-primary">office@goblinvestments.com</span>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">O</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6 pb-10">
            
            {/* Row 1: Stats & Lead Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* What's on your plate */}
              <Card className="md:col-span-4 bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium">What's on your plate</CardTitle>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 pt-2">
                  <PlateCard icon={<Mail className="text-primary" />} count={3} label="Unread" sub="respond now" />
                  <PlateCard icon={<Clock className="text-blue-400" />} count={5} label="Unanswered" sub="reply now" />
                  <PlateCard icon={<Bell className="text-red-400" />} count={0} label="Reminders" sub="view reminders" />
                  <PlateCard icon={<HelpCircle className="text-yellow-400" />} count={5} label="No Status" sub="view inbox" />
                </CardContent>
              </Card>

              {/* Prospect Leads */}
              <Card className="md:col-span-4 bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader className="pb-2">
                   <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium">Prospect Leads</CardTitle>
                    <div className="flex items-center text-xs text-muted-foreground">
                      This Week <ChevronDown className="h-3 w-3 ml-1" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full border-4 border-primary flex items-center justify-center text-xs font-bold">100%</div>
                      <div>
                        <div className="text-sm font-medium">7/7</div>
                        <div className="text-xs text-muted-foreground">Average Delivery Rate</div>
                      </div>
                    </div>
                    <div className="text-xs text-right space-y-1 text-muted-foreground">
                      <div>Initial Msg: 0%</div>
                      <div>Inbox: 0%</div>
                      <div>Drips: 100%</div>
                      <div>Follow Up: 0%</div>
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
                    <div className="text-xs text-right space-y-1 text-muted-foreground">
                       <div>Initial Msg: 0%</div>
                       <div>Inbox: 0%</div>
                       <div>Drips: 0%</div>
                       <div>Follow Up: 0%</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Lead Breakdown */}
              <Card className="md:col-span-4 bg-card/50 backdrop-blur-sm border-border/50">
                 <CardHeader className="pb-2">
                   <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium">Lead Breakdown</CardTitle>
                    <div className="flex items-center text-xs text-muted-foreground">
                      This Week <ChevronDown className="h-3 w-3 ml-1" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between pt-2">
                  <div className="h-32 w-32 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={55}
                          paddingAngle={0}
                          dataKey="value"
                          stroke="none"
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </RePieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">No Data</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-xs">
                    <LegendItem color="bg-red-500" label="Hot Leads" value="0" />
                    <LegendItem color="bg-orange-500" label="Warm Leads" value="0" />
                    <LegendItem color="bg-yellow-500" label="Nurture" value="0" />
                    <LegendItem color="bg-blue-500" label="Drips" value="0" />
                    <LegendItem color="bg-slate-300" label="No Status" value="0" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Row 2: Campaigns & Automations */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Top 3 Campaigns */}
              <Card className="md:col-span-5 bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium">Top 3 Campaigns</CardTitle>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
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
                </CardContent>
              </Card>

              {/* Active Conversations & Reply Time */}
              <div className="md:col-span-3 flex flex-col gap-6">
                <Card className="flex-1 bg-card/50 backdrop-blur-sm border-border/50">
                   <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Active Conversations</CardTitle>
                      <span className="text-[10px] text-muted-foreground">This Week</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold font-heading">0</div>
                    <div className="flex items-center mt-1 text-xs text-red-400">
                      <span className="mr-1">↓</span>
                      <span>4 from last week</span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="flex-1 bg-card/50 backdrop-blur-sm border-border/50">
                   <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Average Reply Time</CardTitle>
                      <span className="text-[10px] text-muted-foreground">This Week</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold font-heading">0 <span className="text-base font-normal text-muted-foreground">min</span></div>
                    <div className="flex items-center mt-1 text-xs text-emerald-400">
                      <span className="mr-1">↓</span>
                      <span>89 min from last week</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Drip Automations */}
              <Card className="md:col-span-4 bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium">Drip Automations</CardTitle>
                    <div className="flex items-center text-xs text-primary font-medium border border-primary/30 rounded-full px-2 py-0.5">
                      100%
                    </div>
                  </div>
                  <CardDescription className="text-xs">1 out of 1 Drips sent today</CardDescription>
                </CardHeader>
                <CardContent className="pt-2 space-y-4">
                  <div className="bg-secondary/20 rounded p-2">
                    <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400 mb-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-sm"></div>
                      <span>Upcoming Drips</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground py-1 border-b border-border/30">
                      <span>Tomorrow</span>
                      <span>0</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground py-1 border-b border-border/30">
                      <span>Next 7 days</span>
                      <span>8</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground py-1">
                      <span>Next 30 days</span>
                      <span>39</span>
                    </div>
                  </div>

                  <div className="bg-secondary/20 rounded p-2">
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
                </CardContent>
              </Card>
            </div>

            {/* Row 3: Text Activity & Tags */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
               <Card className="md:col-span-8 bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="default" className="bg-primary text-white h-7 text-xs">Text Activity</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs">Load Activity</Button>
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                      This Week <CalendarIcon />
                  </div>
                </CardHeader>
                <CardContent className="h-[250px] pt-4">
                   <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="rgba(255,255,255,0.05)" />
                      <XAxis 
                        dataKey="day" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 10 }} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                        itemStyle={{ color: '#f8fafc' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="sent" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2} 
                        dot={false}
                        activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                      />
                    </LineChart>
                   </ResponsiveContainer>
                   <div className="flex justify-center items-center space-x-6 mt-2 text-xs">
                     <div className="flex items-center space-x-1">
                       <div className="w-2 h-2 bg-primary rounded-sm"></div>
                       <span className="text-muted-foreground">7 Sent</span>
                     </div>
                     <div className="flex items-center space-x-1">
                       <div className="w-2 h-2 bg-blue-900 rounded-sm"></div>
                       <span className="text-muted-foreground">0 Received</span>
                     </div>
                     <div className="text-muted-foreground text-[10px]">
                       Dec 15, 2025 - Dec 21, 2025
                     </div>
                   </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-4 bg-card/50 backdrop-blur-sm border-border/50">
                 <CardHeader className="pb-2">
                   <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium">Tags</CardTitle>
                    <div className="flex items-center text-xs text-muted-foreground space-x-2">
                      <span>Tags</span>
                      <span>This Week <ChevronDown className="inline h-3 w-3" /></span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[200px]">
                  <div className="text-center space-y-2">
                     <p className="text-sm text-muted-foreground">No tags to show for the <br/> selected time period.</p>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </ScrollArea>
      </main>
    </div>
  );
}

// Helpers
function SidebarIcon({ icon, active }: { icon: React.ReactNode, active?: boolean }) {
  return (
    <div className={`p-3 rounded-xl transition-all cursor-pointer ${active ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'}`}>
      {React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}
    </div>
  );
}

function CheckCircleMini() {
  return (
    <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function PlateCard({ icon, count, label, sub }: { icon: React.ReactNode, count: number, label: string, sub: string }) {
  return (
    <div className="p-3 rounded-lg border border-border/50 bg-secondary/20 hover:bg-secondary/40 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="p-1.5 bg-background rounded-full border border-border/50">
          {React.cloneElement(icon as React.ReactElement<any>, { size: 16 })}
        </div>
        <div className="text-xs text-muted-foreground bg-background/50 px-1.5 py-0.5 rounded opacity-0 hover:opacity-100 transition-opacity">
          •
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold font-heading">{count}</div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-[10px] text-primary cursor-pointer hover:underline mt-1">{sub} ›</div>
      </div>
    </div>
  );
}

function LegendItem({ color, label, value }: { color: string, label: string, value: string }) {
  return (
    <div className="flex items-center justify-between w-[120px]">
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-sm ${color}`}></div>
        <span className="text-muted-foreground">{label}</span>
      </div>
      <span className="font-mono">{value}</span>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}