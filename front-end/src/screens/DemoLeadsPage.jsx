// front-end/src/pages/DemoLeadsPage.jsx
import React, { useEffect, useState } from "react";
 import { API } from "../config";   //

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

  if (loading) return <div className="p-8">Loading leads…</div>;
  if (err) return <div className="p-8 text-red-600">Failed to load: {err}</div>;

return (
  <div className="p-8 max-w-6xl mx-auto">
    <h2 className="text-2xl font-bold text-white mb-4">Qualified Leads</h2>

    <div className="bg-white rounded-xl shadow overflow-hidden">
      <table className="min-w-full text-left text-sm text-slate-700">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Company</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Score</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {leads.length ? leads.map(l => (
            <tr key={l.id} className="border-t hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-[#0257AC]">{l.name || "—"}</td>
              <td className="px-4 py-3">{l.company || "—"}</td>
              <td className="px-4 py-3">{l.role || "—"}</td>
              <td className="px-4 py-3">{l.email || "—"}</td>
              <td className="px-4 py-3">{typeof l.score === "number" ? l.score : "—"}</td>
              <td className="px-4 py-3">{l.status || "New"}</td>
            </tr>
          )) : (
            <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No leads yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

}