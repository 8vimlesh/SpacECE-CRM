import React, { useState } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { contactsService } from '../services/contactsService';
import { messagesService } from '../services/messagesService';
import { campaignsService } from '../services/campaignsService';
import { whatsappSettingsService } from '../services/whatsappSettingsService';
import {
  Download,
  Send,
  MessageSquare,
  Users,
  PlayCircle,
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';

interface DayStat {
  dateStr: string;
  displayLabel: string;
  outbound: number;
  inbound: number;
}

export const AnalyticsView: React.FC = () => {
  // Supabase Queries
  const { data: contacts } = useSupabaseData('contacts', () => contactsService.getAll());
  const { data: allMessages } = useSupabaseData('messages', () => messagesService.getAll());
  const { data: allCampaigns } = useSupabaseData('campaigns', () => campaignsService.getAll());
  const { data: settingsList } = useSupabaseData('whatsapp_settings', async () => {
    const s = await whatsappSettingsService.get();
    return s ? [s] : [];
  });
  const settings = settingsList?.[0];
  const contactsCount = contacts?.length || 0;

  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Today Date String YYYY-MM-DD
  const todayDateObj = new Date();
  const todayStr = todayDateObj.toISOString().split('T')[0];

  // 1. Calculate KPI Metrics Today
  const outboundToday = (allMessages || []).filter(
    (m) => m.direction === 'out' && m.timestamp.startsWith(todayStr)
  ).length;

  const inboundToday = (allMessages || []).filter(
    (m) => m.direction === 'in' && m.timestamp.startsWith(todayStr)
  ).length;

  const activeCampaignsCount = (allCampaigns || []).filter((c) =>
    ['SENDING', 'RUNNING', 'SCHEDULED'].includes(c.status)
  ).length;

  const isConnected = settings?.connectionStatus === 'CONNECTED';

  // 2. Compute 7-Day Trend Dataset
  const last7DaysStats: DayStat[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(todayDateObj.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const displayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const outbound = (allMessages || []).filter(
      (m) => m.direction === 'out' && m.timestamp.startsWith(dateStr)
    ).length;

    const inbound = (allMessages || []).filter(
      (m) => m.direction === 'in' && m.timestamp.startsWith(dateStr)
    ).length;

    last7DaysStats.push({
      dateStr,
      displayLabel,
      outbound,
      inbound
    });
  }

  // Calculate max volume for chart scaling
  const maxDayVolume = Math.max(
    ...last7DaysStats.map((s) => Math.max(s.outbound, s.inbound)),
    5 // Minimum height scale of 5
  );

  // 3. Export CSV Report Handler
  const handleExportCsv = () => {
    let csvContent = 'Date,OutboundMessages,InboundMessages,TotalVolume\n';
    last7DaysStats.forEach((stat) => {
      csvContent += `${stat.dateStr},${stat.outbound},${stat.inbound},${stat.outbound + stat.inbound}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Spacece_WhatsApp_Analytics_Report_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div className="analytics-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics & Activity Reports</h1>
          <p className="page-subtitle">
            Real-time WhatsApp message throughput, parent engagement trends, and system connection health
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={handleExportCsv}>
            <Download size={16} />
            <span>Export Report (CSV)</span>
          </button>
          {downloadSuccess && (
            <span className="badge badge-success">
              <CheckCircle2 size={12} /> CSV Downloaded
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid-4 mb-6">
        {/* Card 1: Outbound Messages Today */}
        <div className="card stat-card">
          <div className="stat-icon teal">
            <Send size={24} />
          </div>
          <div>
            <div className="stat-label">Outbound Messages Today</div>
            <div className="stat-value">{outboundToday}</div>
            <div className="stat-subtext">Sent on {todayStr}</div>
          </div>
        </div>

        {/* Card 2: Inbound Messages Today */}
        <div className="card stat-card">
          <div className="stat-icon blue">
            <MessageSquare size={24} />
          </div>
          <div>
            <div className="stat-label">Inbound Messages Today</div>
            <div className="stat-value">{inboundToday}</div>
            <div className="stat-subtext">Received from Parents</div>
          </div>
        </div>

        {/* Card 3: Total Contacts */}
        <div className="card stat-card">
          <div className="stat-icon purple">
            <Users size={24} />
          </div>
          <div>
            <div className="stat-label">Total Contacts</div>
            <div className="stat-value">{contactsCount}</div>
            <div className="stat-subtext">Indexed in CRM Directory</div>
          </div>
        </div>

        {/* Card 4: Active/Ongoing Campaigns */}
        <div className="card stat-card">
          <div className="stat-icon amber">
            <PlayCircle size={24} />
          </div>
          <div>
            <div className="stat-label">Active / Ongoing Campaigns</div>
            <div className="stat-value">{activeCampaignsCount}</div>
            <div className="stat-subtext">Broadcast Workflows Active</div>
          </div>
        </div>
      </div>

      {/* 7-Day Message Volume Trend Chart */}
      <div className="card mb-6">
        <div className="card-header">
          <div>
            <h3 className="card-title">7-Day Communication Volume Trend</h3>
            <p className="text-xs text-muted">Daily Outbound vs Inbound message totals</p>
          </div>
          <div className="chart-legend">
            <span className="legend-item outbound">
              <span className="legend-dot" /> Outbound (Sent)
            </span>
            <span className="legend-item inbound">
              <span className="legend-dot" /> Inbound (Received)
            </span>
          </div>
        </div>

        <div className="chart-container">
          <div className="svg-chart-wrapper">
            <svg viewBox="0 0 700 220" className="trend-svg">
              {/* Grid Lines */}
              <line x1="40" y1="30" x2="680" y2="30" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="80" x2="680" y2="80" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="130" x2="680" y2="130" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="180" x2="680" y2="180" stroke="#e2e8f0" strokeWidth="1.5" />

              {/* Render Bars per Day */}
              {last7DaysStats.map((stat, idx) => {
                const xBase = 65 + idx * 90;
                const outboundH = (stat.outbound / maxDayVolume) * 140;
                const inboundH = (stat.inbound / maxDayVolume) * 140;

                const outboundY = 180 - outboundH;
                const inboundY = 180 - inboundH;

                return (
                  <g key={stat.dateStr} className="chart-day-group">
                    {/* Outbound Bar (Amber) */}
                    <rect
                      x={xBase}
                      y={outboundY}
                      width="20"
                      height={Math.max(outboundH, 4)}
                      rx="3"
                      fill="#d97706"
                      className="bar-rect"
                    />
                    <text x={xBase + 10} y={outboundY - 5} textAnchor="middle" className="bar-val-text">
                      {stat.outbound}
                    </text>

                    {/* Inbound Bar (Navy) */}
                    <rect
                      x={xBase + 24}
                      y={inboundY}
                      width="20"
                      height={Math.max(inboundH, 4)}
                      rx="3"
                      fill="#1e293b"
                      className="bar-rect"
                    />
                    <text x={xBase + 34} y={inboundY - 5} textAnchor="middle" className="bar-val-text">
                      {stat.inbound}
                    </text>

                    {/* Date Label */}
                    <text x={xBase + 22} y="202" textAnchor="middle" className="day-label-text">
                      {stat.displayLabel}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* WhatsApp Connection Health Section */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">WhatsApp Connection Health</h3>
          <span className={`badge ${isConnected ? 'badge-success' : 'badge-danger'}`}>
            {isConnected ? 'Meta API Connected' : 'Not Connected'}
          </span>
        </div>

        <div className={`health-status-box ${isConnected ? 'connected' : 'disconnected'}`}>
          <div className="health-icon-box">
            {isConnected ? (
              <CheckCircle2 size={32} className="text-emerald" />
            ) : (
              <ShieldAlert size={32} className="text-rose" />
            )}
          </div>

          <div className="health-info-content">
            <h4>
              Meta Cloud API Status:{' '}
              <strong className={isConnected ? 'text-emerald' : 'text-rose'}>
                {isConnected ? 'Verified & Active' : 'Disconnected / Setup Required'}
              </strong>
            </h4>

            <p className="health-desc">
              {isConnected
                ? `Active WhatsApp Business API account for "${settings?.displayName || 'Spacece India Foundation'}" (${settings?.phoneNumber || 'N/A'}). WABA ID: ${settings?.wabaId || 'Configured'}.`
                : 'WhatsApp Cloud API integration is not active. Outgoing messages will log locally in CRM database mode until Meta API credentials are saved in Settings.'}
            </p>

            {settings?.lastChecked && (
              <span className="text-xs text-muted block mt-1">
                Last Verified Check: {settings.lastChecked}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Master Styles for Analytics Dashboard */}
      <style>{`
        .mb-6 { margin-bottom: 1.5rem; }
        .mt-1 { margin-top: 0.25rem; }
        .text-xs { font-size: 0.75rem; }
        .block { display: block; }
        .text-emerald { color: #047857; }
        .text-rose { color: #be123c; }

        .chart-legend {
          display: flex;
          gap: 1rem;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .legend-item.outbound .legend-dot { background-color: var(--primary-600); }
        .legend-item.inbound .legend-dot { background-color: var(--navy-900); }

        .chart-container {
          padding: 1rem 0;
        }

        .svg-chart-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        .trend-svg {
          width: 100%;
          height: auto;
          min-width: 600px;
        }

        .bar-rect {
          transition: height 0.3s ease, y 0.3s ease;
        }

        .bar-val-text {
          font-size: 10px;
          font-weight: 800;
          fill: var(--slate-600);
        }

        .day-label-text {
          font-size: 11px;
          font-weight: 700;
          fill: var(--navy-900);
        }

        .health-status-box {
          padding: 1.25rem;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .health-status-box.connected {
          background-color: #ecfdf5;
          border: 1px solid #a7f3d0;
        }

        .health-status-box.disconnected {
          background-color: #fff1f2;
          border: 1px solid #fecdd3;
        }

        .health-icon-box {
          flex-shrink: 0;
        }

        .health-info-content h4 {
          font-size: 0.9375rem;
          font-weight: 800;
          color: var(--navy-900);
          margin-bottom: 0.25rem;
        }

        .health-desc {
          font-size: 0.8125rem;
          color: var(--slate-600);
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
};
