"use client";

import { useSyncExternalStore } from "react";
import { UserRole, Opportunity, Contact, Interaction, Meeting } from "@prisma/client";
import { 
  Users, Target, Clock, Calendar, 
  Phone, Mail, FileText, 
  TrendingUp
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, Cell 
} from "recharts";
import { formatCurrency } from "@/lib/utils";


// No-op subscription: the snapshot below never changes after hydration.
const subscribeNoop = () => () => {};
type DashboardClientProps = {
  userRole: UserRole;
  userName: string;
  metrics: {
    totalContacts: number;
    activeOpportunities: number;
    followUpsDue: number;
    meetingsScheduled: number;
  };
  opportunities: (Opportunity & { contact: Contact | null })[];
  timeline: (Interaction & { contact: Contact | null; opportunity: Opportunity | null })[];
  recentMeetings: (Meeting & { participants: Contact[] })[];
};

const CHART_COLORS = ["#71717a", "#a1a1aa", "#d4d4d8", "#e4e4e7", "#ffffff"];

export default function DashboardClient({
  userRole,
  metrics,
  opportunities,
  timeline,
  recentMeetings
}: DashboardClientProps) {
  // true only in the browser, so the charts render client-side (no setState in an effect)
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);

  const getMetricTitle = (role: UserRole) => {
    switch (role) {
      case "JOB_SEEKER":
        return "Active Apps";
      case "FREELANCER":
        return "Active Projects";
      case "FOUNDER":
        return "Active Leads";
      default:
        return "Active Items";
    }
  };

  // Compile Chart Data based on role
  const getChartData = () => {
    if (userRole === "JOB_SEEKER") {
      const stages = ["Applied", "Interviewing", "Offer Received", "Rejected"];
      return stages.map((stage) => ({
        name: stage,
        value: opportunities.filter((o) => o.status === stage).length
      }));
    } else if (userRole === "FREELANCER") {
      const stages = ["Proposal Sent", "In Negotiation", "Contract Signed", "Lost"];
      return stages.map((stage) => ({
        name: stage,
        value: opportunities
          .filter((o) => o.status === stage)
          .reduce((sum, o) => sum + (o.value || 0), 0)
      }));
    } else {
      // FOUNDER
      const stages = ["Lead", "Contacted", "Meeting Scheduled", "Due Diligence", "Invested"];
      return stages.map((stage) => ({
        name: stage,
        value: opportunities
          .filter((o) => o.status === stage)
          .reduce((sum, o) => sum + (o.value || 0), 0)
      }));
    }
  };

  const chartData = getChartData();

  // Helper to format interaction timeline icons
  const getTimelineIcon = (type: string) => {
    switch (type) {
      case "CALL":
        return <Phone className="w-3.5 h-3.5 text-zinc-400" />;
      case "EMAIL":
        return <Mail className="w-3.5 h-3.5 text-zinc-400" />;
      case "MEETING":
        return <Calendar className="w-3.5 h-3.5 text-zinc-400" />;
      case "NOTE":
        return <FileText className="w-3.5 h-3.5 text-zinc-400" />;
      case "FOLLOW_UP":
        return <Clock className="w-3.5 h-3.5 text-zinc-400" />;
      default:
        return <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  return (
    <div className="space-y-8 text-[#f4f4f5]">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-zinc-900 bg-zinc-950/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Contacts</span>
            <Users className="w-4 h-4 text-zinc-500" />
          </div>
          <p className="text-2xl font-bold text-white">{metrics.totalContacts}</p>
        </div>

        <div className="p-5 rounded-2xl border border-zinc-900 bg-zinc-950/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
              {getMetricTitle(userRole)}
            </span>
            <Target className="w-4 h-4 text-zinc-500" />
          </div>
          <p className="text-2xl font-bold text-white">{metrics.activeOpportunities}</p>
        </div>

        <div className="p-5 rounded-2xl border border-zinc-900 bg-zinc-950/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Tasks Due</span>
            <Clock className="w-4 h-4 text-zinc-500" />
          </div>
          <p className="text-2xl font-bold text-white">{metrics.followUpsDue}</p>
        </div>

        <div className="p-5 rounded-2xl border border-zinc-900 bg-zinc-950/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Meetings</span>
            <Calendar className="w-4 h-4 text-zinc-500" />
          </div>
          <p className="text-2xl font-bold text-white">{metrics.meetingsScheduled}</p>
        </div>
      </div>

      {/* Main Grid: Charts & Meetings | Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Analytics Chart & Upcoming Meetings */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Analytics Chart Block */}
          <div className="p-5 rounded-2xl border border-zinc-900 bg-zinc-950/40 space-y-4">
            <div>
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">Workspace Analytics</h3>
              <p className="text-xs text-zinc-500">
                {userRole === "JOB_SEEKER" 
                  ? "Funnel progression of your active career applications"
                  : userRole === "FREELANCER"
                    ? "Proposal values across active client projects"
                    : "Fundraising targets across venture portfolios"}
              </p>
            </div>

            {/* Recharts chart loading wrapper */}
            {mounted ? (
              <div className="h-[250px] w-full text-xs">
                {userRole === "JOB_SEEKER" ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#09090b", borderColor: "#18181b", borderRadius: "8px" }}
                        labelStyle={{ color: "#ffffff", fontWeight: "bold" }}
                      />
                      <Bar dataKey="value" fill="#ffffff" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis 
                        stroke="#52525b" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(value) => `₹${value / 1000}k`} 
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#09090b", borderColor: "#18181b", borderRadius: "8px" }}
                        labelStyle={{ color: "#ffffff", fontWeight: "bold" }}
                        formatter={(value) => [formatCurrency(Number(value)), "Pipeline value"]}
                      />
                      <Bar dataKey="value" fill="#ffffff" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            ) : (
              <div className="h-[250px] w-full flex items-center justify-center text-xs text-zinc-500">
                Loading analytics...
              </div>
            )}
          </div>

          {/* Upcoming Meetings Block */}
          <div className="p-5 rounded-2xl border border-zinc-900 bg-zinc-950/40 space-y-4">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">Upcoming Meetings</h3>
            
            {recentMeetings.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 italic text-left">No upcoming meetings scheduled.</p>
            ) : (
              <div className="space-y-3">
                {recentMeetings.map((meeting) => (
                  <div 
                    key={meeting.id} 
                    className="p-4 rounded-xl border border-zinc-900 bg-zinc-950/20 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <h4 className="font-bold text-xs text-white leading-normal">{meeting.title}</h4>
                      {meeting.participants.length > 0 && (
                        <p className="text-[10px] text-zinc-500">
                          With: {meeting.participants.map((p) => p.name).join(", ")}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] bg-zinc-900 text-zinc-400 border border-zinc-850 px-2 py-0.5 rounded font-semibold self-start sm:self-auto">
                      {new Date(meeting.meetingDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Unified Timeline Activity Feed */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl border border-zinc-900 bg-zinc-950/40 h-full flex flex-col overflow-hidden max-h-[640px]">
            <div className="mb-4">
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">Interaction Timeline</h3>
              <p className="text-xs text-zinc-500">All updates, meetings, and logs in chronological order.</p>
            </div>

            {/* Timeline Events Scroll Area */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin text-left pl-2 border-l border-zinc-900/80 relative">
              {timeline.length === 0 ? (
                <p className="text-xs text-zinc-650 italic text-center py-8">No logged interactions yet.</p>
              ) : (
                timeline.map((item) => (
                  <div key={item.id} className="relative text-xs space-y-1">
                    {/* Timeline dot */}
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-800 border border-zinc-900 absolute -left-[14px] top-[4px] flex items-center justify-center">
                      <span className="w-1 h-1 rounded-full bg-zinc-500" />
                    </span>

                    <div className="flex items-center justify-between text-[9px] text-zinc-500 font-medium">
                      <span className="flex items-center gap-1">
                        {getTimelineIcon(item.type)}
                        <span className="uppercase text-zinc-400 font-bold">{item.type}</span>
                      </span>
                      <span>
                        {new Date(item.occurredAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>

                    <p className="text-zinc-300 leading-normal">{item.description}</p>
                    
                    {/* Association tags */}
                    {(item.contact || item.opportunity) && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {item.contact && (
                          <span className="text-[8px] bg-zinc-900 text-zinc-500 px-1 py-0.25 rounded">
                            @{item.contact.name}
                          </span>
                        )}
                        {item.opportunity && (
                          <span className="text-[8px] bg-zinc-900 text-zinc-500 px-1 py-0.25 rounded max-w-[100px] truncate">
                            #{item.opportunity.title}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
