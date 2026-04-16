import { useState } from "react";

/* =============================================================
   CONFIGURATION SUPABASE
   Remplace ces 2 valeurs avec celles de ton projet Supabase.
   Tu les trouves dans : Settings > API dans ton dashboard Supabase.
   ============================================================= */
const SUPABASE_URL = "https://bdbfmhwlstbpjxfxbsem.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkYmZtaHdsc3RicGp4Znhic2VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyODUyOTQsImV4cCI6MjA5MTg2MTI5NH0.j4hpZwhVE7Pg9jvHzALtGaa3KYmTLsE8ZIBgOocmXZ8";

const ADMIN_EMAIL = "zacharylabelle8@gmail.com";

const GRADES = {
  vendeur: {
    label: "Vendeur",
    emoji: "📞",
    color: "#3B82F6",
    perClientSigne: 150,
    meetBonus: { every: 5, amount: 100 },
    perMeet: 0,
    teamMarginClient: 0,
    teamMarginMeet: 0,
    perVenteEnMeet: 0,
    promoCondition: "20 meets obtenus",
    promoMeets: 20,
  },
  responsable: {
    label: "Responsable de Vente",
    emoji: "🏆",
    color: "#F59E0B",
    perClientSigne: 100,
    meetBonus: null,
    perMeet: 40,
    teamMarginClient: 50,
    teamMarginMeet: 10,
    perVenteEnMeet: 100,
    promoCondition: null,
  },
};

const WEEKLY_CHALLENGES = [
  { meets: 10, bonus: 150, label: "Semaine Solide" },
  { meets: 20, bonus: 400, label: "Semaine Explosive" },
  { meets: 30, bonus: 800, label: "Semaine Legendaire" },
];

function formatMoney(n) {
  return n.toLocaleString("fr-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 0 });
}

/* ===== SUPABASE API HELPERS ===== */
async function supabaseAuth(endpoint, body) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || data.message || "Erreur inconnue");
  return data;
}

async function supabaseLoad(userId, token) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tracker_data?user_id=eq.${userId}&select=data`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows.length > 0 ? rows[0].data : null;
}

async function supabaseSave(userId, token, trackerData) {
  await fetch(`${SUPABASE_URL}/rest/v1/tracker_data`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({ user_id: userId, data: trackerData, updated_at: new Date().toISOString() }),
  });
}

async function supabaseLoadAll(token) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tracker_data?select=user_id,data,updated_at&order=updated_at.desc`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return await res.json();
}

/* ===== UI COMPONENTS ===== */
function ProgressBar({ value, max, color = "#3B82F6", height = 12 }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ width: "100%", background: "#1F2937", borderRadius: height / 2, height, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${color}, ${color}dd)`, borderRadius: height / 2, transition: "width 0.5s ease", boxShadow: `0 0 8px ${color}66` }} />
    </div>
  );
}

function StatCard({ label, value, sub, icon, color = "#3B82F6" }) {
  return (
    <div
      style={{ background: "linear-gradient(135deg, #1F2937, #111827)", border: `1px solid ${color}33`, borderRadius: 16, padding: "20px 16px", textAlign: "center", transition: "all 0.2s ease", minWidth: 0 }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = `${color}88`; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = `${color}33`; }}
    >
      <div style={{ fontSize: 28, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: "monospace" }}>{value}</div>
      <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4, fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #374151",
  background: "#111827", color: "#F3F4F6", fontSize: 16, outline: "none", marginBottom: 8,
};

function Modal({ show, onClose, title, color, children }) {
  if (!show) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 0 }} onClick={onClose}>
      <div className="modal-box" style={{ background: "#1F2937", borderRadius: "20px 20px 0 0", padding: 24, maxWidth: 420, width: "100%", border: `2px solid ${color}44`, borderBottom: "none", position: "relative", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: "absolute", top: 12, right: 16, background: "none", border: "none", color: "#6B7280", fontSize: 22, cursor: "pointer", padding: 8 }}>✕</button>
        <div style={{ fontSize: 18, fontWeight: 800, color, marginBottom: 16, paddingRight: 30 }}>{title}</div>
        {children}
      </div>
    </div>
  );
}

function TeamMemberRow({ member, grade, onAddMeet, onAddClient }) {
  const g = GRADES[grade];
  const [expanded, setExpanded] = useState(false);
  const memberMeetGains = member.meetsList.length * g.teamMarginMeet;
  const memberClientGains = member.clientsList.length * g.teamMarginClient;
  const memberTotalGains = memberMeetGains + memberClientGains;
  return (
    <div style={{ background: "#1F2937", borderRadius: 12, padding: "12px 16px", marginBottom: 10 }}>
      <div className="team-row-inner" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 120, cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg, ${g.color}44, ${g.color}22)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 700, color: g.color, flexShrink: 0 }}>
            {member.name.charAt(0)}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#F3F4F6" }}>{member.name}</div>
            <div style={{ fontSize: 11, color: "#6B7280" }}>{member.meetsList.length} meets · {member.clientsList.length} clients signes</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#10B981", fontFamily: "monospace" }}>{formatMoney(memberTotalGains)} de marge</div>
          </div>
        </div>
        <div className="team-row-buttons" style={{ display: "flex", gap: 6 }}>
          <button onClick={() => onAddMeet(member.id)} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #374151", background: "#111827", color: "#9CA3AF", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>+1 Meet</button>
          <button onClick={() => onAddClient(member.id)} style={{ padding: "10px 14px", borderRadius: 8, border: `1px solid ${g.color}66`, background: `${g.color}11`, color: g.color, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>+1 Client signe</button>
        </div>
      </div>
      {(member.meetsList.length > 0 || member.clientsList.length > 0) && (
        <div style={{ display: "flex", gap: 12, marginTop: 10, paddingTop: 8, borderTop: "1px solid #374151" }}>
          <div style={{ fontSize: 11, color: "#06B6D4" }}>{member.meetsList.length} meets = {formatMoney(memberMeetGains)}</div>
          <div style={{ fontSize: 11, color: "#10B981" }}>{member.clientsList.length} clients = {formatMoney(memberClientGains)}</div>
        </div>
      )}
      {expanded && (member.meetsList.length > 0 || member.clientsList.length > 0) && (
        <div style={{ marginTop: 8, borderTop: "1px solid #37415166", paddingTop: 8 }}>
          {member.meetsList.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 4, textTransform: "uppercase" }}>Meets</div>
              {member.meetsList.map((m, i) => (
                <div key={i} style={{ fontSize: 12, color: "#9CA3AF", padding: "3px 0", display: "flex", justifyContent: "space-between" }}>
                  <span>{m.prenom} {m.nom}</span><span style={{ color: "#6B7280" }}>{m.date} {m.heure}</span>
                </div>
              ))}
            </div>
          )}
          {member.clientsList.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 4, textTransform: "uppercase" }}>Clients signes</div>
              {member.clientsList.map((c, i) => (
                <div key={i} style={{ fontSize: 12, color: "#9CA3AF", padding: "3px 0", display: "flex", justifyContent: "space-between" }}>
                  <span>{c.prenom} {c.nom}</span><span style={{ color: "#6B7280" }}>{c.compagnie}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AdminUserRow({ prenom, nom, email, grade, gradeInfo, meets, clients, ventes, teamSize, teamClients, teamMeets, conversion, totalGains, lastActive, meetsList, clientsList }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ background: "#111827", borderRadius: 12, padding: "14px 16px", marginBottom: 10, border: `1px solid ${gradeInfo.color}22` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg, ${gradeInfo.color}44, ${gradeInfo.color}22)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: gradeInfo.color, flexShrink: 0 }}>
            {prenom.charAt(0)}{nom.charAt(0)}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#F3F4F6" }}>{prenom} {nom}</div>
            <div style={{ fontSize: 12, color: "#6B7280" }}>{email}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 14 }}>{gradeInfo.emoji}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: gradeInfo.color }}>{gradeInfo.label}</span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#10B981", fontFamily: "monospace" }}>{formatMoney(totalGains)}</div>
          <div style={{ fontSize: 11, color: "#6B7280" }}>Dernier acces: {lastActive}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 10, paddingTop: 10, borderTop: "1px solid #1F2937", flexWrap: "wrap" }}>
        <div style={{ fontSize: 12, color: "#F59E0B" }}>{meets} meets</div>
        <div style={{ fontSize: 12, color: "#10B981" }}>{clients} clients</div>
        <div style={{ fontSize: 12, color: "#8B5CF6" }}>{ventes} ventes meet</div>
        <div style={{ fontSize: 12, color: "#06B6D4" }}>{teamSize} equipe</div>
        <div style={{ fontSize: 12, color: "#9CA3AF" }}>{conversion}% conversion</div>
      </div>
      {expanded && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #1F2937" }}>
          {grade === "responsable" && teamSize > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#F59E0B", marginBottom: 4 }}>Equipe: {teamClients} clients, {teamMeets} meets</div>
            </div>
          )}
          {meetsList.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 4, textTransform: "uppercase" }}>Meets ({meetsList.length})</div>
              {meetsList.slice(-10).reverse().map((m, i) => (
                <div key={i} style={{ fontSize: 12, color: "#9CA3AF", padding: "3px 0", display: "flex", justifyContent: "space-between" }}>
                  <span>{m.prenom} {m.nom}</span><span style={{ color: "#6B7280" }}>{m.date} {m.heure}</span>
                </div>
              ))}
            </div>
          )}
          {clientsList.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 4, textTransform: "uppercase" }}>Clients signes ({clientsList.length})</div>
              {clientsList.slice(-10).reverse().map((c, i) => (
                <div key={i} style={{ fontSize: 12, color: "#9CA3AF", padding: "3px 0", display: "flex", justifyContent: "space-between" }}>
                  <span>{c.prenom} {c.nom}</span><span style={{ color: "#6B7280" }}>{c.compagnie}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getDefaultData() {
  return { grade: "vendeur", meetsList: [], clientsList: [], ventesList: [], team: [], weeklyMeets: 0, history: [] };
}

/* ===== MAIN APP ===== */
export default function SalesTracker() {
  const isConfigured = SUPABASE_URL !== "VOTRE_URL_SUPABASE" && SUPABASE_ANON_KEY !== "VOTRE_CLE_ANON_SUPABASE";

  /* ===== AUTH STATE ===== */
  const [session, setSession] = useState(null); // { access_token, user: { id, user_metadata: { prenom, nom } } }
  const [authScreen, setAuthScreen] = useState("login");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({ prenom: "", nom: "", email: "", password: "", confirmPassword: "" });
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState("saved"); // "saved" | "saving" | "error"

  /* ===== TRACKER STATE ===== */
  const [grade, setGrade] = useState("vendeur");
  const [meetsList, setMeetsList] = useState([]);
  const [clientsList, setClientsList] = useState([]);
  const [ventesList, setVentesList] = useState([]);
  const [team, setTeam] = useState([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [showPromo, setShowPromo] = useState(false);
  const [weeklyMeets, setWeeklyMeets] = useState(0);
  const [showAddMember, setShowAddMember] = useState(false);
  const [activeTab, setActiveTab] = useState("guide");
  const [history, setHistory] = useState([]);

  /* ===== ADMIN STATE ===== */
  const [adminData, setAdminData] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const isAdmin = session?.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const [showMeetModal, setShowMeetModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showVenteModal, setShowVenteModal] = useState(false);
  const [showTeamMeetModal, setShowTeamMeetModal] = useState(null);
  const [showTeamClientModal, setShowTeamClientModal] = useState(null);
  const [meetForm, setMeetForm] = useState({ prenom: "", nom: "", date: "", heure: "" });
  const [clientForm, setClientForm] = useState({ prenom: "", nom: "", compagnie: "" });
  const [venteForm, setVenteForm] = useState({ prenom: "", nom: "", compagnie: "" });

  /* ===== HELPERS ===== */
  const currentPrenom = session?.user?.user_metadata?.prenom || "";
  const currentNom = session?.user?.user_metadata?.nom || "";

  const saveData = async (data) => {
    if (!session) return;
    setSaveStatus("saving");
    try {
      await supabaseSave(session.user.id, session.access_token, data);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  };

  const loadUserData = (data) => {
    if (!data) return;
    setGrade(data.grade || "vendeur");
    setMeetsList(data.meetsList || []);
    setClientsList(data.clientsList || []);
    setVentesList(data.ventesList || []);
    setTeam(data.team || []);
    setWeeklyMeets(data.weeklyMeets || 0);
    setHistory(data.history || []);
  };

  const resetTracker = () => {
    setGrade("vendeur"); setMeetsList([]); setClientsList([]); setVentesList([]);
    setTeam([]); setWeeklyMeets(0); setHistory([]); setNewMemberName("");
    setShowAddMember(false); setActiveTab("guide");
  };

  const buildSavePayload = (overrides = {}) => ({
    grade, meetsList, clientsList, ventesList, team, weeklyMeets, history,
    userPrenom: currentPrenom, userNom: currentNom, userEmail: session?.user?.email || "",
    ...overrides,
  });

  /* ===== AUTH HANDLERS ===== */
  const handleLogin = async () => {
    setAuthLoading(true); setAuthError("");
    try {
      const data = await supabaseAuth("token?grant_type=password", {
        email: loginForm.email.toLowerCase().trim(),
        password: loginForm.password,
      });
      // Load tracker data
      const saved = await supabaseLoad(data.user.id, data.access_token);
      if (saved) {
        loadUserData(saved);
        // Update user info if missing
        if (!saved.userEmail) {
          const updatedData = { ...saved, userPrenom: data.user.user_metadata?.prenom || "", userNom: data.user.user_metadata?.nom || "", userEmail: data.user.email || "" };
          await supabaseSave(data.user.id, data.access_token, updatedData);
        }
      } else resetTracker();
      setSession(data);
      setLoginForm({ email: "", password: "" });
    } catch (e) {
      const msg = e.message || "";
      if (msg.includes("Invalid login")) setAuthError("Email ou mot de passe incorrect");
      else setAuthError(msg);
    }
    setAuthLoading(false);
  };

  const handleSignup = async () => {
    const email = signupForm.email.toLowerCase().trim();
    if (!signupForm.prenom.trim() || !signupForm.nom.trim()) { setAuthError("Prenom et nom sont requis"); return; }
    if (!email) { setAuthError("Email est requis"); return; }
    if (signupForm.password.length < 6) { setAuthError("Le mot de passe doit avoir au moins 6 caracteres"); return; }
    if (signupForm.password !== signupForm.confirmPassword) { setAuthError("Les mots de passe ne correspondent pas"); return; }

    setAuthLoading(true); setAuthError("");
    try {
      const data = await supabaseAuth("signup", {
        email,
        password: signupForm.password,
        data: { prenom: signupForm.prenom.trim(), nom: signupForm.nom.trim() },
      });
      // If Supabase returns a session (email confirmation disabled)
      if (data.access_token) {
        resetTracker();
        const defaultData = { ...getDefaultData(), userPrenom: signupForm.prenom.trim(), userNom: signupForm.nom.trim(), userEmail: email };
        await supabaseSave(data.user.id, data.access_token, defaultData);
        setSession(data);
      } else if (data.user && !data.session) {
        // Email confirmation required — auto-login
        const loginData = await supabaseAuth("token?grant_type=password", { email, password: signupForm.password });
        resetTracker();
        const defaultData = { ...getDefaultData(), userPrenom: signupForm.prenom.trim(), userNom: signupForm.nom.trim(), userEmail: email };
        await supabaseSave(loginData.user.id, loginData.access_token, defaultData);
        setSession(loginData);
      }
      setSignupForm({ prenom: "", nom: "", email: "", password: "", confirmPassword: "" });
    } catch (e) {
      const msg = e.message || "";
      if (msg.includes("already registered") || msg.includes("already been registered")) setAuthError("Cet email est deja utilise");
      else setAuthError(msg);
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    if (session) {
      setSaveStatus("saving");
      try {
        await supabaseSave(session.user.id, session.access_token, buildSavePayload());
        setSaveStatus("saved");
      } catch { /* ok */ }
    }
    setSession(null);
    resetTracker();
    setAuthScreen("login");
  };

  /* ===== ADMIN LOGIC ===== */
  const loadAdminData = async () => {
    if (!isAdmin || !session) return;
    setAdminLoading(true);
    try {
      const rows = await supabaseLoadAll(session.access_token);
      setAdminData(rows || []);
    } catch { setAdminData([]); }
    setAdminLoading(false);
  };

  /* ===== TRACKER LOGIC ===== */
  const meets = meetsList.length;
  const clientsSignes = clientsList.length;
  const ventesEnMeet = ventesList.length;
  const g = GRADES[grade];
  const totalTeamClients = team.reduce((s, m) => s + m.clientsList.length, 0);
  const totalTeamMeets = team.reduce((s, m) => s + m.meetsList.length, 0);
  const conversionRate = meets > 0 ? Math.round((clientsSignes / meets) * 100) : 0;

  const gainsClients = clientsSignes * g.perClientSigne;
  const gainsMeets = g.meetBonus ? Math.floor(meets / g.meetBonus.every) * g.meetBonus.amount : meets * g.perMeet;
  const gainsTeamClients = totalTeamClients * g.teamMarginClient;
  const gainsTeamMeets = totalTeamMeets * g.teamMarginMeet;
  const gainsVentesMeet = ventesEnMeet * g.perVenteEnMeet;
  const weeklyBonus = WEEKLY_CHALLENGES.filter((c) => weeklyMeets >= c.meets).reduce((s, c) => s + c.bonus, 0);
  const totalGains = gainsClients + gainsMeets + gainsTeamClients + gainsTeamMeets + gainsVentesMeet + weeklyBonus;

  const canPromote = grade === "vendeur" && meets >= GRADES.vendeur.promoMeets;
  const promoProgress = grade === "vendeur" ? meets / GRADES.vendeur.promoMeets : 1;

  const resetMeetForm = () => setMeetForm({ prenom: "", nom: "", date: "", heure: "" });
  const resetClientForm = () => setClientForm({ prenom: "", nom: "", compagnie: "" });
  const resetVenteForm = () => setVenteForm({ prenom: "", nom: "", compagnie: "" });

  const promote = () => {
    if (grade !== "vendeur") return;
    setGrade("responsable"); setShowPromo(true); setWeeklyMeets(0);
    setTimeout(() => setShowPromo(false), 4000);
    saveData(buildSavePayload({ grade: "responsable", weeklyMeets: 0 }));
  };

  const handleSubmitMeet = () => {
    if (!meetForm.prenom.trim() || !meetForm.nom.trim()) return;
    const newMeet = { ...meetForm, id: Date.now() };
    const newMeetsList = [...meetsList, newMeet];
    const newWeekly = weeklyMeets + 1;
    const amount = g.meetBonus ? (((meets + 1) % g.meetBonus.every === 0) ? g.meetBonus.amount : 0) : g.perMeet;
    const newHistory = [{ type: "meet", amount, detail: `${meetForm.prenom} ${meetForm.nom}`, sub: `${meetForm.date} ${meetForm.heure}`, date: new Date().toLocaleString("fr-CA"), id: Date.now() }, ...history].slice(0, 80);
    setMeetsList(newMeetsList); setWeeklyMeets(newWeekly); setHistory(newHistory);
    resetMeetForm(); setShowMeetModal(false);
    saveData(buildSavePayload({ meetsList: newMeetsList, weeklyMeets: newWeekly, history: newHistory }));
  };

  const handleSubmitClient = () => {
    if (!clientForm.prenom.trim() || !clientForm.nom.trim()) return;
    const newClient = { ...clientForm, id: Date.now() };
    const newClientsList = [...clientsList, newClient];
    const newHistory = [{ type: "client", amount: g.perClientSigne, detail: `${clientForm.prenom} ${clientForm.nom}`, sub: clientForm.compagnie, date: new Date().toLocaleString("fr-CA"), id: Date.now() }, ...history].slice(0, 80);
    setClientsList(newClientsList); setHistory(newHistory);
    resetClientForm(); setShowClientModal(false);
    saveData(buildSavePayload({ clientsList: newClientsList, history: newHistory }));
  };

  const handleSubmitVente = () => {
    if (!venteForm.prenom.trim() || !venteForm.nom.trim()) return;
    const newVente = { ...venteForm, id: Date.now() };
    const newVentesList = [...ventesList, newVente];
    const newHistory = [{ type: "vente_meet", amount: g.perVenteEnMeet, detail: `${venteForm.prenom} ${venteForm.nom}`, sub: venteForm.compagnie, date: new Date().toLocaleString("fr-CA"), id: Date.now() }, ...history].slice(0, 80);
    setVentesList(newVentesList); setHistory(newHistory);
    resetVenteForm(); setShowVenteModal(false);
    saveData(buildSavePayload({ ventesList: newVentesList, history: newHistory }));
  };

  const addTeamMember = () => {
    if (!newMemberName.trim()) return;
    const newTeam = [...team, { id: Date.now(), name: newMemberName.trim(), meetsList: [], clientsList: [] }];
    setTeam(newTeam); setNewMemberName(""); setShowAddMember(false);
    saveData(buildSavePayload({ team: newTeam }));
  };

  const handleTeamMeetSubmit = () => {
    if (!meetForm.prenom.trim() || !meetForm.nom.trim()) return;
    const mid = showTeamMeetModal;
    const newTeam = team.map((m) => m.id === mid ? { ...m, meetsList: [...m.meetsList, { ...meetForm, id: Date.now() }] } : m);
    const memberName = team.find((m) => m.id === mid)?.name || "";
    const newHistory = [{ type: "team_meet", amount: g.teamMarginMeet, detail: `${meetForm.prenom} ${meetForm.nom}`, sub: `Meet par ${memberName} — ${meetForm.date} ${meetForm.heure}`, date: new Date().toLocaleString("fr-CA"), id: Date.now() }, ...history].slice(0, 80);
    setTeam(newTeam); setHistory(newHistory);
    resetMeetForm(); setShowTeamMeetModal(null);
    saveData(buildSavePayload({ team: newTeam, history: newHistory }));
  };

  const handleTeamClientSubmit = () => {
    if (!clientForm.prenom.trim() || !clientForm.nom.trim()) return;
    const mid = showTeamClientModal;
    const newTeam = team.map((m) => m.id === mid ? { ...m, clientsList: [...m.clientsList, { ...clientForm, id: Date.now() }] } : m);
    const memberName = team.find((m) => m.id === mid)?.name || "";
    const newHistory = [{ type: "team_client", amount: g.teamMarginClient, detail: `${clientForm.prenom} ${clientForm.nom}`, sub: `Signe par ${memberName} — ${clientForm.compagnie}`, date: new Date().toLocaleString("fr-CA"), id: Date.now() }, ...history].slice(0, 80);
    setTeam(newTeam); setHistory(newHistory);
    resetClientForm(); setShowTeamClientModal(null);
    saveData(buildSavePayload({ team: newTeam, history: newHistory }));
  };

  const tabs = [
    { id: "guide", label: "Comment ca marche" },
    { id: "dashboard", label: "Mon tracker" },
    { id: "team", label: "Equipe" },
    { id: "history", label: "Historique" },
    ...(isAdmin ? [{ id: "admin", label: "Admin" }] : []),
  ];

  const globalStyles = `
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    @keyframes slideDown { from{transform:translateY(-100%);opacity:0} to{transform:translateY(0);opacity:1} }
    @keyframes glow { 0%,100%{box-shadow:0 0 20px #F59E0B44} 50%{box-shadow:0 0 40px #F59E0B88} }
    @keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    @keyframes spin { to{transform:rotate(360deg)} }
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    button:active { transform: scale(0.96) !important; }
    input::placeholder { color: #4B5563; }
    @media (max-width: 600px) {
      .grid-actions { grid-template-columns: 1fr !important; }
      .grid-actions-3 { grid-template-columns: 1fr !important; }
      .grid-stats { grid-template-columns: 1fr 1fr !important; }
      .grid-grille-3 { grid-template-columns: 1fr !important; }
      .grid-grille-2 { grid-template-columns: 1fr !important; }
      .grid-lists { grid-template-columns: 1fr !important; }
      .grid-challenge { flex-direction: column !important; }
      .team-row-inner { flex-direction: column !important; align-items: flex-start !important; }
      .team-row-buttons { width: 100% !important; }
      .team-row-buttons button { flex: 1 !important; }
      .modal-box { margin: 8px !important; max-width: 100% !important; border-radius: 16px !important; }
      .tab-bar button { font-size: 11px !important; padding: 10px 4px !important; }
      .header-total { font-size: 26px !important; }
      .summary-flex { gap: 16px !important; }
      .auth-box { margin: 8px !important; }
    }
  `;

  /* ============================================================ */
  /* ================= SETUP SCREEN (no config) ================= */
  /* ============================================================ */
  if (!isConfigured) {
    return (
      <div style={{ minHeight: "100vh", background: "#0B0F19", color: "#F3F4F6", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <style>{globalStyles}</style>
        <div style={{ width: "100%", maxWidth: 560, animation: "fadeIn 0.4s ease" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🔧</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#F3F4F6" }}>Configuration requise</div>
            <div style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>Connecte l'app a Supabase pour sauvegarder les donnees en ligne</div>
          </div>
          <div style={{ background: "linear-gradient(135deg, #1F2937, #111827)", borderRadius: 20, padding: 28, border: "1px solid #374151" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#3B82F6", marginBottom: 20 }}>Instructions de setup (5 minutes)</div>
            {[
              { step: "1", title: "Creer un compte Supabase (gratuit)", desc: "Va sur supabase.com et cree un compte gratuit. Puis cree un nouveau projet." },
              { step: "2", title: "Creer la table de donnees", desc: "Dans ton projet Supabase, va dans SQL Editor et execute le code SQL fourni dans le fichier setup.sql." },
              { step: "3", title: "Desactiver la confirmation email", desc: "Va dans Authentication > Providers > Email et desactive \"Confirm email\". Ca permet aux vendeurs de s'inscrire sans confirmer par email." },
              { step: "4", title: "Copier l'URL et la cle API", desc: "Va dans Settings > API. Copie le Project URL et la cle anon (sous \"Project API keys\")." },
              { step: "5", title: "Coller dans le code", desc: "Ouvre sales-tracker.jsx et remplace VOTRE_URL_SUPABASE et VOTRE_CLE_ANON_SUPABASE en haut du fichier avec tes valeurs." },
            ].map((item) => (
              <div key={item.step} style={{ display: "flex", gap: 14, marginBottom: 20 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#3B82F622", border: "1px solid #3B82F644", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#3B82F6", flexShrink: 0 }}>{item.step}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#F3F4F6" }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================ */
  /* =================== AUTH SCREENS =========================== */
  /* ============================================================ */
  if (!session) {
    return (
      <div style={{ minHeight: "100vh", background: "#0B0F19", color: "#F3F4F6", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <style>{globalStyles}</style>
        <div className="auth-box" style={{ width: "100%", maxWidth: 420, animation: "fadeIn 0.4s ease" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>📊</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#F3F4F6" }}>Sales Tracker</div>
            <div style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>Connecte-toi pour tracker tes performances</div>
          </div>
          <div style={{ background: "linear-gradient(135deg, #1F2937, #111827)", borderRadius: 20, padding: 28, border: "1px solid #374151" }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#0B0F19", borderRadius: 12, padding: 4 }}>
              <button onClick={() => { setAuthScreen("login"); setAuthError(""); }} style={{ flex: 1, padding: "12px 8px", borderRadius: 10, border: "none", background: authScreen === "login" ? "#3B82F6" : "transparent", color: authScreen === "login" ? "#000" : "#6B7280", fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all 0.2s" }}>Connexion</button>
              <button onClick={() => { setAuthScreen("signup"); setAuthError(""); }} style={{ flex: 1, padding: "12px 8px", borderRadius: 10, border: "none", background: authScreen === "signup" ? "#10B981" : "transparent", color: authScreen === "signup" ? "#000" : "#6B7280", fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all 0.2s" }}>Creer un compte</button>
            </div>

            {authError && (
              <div style={{ background: "#EF444422", border: "1px solid #EF444466", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#F87171", fontWeight: 600 }}>{authError}</div>
            )}

            {authScreen === "login" && (
              <div>
                <label style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600, marginBottom: 4, display: "block" }}>Email</label>
                <input style={inputStyle} type="email" placeholder="ton@email.com" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} onKeyDown={(e) => e.key === "Enter" && !authLoading && handleLogin()} autoFocus />
                <label style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600, marginBottom: 4, display: "block", marginTop: 8 }}>Mot de passe</label>
                <input style={inputStyle} type="password" placeholder="Ton mot de passe" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} onKeyDown={(e) => e.key === "Enter" && !authLoading && handleLogin()} />
                <button onClick={handleLogin} disabled={authLoading || !loginForm.email.trim() || !loginForm.password} style={{
                  width: "100%", padding: 16, borderRadius: 12, border: "none", marginTop: 12,
                  background: (!authLoading && loginForm.email.trim() && loginForm.password) ? "linear-gradient(135deg, #3B82F6, #2563EB)" : "#374151",
                  color: (!authLoading && loginForm.email.trim() && loginForm.password) ? "#FFF" : "#6B7280",
                  fontWeight: 800, fontSize: 16, cursor: (!authLoading && loginForm.email.trim() && loginForm.password) ? "pointer" : "not-allowed",
                }}>
                  {authLoading ? "Connexion..." : "Se connecter"}
                </button>
                <div style={{ textAlign: "center", marginTop: 16 }}>
                  <span style={{ fontSize: 13, color: "#6B7280" }}>Pas encore de compte? </span>
                  <button onClick={() => { setAuthScreen("signup"); setAuthError(""); }} style={{ background: "none", border: "none", color: "#10B981", fontWeight: 700, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>Creer un compte</button>
                </div>
              </div>
            )}

            {authScreen === "signup" && (
              <div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600, marginBottom: 4, display: "block" }}>Prenom</label>
                    <input style={inputStyle} placeholder="Ton prenom" value={signupForm.prenom} onChange={(e) => setSignupForm({ ...signupForm, prenom: e.target.value })} autoFocus />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600, marginBottom: 4, display: "block" }}>Nom</label>
                    <input style={inputStyle} placeholder="Ton nom" value={signupForm.nom} onChange={(e) => setSignupForm({ ...signupForm, nom: e.target.value })} />
                  </div>
                </div>
                <label style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600, marginBottom: 4, display: "block", marginTop: 8 }}>Email</label>
                <input style={inputStyle} type="email" placeholder="ton@email.com" value={signupForm.email} onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })} />
                <label style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600, marginBottom: 4, display: "block", marginTop: 8 }}>Mot de passe</label>
                <input style={inputStyle} type="password" placeholder="Minimum 6 caracteres" value={signupForm.password} onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })} />
                <label style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600, marginBottom: 4, display: "block", marginTop: 8 }}>Confirmer le mot de passe</label>
                <input style={inputStyle} type="password" placeholder="Repete ton mot de passe" value={signupForm.confirmPassword} onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })} onKeyDown={(e) => e.key === "Enter" && !authLoading && handleSignup()} />
                <button onClick={handleSignup} disabled={authLoading || !signupForm.prenom.trim() || !signupForm.nom.trim() || !signupForm.email.trim() || !signupForm.password} style={{
                  width: "100%", padding: 16, borderRadius: 12, border: "none", marginTop: 12,
                  background: (!authLoading && signupForm.prenom.trim() && signupForm.nom.trim() && signupForm.email.trim() && signupForm.password)
                    ? "linear-gradient(135deg, #10B981, #059669)" : "#374151",
                  color: (!authLoading && signupForm.prenom.trim() && signupForm.nom.trim() && signupForm.email.trim() && signupForm.password) ? "#FFF" : "#6B7280",
                  fontWeight: 800, fontSize: 16,
                  cursor: (!authLoading && signupForm.prenom.trim() && signupForm.nom.trim() && signupForm.email.trim() && signupForm.password) ? "pointer" : "not-allowed",
                }}>
                  {authLoading ? "Creation..." : "Creer mon compte"}
                </button>
                <div style={{ textAlign: "center", marginTop: 16 }}>
                  <span style={{ fontSize: 13, color: "#6B7280" }}>Deja un compte? </span>
                  <button onClick={() => { setAuthScreen("login"); setAuthError(""); }} style={{ background: "none", border: "none", color: "#3B82F6", fontWeight: 700, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>Se connecter</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================ */
  /* =================== MAIN TRACKER =========================== */
  /* ============================================================ */
  return (
    <div style={{ minHeight: "100vh", background: "#0B0F19", color: "#F3F4F6", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', padding: "0 0 40px" }}>
      <style>{globalStyles}</style>

      {/* MODALS */}
      <Modal show={showMeetModal} onClose={() => { setShowMeetModal(false); resetMeetForm(); }} title="Nouveau meet obtenu" color={g.color}>
        <input style={inputStyle} placeholder="Prenom du prospect" value={meetForm.prenom} onChange={(e) => setMeetForm({ ...meetForm, prenom: e.target.value })} autoFocus />
        <input style={inputStyle} placeholder="Nom du prospect" value={meetForm.nom} onChange={(e) => setMeetForm({ ...meetForm, nom: e.target.value })} />
        <div style={{ display: "flex", gap: 8 }}>
          <input style={{ ...inputStyle, flex: 1 }} type="date" value={meetForm.date} onChange={(e) => setMeetForm({ ...meetForm, date: e.target.value })} />
          <input style={{ ...inputStyle, flex: 1 }} type="time" value={meetForm.heure} onChange={(e) => setMeetForm({ ...meetForm, heure: e.target.value })} />
        </div>
        <button onClick={handleSubmitMeet} disabled={!meetForm.prenom.trim() || !meetForm.nom.trim()} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", marginTop: 4, background: (meetForm.prenom.trim() && meetForm.nom.trim()) ? g.color : "#374151", color: (meetForm.prenom.trim() && meetForm.nom.trim()) ? "#000" : "#6B7280", fontWeight: 800, fontSize: 15, cursor: (meetForm.prenom.trim() && meetForm.nom.trim()) ? "pointer" : "not-allowed" }}>Confirmer le meet</button>
      </Modal>

      <Modal show={showClientModal} onClose={() => { setShowClientModal(false); resetClientForm(); }} title="Nouveau client signe" color="#10B981">
        <input style={inputStyle} placeholder="Prenom du client" value={clientForm.prenom} onChange={(e) => setClientForm({ ...clientForm, prenom: e.target.value })} autoFocus />
        <input style={inputStyle} placeholder="Nom du client" value={clientForm.nom} onChange={(e) => setClientForm({ ...clientForm, nom: e.target.value })} />
        <input style={inputStyle} placeholder="Compagnie" value={clientForm.compagnie} onChange={(e) => setClientForm({ ...clientForm, compagnie: e.target.value })} />
        <button onClick={handleSubmitClient} disabled={!clientForm.prenom.trim() || !clientForm.nom.trim()} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", marginTop: 4, background: (clientForm.prenom.trim() && clientForm.nom.trim()) ? "#10B981" : "#374151", color: (clientForm.prenom.trim() && clientForm.nom.trim()) ? "#000" : "#6B7280", fontWeight: 800, fontSize: 15, cursor: (clientForm.prenom.trim() && clientForm.nom.trim()) ? "pointer" : "not-allowed" }}>Confirmer le client signe</button>
      </Modal>

      <Modal show={showTeamMeetModal !== null} onClose={() => { setShowTeamMeetModal(null); resetMeetForm(); }} title={`Meet obtenu par ${team.find((m) => m.id === showTeamMeetModal)?.name || ""}`} color="#06B6D4">
        <input style={inputStyle} placeholder="Prenom du prospect" value={meetForm.prenom} onChange={(e) => setMeetForm({ ...meetForm, prenom: e.target.value })} autoFocus />
        <input style={inputStyle} placeholder="Nom du prospect" value={meetForm.nom} onChange={(e) => setMeetForm({ ...meetForm, nom: e.target.value })} />
        <div style={{ display: "flex", gap: 8 }}>
          <input style={{ ...inputStyle, flex: 1 }} type="date" value={meetForm.date} onChange={(e) => setMeetForm({ ...meetForm, date: e.target.value })} />
          <input style={{ ...inputStyle, flex: 1 }} type="time" value={meetForm.heure} onChange={(e) => setMeetForm({ ...meetForm, heure: e.target.value })} />
        </div>
        <button onClick={handleTeamMeetSubmit} disabled={!meetForm.prenom.trim() || !meetForm.nom.trim()} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", marginTop: 4, background: (meetForm.prenom.trim() && meetForm.nom.trim()) ? "#06B6D4" : "#374151", color: (meetForm.prenom.trim() && meetForm.nom.trim()) ? "#000" : "#6B7280", fontWeight: 800, fontSize: 15, cursor: (meetForm.prenom.trim() && meetForm.nom.trim()) ? "pointer" : "not-allowed" }}>Confirmer le meet</button>
      </Modal>

      <Modal show={showTeamClientModal !== null} onClose={() => { setShowTeamClientModal(null); resetClientForm(); }} title={`Client signe par ${team.find((m) => m.id === showTeamClientModal)?.name || ""}`} color="#F59E0B">
        <input style={inputStyle} placeholder="Prenom du client" value={clientForm.prenom} onChange={(e) => setClientForm({ ...clientForm, prenom: e.target.value })} autoFocus />
        <input style={inputStyle} placeholder="Nom du client" value={clientForm.nom} onChange={(e) => setClientForm({ ...clientForm, nom: e.target.value })} />
        <input style={inputStyle} placeholder="Compagnie" value={clientForm.compagnie} onChange={(e) => setClientForm({ ...clientForm, compagnie: e.target.value })} />
        <button onClick={handleTeamClientSubmit} disabled={!clientForm.prenom.trim() || !clientForm.nom.trim()} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", marginTop: 4, background: (clientForm.prenom.trim() && clientForm.nom.trim()) ? "#F59E0B" : "#374151", color: (clientForm.prenom.trim() && clientForm.nom.trim()) ? "#000" : "#6B7280", fontWeight: 800, fontSize: 15, cursor: (clientForm.prenom.trim() && clientForm.nom.trim()) ? "pointer" : "not-allowed" }}>Confirmer le client signe</button>
      </Modal>

      <Modal show={showVenteModal} onClose={() => { setShowVenteModal(false); resetVenteForm(); }} title="Nouvelle vente en meet" color="#8B5CF6">
        <input style={inputStyle} placeholder="Prenom du client" value={venteForm.prenom} onChange={(e) => setVenteForm({ ...venteForm, prenom: e.target.value })} autoFocus />
        <input style={inputStyle} placeholder="Nom du client" value={venteForm.nom} onChange={(e) => setVenteForm({ ...venteForm, nom: e.target.value })} />
        <input style={inputStyle} placeholder="Compagnie" value={venteForm.compagnie} onChange={(e) => setVenteForm({ ...venteForm, compagnie: e.target.value })} />
        <button onClick={handleSubmitVente} disabled={!venteForm.prenom.trim() || !venteForm.nom.trim()} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", marginTop: 4, background: (venteForm.prenom.trim() && venteForm.nom.trim()) ? "#8B5CF6" : "#374151", color: (venteForm.prenom.trim() && venteForm.nom.trim()) ? "#000" : "#6B7280", fontWeight: 800, fontSize: 15, cursor: (venteForm.prenom.trim() && venteForm.nom.trim()) ? "pointer" : "not-allowed" }}>Confirmer la vente</button>
      </Modal>

      {/* Celebration promotion */}
      {showPromo && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", animation: "slideDown 0.5s ease" }} onClick={() => setShowPromo(false)}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 80 }}>🏆</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#F59E0B", marginTop: 16 }}>PROMOTION!</div>
            <div style={{ fontSize: 22, color: "#F3F4F6", marginTop: 8 }}>Responsable de Vente</div>
            <div style={{ fontSize: 16, color: "#9CA3AF", marginTop: 12 }}>Tu peux maintenant recruter ton equipe et faire des ventes en meet!</div>
            <div style={{ fontSize: 14, color: "#6B7280", marginTop: 8 }}>Clique pour continuer</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${g.color}22, #0B0F19)`, borderBottom: `1px solid ${g.color}33`, padding: "24px 20px 20px", marginBottom: 20 }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 }}>Sales Tracker</div>
                <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#374151" }} />
                <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600 }}>{currentPrenom} {currentNom}</div>
                {/* Save status indicator */}
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: saveStatus === "saved" ? "#10B981" : saveStatus === "saving" ? "#F59E0B" : "#EF4444", marginLeft: 4, animation: saveStatus === "saving" ? "pulse 1s infinite" : "none" }} title={saveStatus === "saved" ? "Sauvegarde" : saveStatus === "saving" ? "Sauvegarde en cours..." : "Erreur de sauvegarde"} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                <span style={{ fontSize: 28 }}>{g.emoji}</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: g.color }}>{g.label}</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="header-total" style={{ fontSize: 32, fontWeight: 900, color: "#10B981", fontFamily: "monospace" }}>{formatMoney(totalGains)}</div>
              <div style={{ fontSize: 12, color: "#6B7280" }}>Gains totaux</div>
              <button onClick={handleLogout} style={{ marginTop: 6, padding: "5px 14px", borderRadius: 8, border: "1px solid #374151", background: "transparent", color: "#6B7280", fontSize: 11, cursor: "pointer", fontWeight: 600, transition: "all 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#EF4444"; e.currentTarget.style.color = "#EF4444"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#374151"; e.currentTarget.style.color = "#6B7280"; }}
              >Deconnexion</button>
            </div>
          </div>
          {grade === "vendeur" && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: "#9CA3AF" }}>Prochaine promotion : Responsable de Vente</span>
                <span style={{ fontSize: 12, color: g.color, fontWeight: 700 }}>{Math.round(promoProgress * 100)}%</span>
              </div>
              <ProgressBar value={promoProgress * 100} max={100} color={g.color} />
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>
                {meets}/20 meets obtenus
                {canPromote && (
                  <button onClick={promote} style={{ marginLeft: 12, padding: "4px 16px", borderRadius: 8, border: "none", background: g.color, color: "#000", fontWeight: 800, fontSize: 12, cursor: "pointer", animation: "glow 1.5s infinite" }}>RECLAMER TA PROMOTION</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 16px" }}>
        <div className="tab-bar" style={{ display: "flex", gap: 4, marginBottom: 20, background: "#111827", borderRadius: 12, padding: 4 }}>
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, padding: "10px 8px", borderRadius: 10, border: "none", background: activeTab === tab.id ? g.color : "transparent", color: activeTab === tab.id ? "#000" : "#6B7280", fontWeight: 700, fontSize: 12, cursor: "pointer", transition: "all 0.2s" }}>{tab.label}</button>
          ))}
        </div>

        {/* ===================== GUIDE TAB ===================== */}
        {activeTab === "guide" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "linear-gradient(135deg, #10B98122, #10B98108)", borderRadius: 16, padding: 24, border: "1px solid #10B98133", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#10B981" }}>Bienvenue {currentPrenom}!</div>
              <div style={{ fontSize: 14, color: "#9CA3AF", marginTop: 8, maxWidth: 500, margin: "8px auto 0" }}>Tu appelles des clients, tu obtiens des meets, tu signes des contrats, tu gagnes de l'argent. Plus tu performes, plus tu montes en grade et plus tu gagnes.</div>
            </div>
            <div style={{ background: "linear-gradient(135deg, #1F2937, #111827)", borderRadius: 16, padding: 20, border: "2px solid #3B82F644" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 28 }}>📞</span>
                <div><div style={{ fontSize: 11, color: "#3B82F6", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Grade 1</div><div style={{ fontSize: 20, fontWeight: 800, color: "#3B82F6" }}>Vendeur</div></div>
              </div>
              <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 16 }}>Tu commences ici. Tu appelles des prospects et tu obtiens des rendez-vous (meets).</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                <div style={{ background: "#11182799", borderRadius: 12, padding: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#6B7280", fontWeight: 600 }}>Chaque client signe</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "#10B981", fontFamily: "monospace", marginTop: 4 }}>150$</div>
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>dans ta poche</div>
                </div>
                <div style={{ background: "#11182799", borderRadius: 12, padding: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#6B7280", fontWeight: 600 }}>Tous les 5 meets obtenus</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "#3B82F6", fontFamily: "monospace", marginTop: 4 }}>100$</div>
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>de bonus</div>
                </div>
              </div>
              <div style={{ background: "#F59E0B11", border: "1px solid #F59E0B33", borderRadius: 10, padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>🎯</span>
                <div><div style={{ fontSize: 13, fontWeight: 700, color: "#F59E0B" }}>Objectif promotion</div><div style={{ fontSize: 12, color: "#9CA3AF" }}>Obtiens 20 meets et tu deviens Responsable de Vente</div></div>
              </div>
            </div>
            <div style={{ background: "linear-gradient(135deg, #1F2937, #111827)", borderRadius: 16, padding: 20, border: "2px solid #F59E0B44" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 28 }}>🏆</span>
                <div><div style={{ fontSize: 11, color: "#F59E0B", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Grade 2</div><div style={{ fontSize: 20, fontWeight: 800, color: "#F59E0B" }}>Responsable de Vente</div></div>
              </div>
              <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 16 }}>Tu continues d'appeler ET tu recrutes des vendeurs. Tu gagnes de l'argent sur tes propres resultats + sur ceux de ton equipe.</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#F59E0B", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Quand toi tu appelles</div>
              <div className="grid-grille-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
                <div style={{ background: "#11182799", borderRadius: 10, padding: 12, textAlign: "center" }}><div style={{ fontSize: 10, color: "#6B7280", fontWeight: 600 }}>Par client signe</div><div style={{ fontSize: 22, fontWeight: 900, color: "#10B981", fontFamily: "monospace", marginTop: 2 }}>100$</div></div>
                <div style={{ background: "#11182799", borderRadius: 10, padding: 12, textAlign: "center" }}><div style={{ fontSize: 10, color: "#6B7280", fontWeight: 600 }}>Par meet obtenu</div><div style={{ fontSize: 22, fontWeight: 900, color: "#F59E0B", fontFamily: "monospace", marginTop: 2 }}>40$</div></div>
                <div style={{ background: "#11182799", borderRadius: 10, padding: 12, textAlign: "center" }}><div style={{ fontSize: 10, color: "#6B7280", fontWeight: 600 }}>Par vente en meet</div><div style={{ fontSize: 22, fontWeight: 900, color: "#8B5CF6", fontFamily: "monospace", marginTop: 2 }}>100$</div></div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#F59E0B", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Ce que tu gagnes sur ton equipe</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ background: "#10B98111", border: "1px solid #10B98133", borderRadius: 10, padding: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#6B7280", fontWeight: 600 }}>Chaque client signe</div><div style={{ fontSize: 10, color: "#6B7280" }}>par un membre de ton equipe</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#10B981", fontFamily: "monospace", marginTop: 4 }}>50$</div><div style={{ fontSize: 10, color: "#10B981" }}>pour toi</div>
                </div>
                <div style={{ background: "#06B6D411", border: "1px solid #06B6D433", borderRadius: 10, padding: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#6B7280", fontWeight: 600 }}>Chaque meet obtenu</div><div style={{ fontSize: 10, color: "#6B7280" }}>par un membre de ton equipe</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#06B6D4", fontFamily: "monospace", marginTop: 4 }}>10$</div><div style={{ fontSize: 10, color: "#06B6D4" }}>pour toi</div>
                </div>
              </div>
            </div>
            <div style={{ background: "linear-gradient(135deg, #1F2937, #111827)", borderRadius: 16, padding: 20, border: "1px solid #374151" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#F3F4F6", marginBottom: 6 }}>Exemple concret — une bonne semaine de Responsable</div>
              <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 14, fontStyle: "italic" }}>En moyenne, 7 meets sur 10 finissent en client signe</div>
              <div style={{ fontSize: 13, color: "#9CA3AF", lineHeight: 1.8 }}>
                {[
                  { l: "Toi : 10 meets obtenus x 40$", v: "400$", c: "#F59E0B" },
                  { l: "Toi : 7 clients signes x 100$", v: "700$", c: "#10B981" },
                  { l: "Toi : 4 ventes en meet x 100$", v: "400$", c: "#8B5CF6" },
                  { l: "Equipe : 20 meets obtenus x 10$ (marge)", v: "200$", c: "#06B6D4" },
                  { l: "Equipe : 14 clients signes x 50$ (marge)", v: "700$", c: "#10B981" },
                ].map((r, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #1F293744" }}>
                    <span>{r.l}</span><span style={{ color: r.c, fontWeight: 700, fontFamily: "monospace" }}>{r.v}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", marginTop: 4, borderTop: "2px solid #374151" }}>
                  <span style={{ fontWeight: 800, color: "#F3F4F6", fontSize: 15 }}>TOTAL SEMAINE</span>
                  <span style={{ fontWeight: 900, color: "#10B981", fontSize: 20, fontFamily: "monospace" }}>2 400$</span>
                </div>
              </div>
            </div>
            <div style={{ background: "linear-gradient(135deg, #1F2937, #111827)", borderRadius: 16, padding: 20, border: "1px solid #374151" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#F3F4F6", marginBottom: 6 }}>Challenge de la semaine</div>
              <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 14 }}>En plus de tes gains normaux, tu recois un bonus si tu atteins ces paliers de meets dans la semaine :</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {WEEKLY_CHALLENGES.map((c, i) => (
                  <div key={i} style={{ flex: "1 1 auto", background: "#11182799", borderRadius: 10, padding: 14, textAlign: "center", border: "1px solid #374151", minWidth: 120 }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#EC4899", fontFamily: "monospace" }}>{formatMoney(c.bonus)}</div>
                    <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{c.meets} meets dans la semaine</div>
                    <div style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}>{c.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => setActiveTab("dashboard")} style={{ width: "100%", padding: 18, borderRadius: 14, border: "none", background: `linear-gradient(135deg, ${g.color}, ${g.color}cc)`, color: "#000", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>C'est parti — Aller au tracker</button>
          </div>
        )}

        {/* ===================== DASHBOARD TAB ===================== */}
        {activeTab === "dashboard" && (
          <>
            <div className={grade === "responsable" ? "grid-actions-3" : "grid-actions"} style={{ display: "grid", gridTemplateColumns: grade === "responsable" ? "1fr 1fr 1fr" : "1fr 1fr", gap: 10, marginBottom: 20 }}>
              <button onClick={() => setShowMeetModal(true)} style={{ padding: "18px 12px", borderRadius: 14, border: `2px solid ${g.color}66`, background: `linear-gradient(135deg, ${g.color}15, ${g.color}05)`, color: g.color, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
                +1 Meet obtenu
                <div style={{ fontSize: 11, fontWeight: 500, marginTop: 4, opacity: 0.7 }}>{g.meetBonus ? `${formatMoney(g.meetBonus.amount)} / ${g.meetBonus.every} meets` : `${formatMoney(g.perMeet)} / meet obtenu`}</div>
              </button>
              <button onClick={() => setShowClientModal(true)} style={{ padding: "18px 12px", borderRadius: 14, border: "2px solid #10B98166", background: "linear-gradient(135deg, #10B98115, #10B98105)", color: "#10B981", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
                +1 Client signe
                <div style={{ fontSize: 11, fontWeight: 500, marginTop: 4, opacity: 0.7 }}>{formatMoney(g.perClientSigne)} / client signe</div>
              </button>
              {grade === "responsable" && (
                <button onClick={() => setShowVenteModal(true)} style={{ padding: "18px 12px", borderRadius: 14, border: "2px solid #8B5CF666", background: "linear-gradient(135deg, #8B5CF615, #8B5CF605)", color: "#8B5CF6", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
                  +1 Vente en meet
                  <div style={{ fontSize: 11, fontWeight: 500, marginTop: 4, opacity: 0.7 }}>{formatMoney(g.perVenteEnMeet)} / vente en meet</div>
                </button>
              )}
            </div>

            <div className="grid-stats" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
              <StatCard icon="📅" label="Meets obtenus" value={meets} sub={`${formatMoney(gainsMeets)} gagnes`} color={g.color} />
              <StatCard icon="✅" label="Clients signes" value={clientsSignes} sub={`${formatMoney(gainsClients)} gagnes`} color="#10B981" />
              <StatCard icon="📊" label="Taux de conversion" value={`${conversionRate}%`} sub={`${clientsSignes} signes / ${meets} meets`} color={conversionRate >= 70 ? "#10B981" : conversionRate >= 40 ? "#F59E0B" : "#EF4444"} />
              {grade === "responsable" && (
                <>
                  <StatCard icon="👥" label="Marge clients equipe" value={formatMoney(gainsTeamClients)} sub={`${totalTeamClients} clients signes`} color="#F59E0B" />
                  <StatCard icon="📞" label="Marge meets equipe" value={formatMoney(gainsTeamMeets)} sub={`${totalTeamMeets} meets obtenus`} color="#06B6D4" />
                  <StatCard icon="🤝" label="Ventes en meet" value={ventesEnMeet} sub={`${formatMoney(gainsVentesMeet)} gagnes`} color="#8B5CF6" />
                </>
              )}
            </div>

            <div style={{ background: "linear-gradient(135deg, #1F2937, #111827)", borderRadius: 16, padding: 20, marginBottom: 20, border: "1px solid #374151" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#9CA3AF", marginBottom: 14, textTransform: "uppercase", letterSpacing: 1 }}>Detail des gains</div>
              {[
                { label: `Clients signes (${clientsSignes} x ${formatMoney(g.perClientSigne)})`, amount: gainsClients, color: "#10B981" },
                { label: g.meetBonus ? `Bonus meets (${Math.floor(meets / g.meetBonus.every)} x ${formatMoney(g.meetBonus.amount)})` : `Meets obtenus (${meets} x ${formatMoney(g.perMeet)})`, amount: gainsMeets, color: g.color },
                grade === "responsable" && { label: `Marge equipe clients (${totalTeamClients} x 50$)`, amount: gainsTeamClients, color: "#F59E0B" },
                grade === "responsable" && { label: `Marge equipe meets (${totalTeamMeets} x 10$)`, amount: gainsTeamMeets, color: "#06B6D4" },
                grade === "responsable" && { label: `Ventes en meet (${ventesEnMeet} x 100$)`, amount: gainsVentesMeet, color: "#8B5CF6" },
                weeklyBonus > 0 && { label: "Challenge semaine", amount: weeklyBonus, color: "#EC4899" },
              ].filter(Boolean).map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #1F293788" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
                    <span style={{ fontSize: 14, color: "#D1D5DB" }}>{item.label}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: item.color, fontFamily: "monospace", fontSize: 15 }}>{formatMoney(item.amount)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 12, borderTop: "2px solid #374151" }}>
                <span style={{ fontWeight: 800, fontSize: 16, color: "#F3F4F6" }}>TOTAL</span>
                <span style={{ fontWeight: 900, fontSize: 22, color: "#10B981", fontFamily: "monospace" }}>{formatMoney(totalGains)}</span>
              </div>
            </div>

            {(meetsList.length > 0 || clientsList.length > 0 || ventesList.length > 0) && (
              <div className="grid-lists" style={{ display: "grid", gridTemplateColumns: ventesList.length > 0 ? "1fr 1fr 1fr" : "1fr 1fr", gap: 12, marginBottom: 20 }}>
                {meetsList.length > 0 && (
                  <div style={{ background: "linear-gradient(135deg, #1F2937, #111827)", borderRadius: 16, padding: 16, border: "1px solid #374151" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: g.color, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Mes meets</div>
                    {meetsList.slice(-5).reverse().map((m) => (
                      <div key={m.id} style={{ fontSize: 12, color: "#9CA3AF", padding: "4px 0", borderBottom: "1px solid #1F293744" }}>
                        <div style={{ color: "#D1D5DB", fontWeight: 600 }}>{m.prenom} {m.nom}</div>
                        <div style={{ color: "#6B7280", fontSize: 11 }}>{m.date} {m.heure}</div>
                      </div>
                    ))}
                  </div>
                )}
                {clientsList.length > 0 && (
                  <div style={{ background: "linear-gradient(135deg, #1F2937, #111827)", borderRadius: 16, padding: 16, border: "1px solid #374151" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#10B981", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Mes clients signes</div>
                    {clientsList.slice(-5).reverse().map((c) => (
                      <div key={c.id} style={{ fontSize: 12, color: "#9CA3AF", padding: "4px 0", borderBottom: "1px solid #1F293744" }}>
                        <div style={{ color: "#D1D5DB", fontWeight: 600 }}>{c.prenom} {c.nom}</div>
                        <div style={{ color: "#6B7280", fontSize: 11 }}>{c.compagnie}</div>
                      </div>
                    ))}
                  </div>
                )}
                {ventesList.length > 0 && (
                  <div style={{ background: "linear-gradient(135deg, #1F2937, #111827)", borderRadius: 16, padding: 16, border: "1px solid #374151" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#8B5CF6", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Mes ventes en meet</div>
                    {ventesList.slice(-5).reverse().map((v) => (
                      <div key={v.id} style={{ fontSize: 12, color: "#9CA3AF", padding: "4px 0", borderBottom: "1px solid #1F293744" }}>
                        <div style={{ color: "#D1D5DB", fontWeight: 600 }}>{v.prenom} {v.nom}</div>
                        <div style={{ color: "#6B7280", fontSize: 11 }}>{v.compagnie}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ background: "linear-gradient(135deg, #1F2937, #111827)", borderRadius: 16, padding: 20, border: "1px solid #374151" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 1 }}>Challenge de la semaine</div>
                <button onClick={() => { setWeeklyMeets(0); saveData(buildSavePayload({ weeklyMeets: 0 })); }} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #374151", background: "transparent", color: "#6B7280", fontSize: 11, cursor: "pointer" }}>Reset semaine</button>
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#06B6D4", fontFamily: "monospace", marginBottom: 12 }}>{weeklyMeets} meets cette semaine</div>
              <div className="grid-challenge" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {WEEKLY_CHALLENGES.map((c, i) => {
                  const reached = weeklyMeets >= c.meets;
                  return (
                    <div key={i} style={{ padding: "10px 14px", borderRadius: 10, flex: "1 1 auto", textAlign: "center", background: reached ? "#06B6D422" : "#111827", border: `1px solid ${reached ? "#06B6D466" : "#374151"}`, minWidth: 100 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: reached ? "#06B6D4" : "#6B7280" }}>{reached ? "✅ " : ""}{c.label}</div>
                      <div style={{ fontSize: 11, color: reached ? "#06B6D4" : "#4B5563" }}>{c.meets} meets = {formatMoney(c.bonus)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ===================== EQUIPE TAB ===================== */}
        {activeTab === "team" && (
          <>
            {grade === "vendeur" ? (
              <div style={{ background: "linear-gradient(135deg, #1F2937, #111827)", borderRadius: 16, padding: 32, textAlign: "center", border: "1px solid #374151" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#F3F4F6" }}>Debloque ton equipe!</div>
                <div style={{ fontSize: 14, color: "#9CA3AF", marginTop: 8, maxWidth: 440, margin: "8px auto 0" }}>Atteins 20 meets pour obtenir ta promotion en Responsable de Vente et commencer a recruter ton equipe.</div>
                <div style={{ marginTop: 16, background: "#111827", borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#F59E0B", marginBottom: 8 }}>Ce que tu gagneras sur ton equipe :</div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
                    <div style={{ textAlign: "center" }}><div style={{ fontSize: 24, fontWeight: 900, color: "#10B981", fontFamily: "monospace" }}>50$</div><div style={{ fontSize: 12, color: "#9CA3AF" }}>par client signe</div><div style={{ fontSize: 11, color: "#6B7280" }}>par chaque membre</div></div>
                    <div style={{ textAlign: "center" }}><div style={{ fontSize: 24, fontWeight: 900, color: "#06B6D4", fontFamily: "monospace" }}>10$</div><div style={{ fontSize: 12, color: "#9CA3AF" }}>par meet obtenu</div><div style={{ fontSize: 11, color: "#6B7280" }}>par chaque membre</div></div>
                  </div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <ProgressBar value={meets} max={20} color={g.color} />
                  <div style={{ fontSize: 12, color: "#6B7280", marginTop: 6 }}>{meets}/20 meets — encore {Math.max(0, 20 - meets)}!</div>
                </div>
              </div>
            ) : (
              <>
                <div style={{ background: "linear-gradient(135deg, #1F2937, #111827)", borderRadius: 16, padding: 20, marginBottom: 16, border: "1px solid #374151" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#9CA3AF", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>Tes gains sur ton equipe</div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap", marginBottom: 12 }}>
                    <div style={{ textAlign: "center" }}><div style={{ fontSize: 28, fontWeight: 900, color: "#10B981", fontFamily: "monospace" }}>50$</div><div style={{ fontSize: 12, color: "#9CA3AF" }}>par client signe</div><div style={{ fontSize: 11, color: "#6B7280" }}>par chaque membre</div></div>
                    <div style={{ textAlign: "center" }}><div style={{ fontSize: 28, fontWeight: 900, color: "#06B6D4", fontFamily: "monospace" }}>10$</div><div style={{ fontSize: 12, color: "#9CA3AF" }}>par meet obtenu</div><div style={{ fontSize: 11, color: "#6B7280" }}>par chaque membre</div></div>
                  </div>
                  <div className="summary-flex" style={{ borderTop: "1px solid #374151", paddingTop: 12, display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap" }}>
                    <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: "#6B7280" }}>Total clients equipe</div><div style={{ fontSize: 20, fontWeight: 800, color: "#10B981", fontFamily: "monospace" }}>{totalTeamClients}</div><div style={{ fontSize: 12, color: "#10B981" }}>{formatMoney(gainsTeamClients)}</div></div>
                    <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: "#6B7280" }}>Total meets equipe</div><div style={{ fontSize: 20, fontWeight: 800, color: "#06B6D4", fontFamily: "monospace" }}>{totalTeamMeets}</div><div style={{ fontSize: 12, color: "#06B6D4" }}>{formatMoney(gainsTeamMeets)}</div></div>
                    <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: "#6B7280" }}>Marge totale equipe</div><div style={{ fontSize: 20, fontWeight: 800, color: "#F59E0B", fontFamily: "monospace" }}>{formatMoney(gainsTeamClients + gainsTeamMeets)}</div></div>
                  </div>
                </div>
                <div style={{ background: "linear-gradient(135deg, #1F2937, #111827)", borderRadius: 16, padding: 20, border: "1px solid #374151" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>Ton equipe ({team.length} membres)</div>
                    <button onClick={() => setShowAddMember(!showAddMember)} style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: g.color, color: "#000", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Recruter</button>
                  </div>
                  {showAddMember && (
                    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                      <input value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTeamMember()} placeholder="Nom du vendeur..." style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
                      <button onClick={addTeamMember} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#10B981", color: "#000", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Ajouter</button>
                    </div>
                  )}
                  {team.length === 0 ? (
                    <div style={{ textAlign: "center", padding: 24, color: "#6B7280" }}><div style={{ fontSize: 32, marginBottom: 8 }}>🤝</div><div>Recrute ton premier vendeur pour commencer a gagner des marges!</div></div>
                  ) : (
                    team.map((m) => (
                      <TeamMemberRow key={m.id} member={m} grade={grade} onAddMeet={(id) => setShowTeamMeetModal(id)} onAddClient={(id) => setShowTeamClientModal(id)} />
                    ))
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ===================== HISTORY TAB ===================== */}
        {activeTab === "history" && (
          <div style={{ background: "linear-gradient(135deg, #1F2937, #111827)", borderRadius: 16, padding: 20, border: "1px solid #374151" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Historique recent</div>
            {history.length === 0 ? (
              <div style={{ textAlign: "center", padding: 24, color: "#6B7280" }}>Aucune activite encore. Commence a appeler!</div>
            ) : (
              history.map((h) => (
                <div key={h.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1F293788" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#D1D5DB" }}>
                      {h.type === "meet" && "Meet obtenu"}
                      {h.type === "client" && "Client signe"}
                      {h.type === "vente_meet" && "Vente en meet"}
                      {h.type === "team_meet" && "Meet equipe"}
                      {h.type === "team_client" && "Client equipe"}
                      {h.detail && <span style={{ fontWeight: 400, color: "#9CA3AF" }}> — {h.detail}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "#6B7280" }}>{h.sub && <span>{h.sub} · </span>}{h.date}</div>
                  </div>
                  {h.amount > 0 && <div style={{ fontWeight: 700, color: "#10B981", fontFamily: "monospace", whiteSpace: "nowrap" }}>+{formatMoney(h.amount)}</div>}
                </div>
              ))
            )}
          </div>
        )}

        {/* ===================== ADMIN TAB ===================== */}
        {activeTab === "admin" && isAdmin && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "linear-gradient(135deg, #EF444422, #EF444408)", borderRadius: 16, padding: 20, border: "1px solid #EF444433", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#EF4444" }}>Panneau Admin</div>
                <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4 }}>Vue d'ensemble de tous les comptes et leur avancement</div>
              </div>
              <button onClick={loadAdminData} disabled={adminLoading} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: adminLoading ? "#374151" : "#EF4444", color: adminLoading ? "#6B7280" : "#FFF", fontWeight: 700, fontSize: 14, cursor: adminLoading ? "not-allowed" : "pointer" }}>
                {adminLoading ? "Chargement..." : "Rafraichir les donnees"}
              </button>
            </div>

            {adminData.length === 0 && !adminLoading && (
              <div style={{ background: "linear-gradient(135deg, #1F2937, #111827)", borderRadius: 16, padding: 32, textAlign: "center", border: "1px solid #374151" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>👆</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#F3F4F6" }}>Clique sur "Rafraichir les donnees" pour voir tous les comptes</div>
              </div>
            )}

            {adminData.length > 0 && (
              <>
                {/* Summary cards */}
                <div className="grid-stats" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                  <StatCard icon="👥" label="Total comptes" value={adminData.length} color="#3B82F6" />
                  <StatCard icon="📅" label="Total meets" value={adminData.reduce((s, r) => s + (r.data?.meetsList?.length || 0), 0)} color="#F59E0B" />
                  <StatCard icon="✅" label="Total clients" value={adminData.reduce((s, r) => s + (r.data?.clientsList?.length || 0), 0)} color="#10B981" />
                  <StatCard icon="💰" label="Total gains" value={formatMoney(adminData.reduce((s, r) => {
                    const d = r.data || {};
                    const gr = GRADES[d.grade || "vendeur"];
                    const mc = (d.clientsList?.length || 0) * gr.perClientSigne;
                    const mm = gr.meetBonus ? Math.floor((d.meetsList?.length || 0) / gr.meetBonus.every) * gr.meetBonus.amount : (d.meetsList?.length || 0) * gr.perMeet;
                    const tc = (d.team || []).reduce((a, m) => a + (m.clientsList?.length || 0), 0) * gr.teamMarginClient;
                    const tm = (d.team || []).reduce((a, m) => a + (m.meetsList?.length || 0), 0) * gr.teamMarginMeet;
                    const vm = (d.ventesList?.length || 0) * gr.perVenteEnMeet;
                    return s + mc + mm + tc + tm + vm;
                  }, 0))} color="#EC4899" />
                </div>

                {/* Users list */}
                <div style={{ background: "linear-gradient(135deg, #1F2937, #111827)", borderRadius: 16, padding: 20, border: "1px solid #374151" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "#F3F4F6" }}>Tous les comptes ({adminData.length})</div>
                  {adminData.map((row, idx) => {
                    const d = row.data || {};
                    const uPrenom = d.userPrenom || "—";
                    const uNom = d.userNom || "";
                    const uEmail = d.userEmail || "—";
                    const uGrade = d.grade || "vendeur";
                    const uGradeInfo = GRADES[uGrade];
                    const uMeets = d.meetsList?.length || 0;
                    const uClients = d.clientsList?.length || 0;
                    const uVentes = d.ventesList?.length || 0;
                    const uTeamSize = d.team?.length || 0;
                    const uTeamClients = (d.team || []).reduce((a, m) => a + (m.clientsList?.length || 0), 0);
                    const uTeamMeets = (d.team || []).reduce((a, m) => a + (m.meetsList?.length || 0), 0);
                    const uConversion = uMeets > 0 ? Math.round((uClients / uMeets) * 100) : 0;
                    const uGainsClients = uClients * uGradeInfo.perClientSigne;
                    const uGainsMeets = uGradeInfo.meetBonus ? Math.floor(uMeets / uGradeInfo.meetBonus.every) * uGradeInfo.meetBonus.amount : uMeets * uGradeInfo.perMeet;
                    const uGainsTeamC = uTeamClients * uGradeInfo.teamMarginClient;
                    const uGainsTeamM = uTeamMeets * uGradeInfo.teamMarginMeet;
                    const uGainsVentes = uVentes * uGradeInfo.perVenteEnMeet;
                    const uTotalGains = uGainsClients + uGainsMeets + uGainsTeamC + uGainsTeamM + uGainsVentes;
                    const lastActive = row.updated_at ? new Date(row.updated_at).toLocaleString("fr-CA") : "—";

                    return (
                      <AdminUserRow key={row.user_id || idx} prenom={uPrenom} nom={uNom} email={uEmail} grade={uGrade} gradeInfo={uGradeInfo} meets={uMeets} clients={uClients} ventes={uVentes} teamSize={uTeamSize} teamClients={uTeamClients} teamMeets={uTeamMeets} conversion={uConversion} totalGains={uTotalGains} lastActive={lastActive} meetsList={d.meetsList || []} clientsList={d.clientsList || []} />
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
