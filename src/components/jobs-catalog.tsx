// src/components/JobsCatalog.tsx — drop into /agents between the rate card and "Hire · Sell · Trade".
// Same conventions as AgentRates.tsx. Every count and row comes from src/lib/jobs.ts.
"use client";
import { useState } from "react";
import { FAMILIES, JOBS_ASOF, jobCounts, type Job } from "@/lib/jobs";

const chip = (s: Job["status"]) => ({
  fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".02em", padding: "2px 7px", borderRadius: 6, whiteSpace: "nowrap",
  color: s === "live" ? "var(--ok, #1a8f4c)" : s === "draft" ? "var(--gold, #9a6700)" : "var(--muted)",
  background: s === "live" ? "rgba(26,143,76,.08)" : s === "draft" ? "#fff4d6" : "var(--page, #f7f6f3)",
  border: `1px solid ${s === "live" ? "rgba(26,143,76,.3)" : s === "draft" ? "rgba(154,103,0,.3)" : "var(--line)"}`,
} as React.CSSProperties);
const PROOF: Record<Job["proof"], string> = { verdict: "signed verdict · two methods agree", receipt: "signed receipt", doc: "deliverable · hash in receipt", approval: "needs-you card before send / spend" };

export default function JobsCatalog() {
  const [fam, setFam] = useState<string>("all");
  const [status, setStatus] = useState<"all" | Job["status"]>("all");
  const c = jobCounts();
  const fams = FAMILIES.filter(f => fam === "all" || f.key === fam);
  return (
    <section id="jobs" className="sec" style={{ padding: "72px 0" }}>
      <div className="wrap">
        <div style={{ maxWidth: 820 }}>
          <div className="eyebrow-v2">What an agent can be assigned · {JOBS_ASOF}</div>
          <h2 className="h" style={{ fontSize: "clamp(30px, 4.4vw, 44px)", marginTop: 12 }}>
            {c.total} jobs in {c.families} families. {c.live} listable today.
          </h2>
          <p className="p" style={{ marginTop: 12, maxWidth: 680 }}>
            Everything the market assigns to agents right now, from agent-to-agent calls priced in fractions of a cent to
            outcomes priced per resolution. Each row says what you send, what comes back, and what proof it carries. The
            chip is honest: <span style={chip("live")}>live</span> is sellable over x402 or MCP today,{" "}
            <span style={chip("draft")}>draft</span> is built or wrapped and not yet listed, <span style={chip("planned")}>planned</span> is in the plan.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 22, alignItems: "center" }} role="tablist" aria-label="family">
          <button type="button" onClick={() => setFam("all")} className="mono-v2" style={{ fontSize: 11, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line)", background: fam === "all" ? "var(--ink, #14141a)" : "#fff", color: fam === "all" ? "#fff" : "inherit" }}>all · {c.total}</button>
          {FAMILIES.map(f => (
            <button key={f.key} type="button" onClick={() => setFam(f.key)} className="mono-v2" style={{ fontSize: 11, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line)", background: fam === f.key ? "var(--ink, #14141a)" : "#fff", color: fam === f.key ? "#fff" : "inherit" }}>{f.title} · {f.jobs.length}</button>
          ))}
          <span style={{ flex: 1 }} />
          {(["all", "live", "draft", "planned"] as const).map(s => (
            <button key={s} type="button" onClick={() => setStatus(s)} className="mono-v2" style={{ fontSize: 11, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line)", background: status === s ? "var(--ink, #14141a)" : "#fff", color: status === s ? "#fff" : "inherit" }}>{s}{s !== "all" ? ` · ${c[s]}` : ""}</button>
          ))}
        </div>

        {fams.map(f => {
          const rows = f.jobs.filter(j => status === "all" || j.status === status);
          if (!rows.length) return null;
          return (
            <div key={f.key} style={{ marginTop: 22, background: "var(--background, #fff)", border: "1px solid var(--line)", borderRadius: 18, overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, padding: "18px 20px 12px" }}>
                <div style={{ fontWeight: 650, fontSize: 18 }}>{f.title} <span className="mono-v2" style={{ fontSize: 11, color: "var(--muted-2)", marginLeft: 8 }}>{rows.length} of {f.jobs.length}</span></div>
                <p className="p" style={{ margin: 0, fontSize: 13, maxWidth: 560, textAlign: "right" }}>{f.lede}</p>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820, tableLayout: "fixed" }}>
                  <colgroup><col style={{ width: "26%" }} /><col style={{ width: "20%" }} /><col style={{ width: "26%" }} /><col style={{ width: "14%" }} /><col style={{ width: "7%" }} /><col style={{ width: "7%" }} /></colgroup>
                  <thead><tr>{["JOB", "YOU SEND", "IT RETURNS", "PROOF", "UNIT", "STATUS"].map(h => <th key={h} style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: ".04em", color: "var(--muted-2)", textAlign: "left", padding: "10px 14px", borderBottom: "1px solid var(--line)", fontWeight: 500 }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {rows.map(j => (
                      <tr key={j.job}>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line)", fontSize: 13.5, fontWeight: 600, verticalAlign: "top" }}>{j.job}</td>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line)", fontSize: 13, color: "var(--muted)", verticalAlign: "top" }}>{j.send}</td>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line)", fontSize: 13, color: "var(--muted)", verticalAlign: "top" }}>{j.back}</td>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line)", fontSize: 11.5, color: "var(--muted-2)", verticalAlign: "top", fontFamily: "var(--font-mono)" }}>{PROOF[j.proof]}</td>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line)", fontSize: 12, color: "var(--muted)", verticalAlign: "top" }}>{j.unit}</td>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line)", verticalAlign: "top" }}><span style={chip(j.status)}>{j.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
        <p className="mono-v2" style={{ fontSize: 10.5, color: "var(--muted-2)", marginTop: 12 }}>
          jobs.json carries this catalogue for machines · prices for live rows are on the rate card above · a job turns live only after its exam bank passes and the capability gate lists it
        </p>
      </div>
    </section>
  );
}
