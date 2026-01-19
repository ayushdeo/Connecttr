
import React, { useEffect, useState } from "react";
import { API } from "../config";
import { Users } from "lucide-react";

export default function DemoLeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/emailhub/leads`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        setLeads(Array.isArray(data) ? data : []);
      } catch (e) {
        setErr(String(e.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-8 text-mist">Loading leads...</div>;
  if (err) return <div className="p-8 text-rose-400">Failed to load: {err}</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-white/5 rounded-lg border border-white/10">
          <Users className="text-royal-amethyst" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Qualified Leads</h2>
          <p className="text-sm text-soft-violet">Leads ready for outreach validation.</p>
        </div>
      </div>

      <div className="bg-slate rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
        <table className="min-w-full text-left text-sm text-mist">
          <thead className="bg-white/5 text-soft-violet uppercase tracking-wider font-semibold">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Company</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Score</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {leads.length ? leads.map(l => (
              <tr key={l.id} className="hover:bg-white/5 transition-colors group">
                <td className="px-6 py-4 font-bold text-white group-hover:text-lilac-mist">{l.name || "—"}</td>
                <td className="px-6 py-4">{l.company || "—"}</td>
                <td className="px-6 py-4">{l.role || "—"}</td>
                <td className="px-6 py-4 font-mono text-xs opacity-80">{l.email || "—"}</td>
                <td className="px-6 py-4">
                  {typeof l.score === "number" ? (
                    <span className={`px-2 py-1 rounded text-xs font-bold ${l.score >= 8 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/50'}`}>
                      {l.score}
                    </span>
                  ) : "—"}
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 rounded text-xs font-medium bg-white/5 border border-white/5 text-soft-violet">
                    {l.status || "New"}
                  </span>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-soft-violet italic">No leads found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}