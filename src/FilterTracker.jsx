import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vcdaqiftcriejbfzgorh.supabase.co";
const SUPABASE_KEY = "sb_publishable_DPqCcDi8N4Eafr-amA78aw_M8PaRO29";
const USER_ID = "ivan-default";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Keep Supabase alive by pinging every 5 days
const PING_KEY = "supabase-last-ping";
async function keepAlive() {
  const last = localStorage.getItem(PING_KEY);
  const fiveDays = 5 * 24 * 60 * 60 * 1000;
  if (last && Date.now() - parseInt(last) < fiveDays) return;
  try {
    await supabase.from("filters").select("id").limit(1);
    localStorage.setItem(PING_KEY, Date.now().toString());
  } catch (_) {}
}

const PRESET_FILTERS = {
  home: [
    { name: "Furnace / HVAC Filter", type: "time", defaultInterval: 90, unit: "days" },
    { name: "Water Filter (Fridge)", type: "time", defaultInterval: 180, unit: "days" },
    { name: "Under-Sink Water Filter", type: "time", defaultInterval: 180, unit: "days" },
    { name: "Whole-House Water Filter", type: "time", defaultInterval: 365, unit: "days" },
    { name: "PUR Water Pitcher Filter", type: "time", defaultInterval: 60, unit: "days" },
    { name: "Humidifier Filter", type: "time", defaultInterval: 60, unit: "days" },
    { name: "Air Purifier Filter", type: "time", defaultInterval: 180, unit: "days" },
    { name: "Range Hood Filter", type: "time", defaultInterval: 90, unit: "days" },
  ],
  auto: [
    { name: "Engine Air Filter", type: "mileage", defaultInterval: 15000, unit: "miles" },
    { name: "Cabin Air Filter", type: "mileage", defaultInterval: 15000, unit: "miles" },
    { name: "Oil Filter", type: "mileage", defaultInterval: 5000, unit: "miles" },
    { name: "Fuel Filter", type: "mileage", defaultInterval: 30000, unit: "miles" },
    { name: "Transmission Filter", type: "mileage", defaultInterval: 30000, unit: "miles" },
  ],
};

function getDaysUntilDue(filter) {
  if (filter.trackingType !== "time") return null;
  const last = new Date(filter.lastChanged);
  const due = new Date(last);
  due.setDate(due.getDate() + filter.intervalDays);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
}

function getMilesUntilDue(filter) {
  if (filter.trackingType !== "mileage") return null;
  return filter.lastMileage + filter.intervalMiles - (filter.currentMileage || filter.lastMileage);
}

function getStatus(filter) {
  if (filter.trackingType === "time") {
    const days = getDaysUntilDue(filter);
    if (days <= 0) return "overdue";
    if (days <= 7) return "due-soon";
    return "ok";
  } else {
    const miles = getMilesUntilDue(filter);
    if (miles <= 0) return "overdue";
    if (miles <= 500) return "due-soon";
    return "ok";
  }
}

const STATUS_CONFIG = {
  overdue: { label: "OVERDUE", color: "#ff4444", bg: "rgba(255,68,68,0.12)", dot: "#ff4444" },
  "due-soon": { label: "DUE SOON", color: "#ffaa00", bg: "rgba(255,170,0,0.12)", dot: "#ffaa00" },
  ok: { label: "OK", color: "#00cc88", bg: "rgba(0,204,136,0.08)", dot: "#00cc88" },
};

function FilterCard({ filter, onEdit, onDelete, onMarkReplaced }) {
  const status = getStatus(filter);
  const cfg = STATUS_CONFIG[status];

  let dueText = "";
  if (filter.trackingType === "time") {
    const days = getDaysUntilDue(filter);
    if (days < 0) dueText = `${Math.abs(days)} days overdue`;
    else if (days === 0) dueText = "Due today";
    else dueText = `Due in ${days} day${days !== 1 ? "s" : ""}`;
  } else {
    const miles = getMilesUntilDue(filter);
    if (miles < 0) dueText = `${Math.abs(miles).toLocaleString()} mi overdue`;
    else dueText = `${miles.toLocaleString()} mi remaining`;
  }

  return (
    <div style={{
      background: "#16181e",
      border: `1px solid ${status !== "ok" ? cfg.color + "55" : "#2a2d38"}`,
      borderRadius: 12, padding: "18px 20px",
      display: "flex", flexDirection: "column", gap: 10,
      position: "relative", transition: "border-color 0.2s",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>
            {filter.category === "auto" ? "🚗 Auto" : "🏠 Home"}
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: "#e8e8f0", lineHeight: 1.2 }}>
            {filter.name}
          </div>
          {filter.vehicleName && (
            <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{filter.vehicleName}</div>
          )}
        </div>
        <div style={{
          background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}44`,
          borderRadius: 6, padding: "3px 9px", fontSize: 10,
          fontFamily: "'DM Mono', monospace", fontWeight: 700, letterSpacing: 1.5,
          whiteSpace: "nowrap", flexShrink: 0,
        }}>
          {cfg.label}
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#888" }}>
        {filter.trackingType === "time" ? (
          <>
            <span>Last: {new Date(filter.lastChanged).toLocaleDateString()}</span>
            <span>Every {filter.intervalDays}d</span>
          </>
        ) : (
          <>
            <span>At: {filter.lastMileage.toLocaleString()} mi</span>
            <span>Every {filter.intervalMiles.toLocaleString()} mi</span>
            {filter.currentMileage && <span>Now: {filter.currentMileage.toLocaleString()} mi</span>}
          </>
        )}
      </div>

      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: cfg.color, fontWeight: 600 }}>
        {dueText}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button onClick={() => onMarkReplaced(filter.id)} style={{
          flex: 1, background: "#1e2030", border: "1px solid #2e3150",
          borderRadius: 7, color: "#a0a8d0", fontSize: 12, padding: "7px 0",
          cursor: "pointer", fontFamily: "'DM Mono', monospace", letterSpacing: 0.5, transition: "all 0.15s",
        }}
          onMouseOver={e => { e.target.style.background = "#252840"; e.target.style.color = "#fff"; }}
          onMouseOut={e => { e.target.style.background = "#1e2030"; e.target.style.color = "#a0a8d0"; }}
        >✓ Mark Replaced</button>
        <button onClick={() => onEdit(filter)} style={{
          background: "#1e2030", border: "1px solid #2e3150",
          borderRadius: 7, color: "#a0a8d0", fontSize: 12, padding: "7px 14px",
          cursor: "pointer", fontFamily: "'DM Mono', monospace", transition: "all 0.15s",
        }}
          onMouseOver={e => { e.target.style.background = "#252840"; e.target.style.color = "#fff"; }}
          onMouseOut={e => { e.target.style.background = "#1e2030"; e.target.style.color = "#a0a8d0"; }}
        >Edit</button>
        <button onClick={() => onDelete(filter.id)} style={{
          background: "#1e2030", border: "1px solid #2e3150",
          borderRadius: 7, color: "#664444", fontSize: 12, padding: "7px 14px",
          cursor: "pointer", fontFamily: "'DM Mono', monospace", transition: "all 0.15s",
        }}
          onMouseOver={e => { e.target.style.background = "#2a1e1e"; e.target.style.color = "#ff6666"; }}
          onMouseOut={e => { e.target.style.background = "#1e2030"; e.target.style.color = "#664444"; }}
        >✕</button>
      </div>
    </div>
  );
}

const emptyForm = {
  id: null, name: "", category: "home", trackingType: "time",
  intervalDays: 90, lastChanged: new Date().toISOString().split("T")[0],
  intervalMiles: 5000, lastMileage: 0, currentMileage: 0, vehicleName: "",
};

function Modal({ filter, onSave, onClose }) {
  const [form, setForm] = useState(filter || emptyForm);
  const [preset, setPreset] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePreset = (val) => {
    setPreset(val);
    if (!val) return;
    const allPresets = [...PRESET_FILTERS.home, ...PRESET_FILTERS.auto];
    const p = allPresets.find(x => x.name === val);
    if (p) {
      setForm(f => ({
        ...f, name: p.name,
        category: PRESET_FILTERS.home.includes(p) ? "home" : "auto",
        trackingType: p.type,
        intervalDays: p.unit === "days" ? p.defaultInterval : f.intervalDays,
        intervalMiles: p.unit === "miles" ? p.defaultInterval : f.intervalMiles,
      }));
    }
  };

  const valid = form.name.trim() &&
    (form.trackingType === "time"
      ? form.intervalDays > 0 && form.lastChanged
      : form.intervalMiles > 0 && form.lastMileage >= 0);

  const inputStyle = {
    background: "#0e1018", border: "1px solid #2a2d3a", borderRadius: 8,
    color: "#e0e0f0", padding: "9px 12px", fontSize: 13, width: "100%",
    fontFamily: "'DM Mono', monospace", outline: "none", boxSizing: "border-box",
  };
  const labelStyle = {
    fontSize: 11, color: "#666", fontFamily: "'DM Mono', monospace",
    letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 5, display: "block",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "#13151c", border: "1px solid #2a2d3a", borderRadius: 16,
        padding: 28, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: "#e8e8f0", marginBottom: 22 }}>
          {filter?.id ? "Edit Filter" : "Add Filter"}
        </div>

        {!filter?.id && (
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Quick Preset</label>
            <select value={preset} onChange={e => handlePreset(e.target.value)} style={inputStyle}>
              <option value="">— Select a preset —</option>
              <optgroup label="Home">
                {PRESET_FILTERS.home.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
              </optgroup>
              <optgroup label="Auto">
                {PRESET_FILTERS.auto.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
              </optgroup>
            </select>
          </div>
        )}

        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <label style={labelStyle}>Filter Name</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Furnace Filter" style={inputStyle} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Category</label>
              <select value={form.category} onChange={e => set("category", e.target.value)} style={inputStyle}>
                <option value="home">Home</option>
                <option value="auto">Auto</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Track By</label>
              <select value={form.trackingType} onChange={e => set("trackingType", e.target.value)} style={inputStyle}>
                <option value="time">Time</option>
                <option value="mileage">Mileage</option>
              </select>
            </div>
          </div>

          {form.trackingType === "time" ? (
            <>
              <div>
                <label style={labelStyle}>Replace Every (days)</label>
                <input type="number" value={form.intervalDays} onChange={e => set("intervalDays", +e.target.value)} style={inputStyle} min={1} />
              </div>
              <div>
                <label style={labelStyle}>Last Replaced</label>
                <input type="date" value={form.lastChanged} onChange={e => set("lastChanged", e.target.value)} style={inputStyle} />
              </div>
            </>
          ) : (
            <>
              {form.category === "auto" && (
                <div>
                  <label style={labelStyle}>Vehicle Name (optional)</label>
                  <input value={form.vehicleName} onChange={e => set("vehicleName", e.target.value)} placeholder="e.g. 2020 Mazda CX-30" style={inputStyle} />
                </div>
              )}
              <div>
                <label style={labelStyle}>Replace Every (miles)</label>
                <input type="number" value={form.intervalMiles} onChange={e => set("intervalMiles", +e.target.value)} style={inputStyle} min={1} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Mileage at Last Change</label>
                  <input type="number" value={form.lastMileage} onChange={e => set("lastMileage", +e.target.value)} style={inputStyle} min={0} />
                </div>
                <div>
                  <label style={labelStyle}>Current Mileage</label>
                  <input type="number" value={form.currentMileage} onChange={e => set("currentMileage", +e.target.value)} style={inputStyle} min={0} />
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button onClick={() => valid && onSave(form)} style={{
            flex: 1, background: valid ? "#3a4fd4" : "#1e2030",
            border: "none", borderRadius: 9, color: valid ? "#fff" : "#444",
            padding: "11px 0", fontFamily: "'Syne', sans-serif", fontWeight: 700,
            fontSize: 14, cursor: valid ? "pointer" : "default", transition: "all 0.15s",
          }}>
            {filter?.id ? "Save Changes" : "Add Filter"}
          </button>
          <button onClick={onClose} style={{
            background: "#1e2030", border: "1px solid #2e3150",
            borderRadius: 9, color: "#a0a8d0", padding: "11px 18px",
            fontFamily: "'DM Mono', monospace", fontSize: 13, cursor: "pointer",
          }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function FilterTracker() {
  const [filters, setFilters] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingFilter, setEditingFilter] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState("idle");

  const loadFilters = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("filters")
        .select("*")
        .eq("user_id", USER_ID)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setFilters((data || []).map(row => ({ id: row.id, ...row.data })));
    } catch (err) {
      console.error("Failed to load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    keepAlive();
    loadFilters();
  }, [loadFilters]);

  const persistFilter = async (filter) => {
    setSyncStatus("saving");
    const { id, ...data } = filter;
    try {
      const { error } = await supabase
        .from("filters")
        .upsert({ id, user_id: USER_ID, data, updated_at: new Date().toISOString() });
      if (error) throw error;
      setSyncStatus("saved");
      setTimeout(() => setSyncStatus("idle"), 2000);
    } catch (err) {
      console.error("Save failed:", err);
      setSyncStatus("error");
    }
  };

  const removeFilter = async (id) => {
    setSyncStatus("saving");
    try {
      const { error } = await supabase.from("filters").delete().eq("id", id);
      if (error) throw error;
      setFilters(fs => fs.filter(f => f.id !== id));
      setSyncStatus("saved");
      setTimeout(() => setSyncStatus("idle"), 2000);
    } catch (err) {
      console.error("Delete failed:", err);
      setSyncStatus("error");
    }
  };

  const saveFilter = async (form) => {
    const withId = form.id ? form : { ...form, id: Date.now().toString() };
    setFilters(fs => form.id ? fs.map(f => f.id === form.id ? withId : f) : [...fs, withId]);
    setShowModal(false);
    setEditingFilter(null);
    await persistFilter(withId);
  };

  const markReplaced = async (id) => {
    const updated = filters.map(f => {
      if (f.id !== id) return f;
      return f.trackingType === "time"
        ? { ...f, lastChanged: new Date().toISOString().split("T")[0] }
        : { ...f, lastMileage: f.currentMileage || f.lastMileage };
    });
    setFilters(updated);
    await persistFilter(updated.find(f => f.id === id));
  };

  const displayed = filters.filter(f => {
    if (activeTab === "all") return true;
    if (activeTab === "alerts") return getStatus(f) !== "ok";
    return f.category === activeTab;
  });

  const alertCount = filters.filter(f => getStatus(f) !== "ok").length;
  const overdueCount = filters.filter(f => getStatus(f) === "overdue").length;

  const tabs = [
    { id: "all", label: "All" },
    { id: "alerts", label: `Alerts${alertCount > 0 ? ` (${alertCount})` : ""}` },
    { id: "home", label: "Home" },
    { id: "auto", label: "Auto" },
  ];

  const syncLabel = syncStatus === "saving" ? "⟳ Saving..."
    : syncStatus === "saved" ? "✓ Saved to cloud"
    : syncStatus === "error" ? "⚠ Save failed"
    : "";

  return (
    <div style={{ minHeight: "100vh", background: "#0b0d12", fontFamily: "'DM Mono', monospace", color: "#e0e0f0", padding: "0 0 60px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0b0d12; }
        ::-webkit-scrollbar-thumb { background: #2a2d3a; border-radius: 3px; }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.4); }
        select option { background: #13151c; }
      `}</style>

      <div style={{ borderBottom: "1px solid #1a1d28", padding: "24px 24px 20px", position: "sticky", top: 0, background: "#0b0d12", zIndex: 10 }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color: "#e8e8f0", letterSpacing: -0.5 }}>
                Filter Tracker
              </div>
              <div style={{ fontSize: 11, color: "#555", letterSpacing: 2, textTransform: "uppercase", marginTop: 2 }}>
                {loading ? "Loading..." : `${filters.length} filter${filters.length !== 1 ? "s" : ""} tracked`}
                {overdueCount > 0 && <span style={{ color: "#ff4444", marginLeft: 12 }}>⚠ {overdueCount} overdue</span>}
                {syncLabel && <span style={{ marginLeft: 12, color: syncStatus === "error" ? "#ff4444" : syncStatus === "saved" ? "#00cc88" : "#888" }}>{syncLabel}</span>}
              </div>
            </div>
            <button onClick={() => { setEditingFilter(null); setShowModal(true); }} style={{
              background: "#3a4fd4", border: "none", borderRadius: 10, color: "#fff",
              padding: "10px 18px", fontFamily: "'Syne', sans-serif", fontWeight: 700,
              fontSize: 13, cursor: "pointer", transition: "background 0.15s",
            }}
              onMouseOver={e => e.currentTarget.style.background = "#4a5fe4"}
              onMouseOut={e => e.currentTarget.style.background = "#3a4fd4"}
            >+ Add Filter</button>
          </div>

          <div style={{ display: "flex", gap: 4, marginTop: 18 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                background: activeTab === t.id ? "#1e2030" : "transparent",
                border: activeTab === t.id ? "1px solid #3a4fd4" : "1px solid transparent",
                borderRadius: 7, color: activeTab === t.id ? "#a0b4ff" : "#555",
                padding: "6px 14px", fontFamily: "'DM Mono', monospace",
                fontSize: 12, cursor: "pointer", transition: "all 0.15s",
                ...(t.id === "alerts" && alertCount > 0 ? { color: activeTab === t.id ? "#ffaa00" : "#886600" } : {}),
              }}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 24px 0" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#444", fontSize: 13 }}>Loading your filters...</div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#444", fontSize: 13, lineHeight: 2 }}>
            {activeTab === "alerts" ? "✓ No filters need attention right now"
              : <><span>No filters yet. </span><span style={{ color: "#3a4fd4", cursor: "pointer" }} onClick={() => { setEditingFilter(null); setShowModal(true); }}>Add your first filter →</span></>}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {displayed
              .sort((a, b) => ({ overdue: 0, "due-soon": 1, ok: 2 }[getStatus(a)] - { overdue: 0, "due-soon": 1, ok: 2 }[getStatus(b)]))
              .map(f => (
                <FilterCard key={f.id} filter={f}
                  onEdit={f => { setEditingFilter(f); setShowModal(true); }}
                  onDelete={removeFilter}
                  onMarkReplaced={markReplaced}
                />
              ))}
          </div>
        )}

        {!loading && filters.length > 0 && (
          <div style={{ display: "flex", gap: 18, marginTop: 28, paddingTop: 20, borderTop: "1px solid #1a1d28" }}>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#555" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: v.dot }} />
                {v.label}
              </div>
            ))}
            <div style={{ marginLeft: "auto", fontSize: 11, color: "#444" }}>Alerts at 7 days / 500 mi</div>
          </div>
        )}
      </div>

      {showModal && (
        <Modal
          filter={editingFilter}
          onSave={saveFilter}
          onClose={() => { setShowModal(false); setEditingFilter(null); }}
        />
      )}
    </div>
  );
}
