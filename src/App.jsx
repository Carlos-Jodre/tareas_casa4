import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, doc, onSnapshot,
  updateDoc, deleteDoc, addDoc, serverTimestamp, writeBatch, getDocs
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDfq4oVaFxhGaqipx52itBxUARcajJhHfA",
  authDomain: "tareas-casa-11c7b.firebaseapp.com",
  projectId: "tareas-casa-11c7b",
  storageBucket: "tareas-casa-11c7b.firebasestorage.app",
  messagingSenderId: "956111451974",
  appId: "1:956111451974:web:aab85979e536d5770e1747"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const PALETA = [
  { bg: "#EEF2FF", accent: "#6366F1", light: "#C7D2FE", text: "#3730A3" },
  { bg: "#FFF1F2", accent: "#F43F5E", light: "#FECDD3", text: "#9F1239" },
  { bg: "#F0FDF4", accent: "#22C55E", light: "#BBF7D0", text: "#14532D" },
  { bg: "#FFF7ED", accent: "#F97316", light: "#FED7AA", text: "#7C2D12" },
  { bg: "#F0F9FF", accent: "#0EA5E9", light: "#BAE6FD", text: "#0C4A6E" },
  { bg: "#FDF4FF", accent: "#A855F7", light: "#E9D5FF", text: "#581C87" },
];
const AVATARES = ["🧒", "👦", "👧", "🧑", "👨", "👩", "🧔", "👴", "👵"];

function getColor(index) { return PALETA[index % PALETA.length]; }
function hoy() { return new Date().toISOString().split("T")[0]; }

// ── Reset diario al abrir ──
async function resetDiarioSiToca() {
  const metaRef = doc(db, "meta", "reset");
  const metaSnap = await getDocs(collection(db, "meta"));
  const metaDoc = metaSnap.docs.find(d => d.id === "reset");
  const ultimoReset = metaDoc?.data()?.fecha || "";
  const hoyStr = hoy();
  if (ultimoReset === hoyStr) return;

  // Resetear estados del catálogo
  const catalogoSnap = await getDocs(collection(db, "catalogo"));
  const batch = writeBatch(db);
  catalogoSnap.docs.forEach(d => {
    const asignaciones = d.data().asignaciones || {};
    const resetadas = {};
    Object.keys(asignaciones).forEach(pid => {
      resetadas[pid] = { asignada: asignaciones[pid].asignada, hecha: false };
    });
    batch.update(doc(db, "catalogo", d.id), { asignaciones: resetadas });
  });
  batch.set(metaRef, { fecha: hoyStr });
  await batch.commit();
}

export default function App() {
  const [personas, setPersonas] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [tab, setTab] = useState(null); // id persona o "catalogo"
  const [cargando, setCargando] = useState(true);

  // Modal añadir persona
  const [modalPersona, setModalPersona] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoAvatar, setNuevoAvatar] = useState(AVATARES[0]);

  // Modal editar persona
  const [modalEditar, setModalEditar] = useState(null);
  const [editNombre, setEditNombre] = useState("");
  const [editAvatar, setEditAvatar] = useState(AVATARES[0]);

  // Confirmar eliminar persona
  const [confirmarEliminar, setConfirmarEliminar] = useState(null);

  // Nueva tarea catálogo
  const [nuevaTarea, setNuevaTarea] = useState("");

  // Modal asignar tarea
  const [modalAsignar, setModalAsignar] = useState(null); // tarea del catálogo

  useEffect(() => {
    resetDiarioSiToca().then(() => setCargando(false));
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "personas"), snap => {
      const lista = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
      setPersonas(lista);
      if (!tab) setTab("catalogo");
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "catalogo"), snap => {
      const lista = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.creadoEn?.seconds ?? 0) - (b.creadoEn?.seconds ?? 0));
      setCatalogo(lista);
    });
    return unsub;
  }, []);

  // ── Personas ──
  async function añadirPersona() {
    if (!nuevoNombre.trim()) return;
    await addDoc(collection(db, "personas"), {
      nombre: nuevoNombre.trim(), avatar: nuevoAvatar, orden: personas.length,
    });
    setNuevoNombre(""); setNuevoAvatar(AVATARES[0]); setModalPersona(false);
  }

  function abrirEditar(p) {
    setModalEditar(p); setEditNombre(p.nombre); setEditAvatar(p.avatar);
  }

  async function guardarEdicion() {
    if (!editNombre.trim() || !modalEditar) return;
    await updateDoc(doc(db, "personas", modalEditar.id), { nombre: editNombre.trim(), avatar: editAvatar });
    setModalEditar(null);
  }

  async function eliminarPersona(id) {
    // Quitar asignaciones del catálogo
    const batch = writeBatch(db);
    catalogo.forEach(t => {
      const asignaciones = { ...(t.asignaciones || {}) };
      delete asignaciones[id];
      batch.update(doc(db, "catalogo", t.id), { asignaciones });
    });
    await batch.commit();
    await deleteDoc(doc(db, "personas", id));
    setConfirmarEliminar(null);
    if (tab === id) setTab("catalogo");
  }

  // ── Catálogo ──
  async function añadirAlCatalogo() {
    if (!nuevaTarea.trim()) return;
    await addDoc(collection(db, "catalogo"), {
      texto: nuevaTarea.trim(),
      asignaciones: {},
      creadoEn: serverTimestamp(),
    });
    setNuevaTarea("");
  }

  async function eliminarDelCatalogo(id) {
    await deleteDoc(doc(db, "catalogo", id));
  }

  async function toggleAsignacion(tarea, personaId) {
    const asignaciones = { ...(tarea.asignaciones || {}) };
    if (asignaciones[personaId]?.asignada) {
      delete asignaciones[personaId];
    } else {
      asignaciones[personaId] = { asignada: true, hecha: false };
    }
    await updateDoc(doc(db, "catalogo", tarea.id), { asignaciones });
  }

  async function toggleHecha(tarea, personaId) {
    const asignaciones = { ...(tarea.asignaciones || {}) };
    asignaciones[personaId] = {
      ...asignaciones[personaId],
      hecha: !asignaciones[personaId]?.hecha,
    };
    await updateDoc(doc(db, "catalogo", tarea.id), { asignaciones });
  }

  if (cargando) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC", fontFamily: "system-ui" }}>
      <div style={{ textAlign: "center", color: "#94A3B8" }}>
        <p style={{ fontSize: 36, margin: "0 0 8px" }}>🏠</p>
        <p style={{ fontSize: 15 }}>Cargando...</p>
      </div>
    </div>
  );

  // Tareas asignadas a la persona activa
  const tareasPersona = catalogo.filter(t => t.asignaciones?.[tab]?.asignada);
  const pendientes = tareasPersona.filter(t => !t.asignaciones?.[tab]?.hecha).length;
  const hechasCount = tareasPersona.filter(t => t.asignaciones?.[tab]?.hecha).length;
  const total = tareasPersona.length;
  const progreso = total === 0 ? 0 : Math.round((hechasCount / total) * 100);

  const personaActiva = personas.find(p => p.id === tab);
  const c = personaActiva ? getColor(personas.indexOf(personaActiva)) : PALETA[0];

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Inter', system-ui, sans-serif", display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: 60 }}>

      {/* Header */}
      <div style={{ width: "100%", background: "#1E293B", padding: "20px 24px 0", boxSizing: "border-box" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <p style={{ color: "#94A3B8", fontSize: 12, margin: "0 0 2px", letterSpacing: 1, textTransform: "uppercase" }}>Hogar</p>
              <h1 style={{ color: "#F1F5F9", fontSize: 22, fontWeight: 700, margin: 0 }}>Tareas del hogar</h1>
            </div>
            <button onClick={() => setModalPersona(true)} style={{
              background: "#334155", border: "none", borderRadius: 10,
              color: "#F1F5F9", fontSize: 13, fontWeight: 600, padding: "8px 14px", cursor: "pointer",
            }}>＋ Persona</button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", overflowX: "auto", gap: 2 }}>
            <button onClick={() => setTab("catalogo")} style={{
              flexShrink: 0, padding: "10px 14px", background: "none", border: "none",
              borderBottom: tab === "catalogo" ? "3px solid #F59E0B" : "3px solid transparent",
              color: tab === "catalogo" ? "#F1F5F9" : "#64748B",
              fontWeight: tab === "catalogo" ? 600 : 400, fontSize: 14, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
            }}>
              📋 Catálogo
              <span style={{ background: "#334155", color: "#94A3B8", borderRadius: 99, fontSize: 11, fontWeight: 700, padding: "1px 7px" }}>
                {catalogo.length}
              </span>
            </button>
            {personas.map((p, i) => {
              const col = getColor(i);
              const pend = catalogo.filter(t => t.asignaciones?.[p.id]?.asignada && !t.asignaciones?.[p.id]?.hecha).length;
              return (
                <button key={p.id} onClick={() => setTab(p.id)} style={{
                  flexShrink: 0, padding: "10px 14px", background: "none", border: "none",
                  borderBottom: tab === p.id ? `3px solid ${col.accent}` : "3px solid transparent",
                  color: tab === p.id ? "#F1F5F9" : "#64748B",
                  fontWeight: tab === p.id ? 600 : 400, fontSize: 14, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
                }}>
                  <span>{p.avatar}</span>
                  <span>{p.nombre}</span>
                  {pend > 0 && (
                    <span style={{ background: col.accent, color: "white", borderRadius: 99, fontSize: 11, fontWeight: 700, padding: "1px 7px" }}>{pend}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 480, width: "100%", padding: "20px 16px 0", boxSizing: "border-box" }}>

        {/* ── VISTA CATÁLOGO ── */}
        {tab === "catalogo" && (
          <>
            <div style={{ background: "#FFF8E7", borderRadius: 16, padding: "14px 18px", marginBottom: 20, border: "1px solid #FDE68A" }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#92400E" }}>📋 Catálogo de tareas</p>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#92400E", opacity: 0.8 }}>
                Añade tareas y asígnalas a cada persona. Se resetean cada día.
              </p>
            </div>

            {/* Añadir al catálogo */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <input value={nuevaTarea} onChange={e => setNuevaTarea(e.target.value)}
                onKeyDown={e => e.key === "Enter" && añadirAlCatalogo()}
                placeholder="Nueva tarea al catálogo..."
                style={{ flex: 1, padding: "12px 14px", border: "1.5px solid #E2E8F0", borderRadius: 12, fontSize: 15, outline: "none", background: "white", color: "#1E293B" }} />
              <button onClick={añadirAlCatalogo} style={{
                background: "#F59E0B", color: "white", border: "none", borderRadius: 12,
                padding: "12px 18px", fontSize: 20, cursor: "pointer", fontWeight: 700,
              }}>+</button>
            </div>

            {catalogo.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#94A3B8" }}>
                <p style={{ fontSize: 36, margin: "0 0 8px" }}>📝</p>
                <p style={{ fontSize: 15, margin: 0 }}>El catálogo está vacío. ¡Añade tareas!</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {catalogo.map(t => {
                  const asignados = personas.filter(p => t.asignaciones?.[p.id]?.asignada);
                  return (
                    <div key={t.id} style={{
                      background: "white", borderRadius: 12, padding: "13px 14px",
                      border: "1.5px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ flex: 1, fontSize: 15, color: "#1E293B", fontWeight: 500 }}>{t.texto}</span>
                        <button onClick={() => setModalAsignar(t)} style={{
                          background: "#EEF2FF", border: "none", borderRadius: 8,
                          color: "#6366F1", fontSize: 12, fontWeight: 600, padding: "5px 10px", cursor: "pointer",
                        }}>Asignar</button>
                        <button onClick={() => eliminarDelCatalogo(t.id)} style={{
                          background: "none", border: "none", color: "#CBD5E1", cursor: "pointer", fontSize: 16, padding: "0 2px",
                        }}>×</button>
                      </div>
                      {asignados.length > 0 && (
                        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                          {asignados.map((p, i) => {
                            const col = getColor(personas.indexOf(p));
                            const hecha = t.asignaciones?.[p.id]?.hecha;
                            return (
                              <span key={p.id} style={{
                                background: hecha ? col.light : col.bg,
                                color: col.text, borderRadius: 99,
                                fontSize: 12, fontWeight: 600, padding: "3px 10px",
                                border: `1px solid ${col.light}`,
                                textDecoration: hecha ? "line-through" : "none",
                                opacity: hecha ? 0.7 : 1,
                              }}>
                                {p.avatar} {p.nombre} {hecha ? "✓" : ""}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── VISTA PERSONA ── */}
        {tab !== "catalogo" && personaActiva && (
          <>
            {/* Tarjeta persona */}
            <div style={{ background: c.bg, borderRadius: 16, padding: "16px 20px", marginBottom: 20, border: `1px solid ${c.light}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 30 }}>{personaActiva.avatar}</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 17, color: c.text }}>{personaActiva.nombre}</p>
                    <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
                      <button onClick={() => abrirEditar(personaActiva)} style={{ background: "none", border: "none", color: c.accent, fontSize: 12, cursor: "pointer", padding: 0, fontWeight: 500 }}>✏️ Editar</button>
                      <button onClick={() => setConfirmarEliminar(personaActiva.id)} style={{ background: "none", border: "none", color: "#EF4444", fontSize: 12, cursor: "pointer", padding: 0, fontWeight: 500 }}>🗑 Eliminar</button>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: c.accent }}>{progreso}%</p>
                  <p style={{ margin: 0, fontSize: 12, color: c.text, opacity: 0.7 }}>{hechasCount}/{total} hechas</p>
                </div>
              </div>
              <div style={{ background: c.light, borderRadius: 99, height: 8, overflow: "hidden" }}>
                <div style={{ width: `${progreso}%`, height: "100%", background: c.accent, borderRadius: 99, transition: "width 0.4s ease" }} />
              </div>
            </div>

            {total === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#94A3B8" }}>
                <p style={{ fontSize: 36, margin: "0 0 8px" }}>📋</p>
                <p style={{ fontSize: 15, margin: "0 0 4px" }}>Sin tareas asignadas.</p>
                <p style={{ fontSize: 13, margin: 0 }}>Ve al Catálogo para asignar tareas.</p>
              </div>
            ) : (
              <>
                {pendientes > 0 && (
                  <p style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
                    Pendientes · {pendientes}
                  </p>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {tareasPersona.filter(t => !t.asignaciones?.[tab]?.hecha).map(t => (
                    <TareaItem key={t.id} texto={t.texto} hecha={false} color={c}
                      onToggle={() => toggleHecha(t, tab)} />
                  ))}
                </div>

                {hechasCount > 0 && (
                  <>
                    <p style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, margin: "20px 0 8px" }}>
                      Completadas · {hechasCount}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {tareasPersona.filter(t => t.asignaciones?.[tab]?.hecha).map(t => (
                        <TareaItem key={t.id} texto={t.texto} hecha={true} color={c}
                          onToggle={() => toggleHecha(t, tab)} />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Modal asignar tarea */}
      {modalAsignar && (
        <Modal onClose={() => setModalAsignar(null)}>
          <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 17, color: "#1E293B" }}>Asignar tarea</p>
          <p style={{ margin: "0 0 16px", fontSize: 14, color: "#64748B" }}>"{modalAsignar.texto}"</p>
          {personas.length === 0 ? (
            <p style={{ color: "#94A3B8", fontSize: 14, textAlign: "center" }}>No hay personas. Añade una primero.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {personas.map((p, i) => {
                const col = getColor(i);
                const asignada = modalAsignar.asignaciones?.[p.id]?.asignada;
                return (
                  <button key={p.id} onClick={() => {
                    toggleAsignacion(modalAsignar, p.id);
                    setModalAsignar(prev => {
                      const asignaciones = { ...(prev.asignaciones || {}) };
                      if (asignaciones[p.id]?.asignada) {
                        delete asignaciones[p.id];
                      } else {
                        asignaciones[p.id] = { asignada: true, hecha: false };
                      }
                      return { ...prev, asignaciones };
                    });
                  }} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px", borderRadius: 12, cursor: "pointer",
                    background: asignada ? col.bg : "white",
                    border: asignada ? `2px solid ${col.accent}` : "2px solid #E2E8F0",
                  }}>
                    <span style={{ fontSize: 22 }}>{p.avatar}</span>
                    <span style={{ flex: 1, fontWeight: 600, color: asignada ? col.text : "#475569", fontSize: 15 }}>{p.nombre}</span>
                    <span style={{
                      width: 22, height: 22, borderRadius: 99,
                      background: asignada ? col.accent : "white",
                      border: `2px solid ${asignada ? col.accent : "#CBD5E1"}`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
                    }}>
                      {asignada && <span style={{ color: "white" }}>✓</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <button onClick={() => setModalAsignar(null)} style={{
            width: "100%", background: "#1E293B", color: "white", border: "none",
            borderRadius: 12, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer",
          }}>Listo</button>
        </Modal>
      )}

      {/* Modal añadir persona */}
      {modalPersona && (
        <Modal onClose={() => setModalPersona(false)}>
          <p style={{ margin: "0 0 16px", fontWeight: 700, fontSize: 17, color: "#1E293B" }}>Nueva persona</p>
          <input autoFocus value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)}
            onKeyDown={e => e.key === "Enter" && añadirPersona()}
            placeholder="Nombre..."
            style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #E2E8F0", borderRadius: 12, fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 14 }} />
          <p style={{ margin: "0 0 8px", fontSize: 13, color: "#64748B", fontWeight: 500 }}>Elige un avatar</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {AVATARES.map(a => (
              <button key={a} onClick={() => setNuevoAvatar(a)} style={{
                fontSize: 24, background: nuevoAvatar === a ? "#EEF2FF" : "white",
                border: nuevoAvatar === a ? "2px solid #6366F1" : "2px solid #E2E8F0",
                borderRadius: 10, padding: "6px 10px", cursor: "pointer",
              }}>{a}</button>
            ))}
          </div>
          <button onClick={añadirPersona} style={{
            width: "100%", background: "#6366F1", color: "white", border: "none",
            borderRadius: 12, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer",
          }}>Añadir</button>
        </Modal>
      )}

      {/* Modal editar persona */}
      {modalEditar && (
        <Modal onClose={() => setModalEditar(null)}>
          <p style={{ margin: "0 0 16px", fontWeight: 700, fontSize: 17, color: "#1E293B" }}>Editar persona</p>
          <input autoFocus value={editNombre} onChange={e => setEditNombre(e.target.value)}
            onKeyDown={e => e.key === "Enter" && guardarEdicion()}
            placeholder="Nombre..."
            style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #E2E8F0", borderRadius: 12, fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 14 }} />
          <p style={{ margin: "0 0 8px", fontSize: 13, color: "#64748B", fontWeight: 500 }}>Elige un avatar</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {AVATARES.map(a => (
              <button key={a} onClick={() => setEditAvatar(a)} style={{
                fontSize: 24, background: editAvatar === a ? "#EEF2FF" : "white",
                border: editAvatar === a ? "2px solid #6366F1" : "2px solid #E2E8F0",
                borderRadius: 10, padding: "6px 10px", cursor: "pointer",
              }}>{a}</button>
            ))}
          </div>
          <button onClick={guardarEdicion} style={{
            width: "100%", background: "#6366F1", color: "white", border: "none",
            borderRadius: 12, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer",
          }}>Guardar cambios</button>
        </Modal>
      )}

      {/* Modal confirmar eliminar */}
      {confirmarEliminar && (
        <Modal onClose={() => setConfirmarEliminar(null)}>
          <p style={{ fontSize: 36, textAlign: "center", margin: "0 0 12px" }}>⚠️</p>
          <p style={{ fontWeight: 700, fontSize: 16, color: "#1E293B", textAlign: "center", margin: "0 0 8px" }}>
            ¿Eliminar a {personas.find(p => p.id === confirmarEliminar)?.nombre}?
          </p>
          <p style={{ fontSize: 14, color: "#64748B", textAlign: "center", margin: "0 0 20px" }}>
            Se eliminarán también sus asignaciones.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setConfirmarEliminar(null)} style={{
              flex: 1, background: "#F1F5F9", border: "none", borderRadius: 12,
              padding: 13, fontSize: 15, fontWeight: 600, cursor: "pointer", color: "#475569",
            }}>Cancelar</button>
            <button onClick={() => eliminarPersona(confirmarEliminar)} style={{
              flex: 1, background: "#EF4444", border: "none", borderRadius: 12,
              padding: 13, fontSize: 15, fontWeight: 700, cursor: "pointer", color: "white",
            }}>Eliminar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "white", borderRadius: "20px 20px 0 0",
        padding: "24px 20px 40px", width: "100%", maxWidth: 480, boxSizing: "border-box",
      }}>
        {children}
      </div>
    </div>
  );
}

function TareaItem({ texto, hecha, color: c, onToggle }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, background: "white",
      borderRadius: 12, padding: "13px 14px", border: "1.5px solid",
      borderColor: hecha ? "#F1F5F9" : "#E2E8F0",
      opacity: hecha ? 0.65 : 1,
      boxShadow: hecha ? "none" : "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      <button onClick={onToggle} style={{
        width: 24, height: 24, borderRadius: 99, flexShrink: 0,
        border: `2px solid ${hecha ? c.accent : "#CBD5E1"}`,
        background: hecha ? c.accent : "white",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
      }}>
        {hecha && <span style={{ color: "white", fontSize: 13 }}>✓</span>}
      </button>
      <span style={{ flex: 1, fontSize: 15, color: "#1E293B", textDecoration: hecha ? "line-through" : "none" }}>
        {texto}
      </span>
    </div>
  );
}
