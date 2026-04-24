"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { AppointmentResponse, AppointmentStatus, LeadResponse, LeadStatus, Page } from "@/types";

// ── helpers de data ──────────────────────────────────────────
function startOfWeek(d: Date) {
  const r = new Date(d); r.setHours(0,0,0,0);
  r.setDate(r.getDate() - r.getDay()); return r;
}
function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localInputToOffsetIso(input: string) {
  // input: "YYYY-MM-DDTHH:mm" -> return "YYYY-MM-DDTHH:mm:00±HH:MM"
  if (!input) return input;
  const offsetMin = -new Date().getTimezoneOffset(); // minutes offset from UTC (e.g. -180 for UTC-3 => -180)
  const sign = offsetMin >= 0 ? '+' : '-';
  const absMin = Math.abs(offsetMin);
  const oh = String(Math.floor(absMin / 60)).padStart(2, '0');
  const om = String(absMin % 60).padStart(2, '0');
  return `${input}:00${sign}${oh}:${om}`;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}
function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function fmtHour(d: Date) {
  return d.toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" });
}
function fmtDate(d: Date) {
  return d.toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit" });
}
function fmtMonthYear(d: Date) {
  return d.toLocaleDateString("pt-BR", { month:"long", year:"numeric" });
}

// check whether an appointment (with durationMinutes) intersects the hour cell for a given day
function appointmentIntersectsHour(a: AppointmentResponse, day: Date, hour: number) {
  const start = new Date(a.scheduledAt);
  const duration = (a.durationMinutes ?? 60) * 60 * 1000; // minutes to ms, fallback 60 (1 hour)
  const end = new Date(start.getTime() + duration);
  const hourStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0, 0);
  const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
  return start < hourEnd && end > hourStart;
}

function appointmentStartsAtHour(a: AppointmentResponse, hour: number) {
  const start = new Date(a.scheduledAt);
  return start.getHours() === hour;
}

// default includes 8–20 plus night wrap 21–23 and 0–7 so night hours exist even with no appointments
const DEFAULT_HOURS = Array.from({ length: 13 }, (_, i) => i + 8).concat([21,22,23,0,1,2,3,4,5,6,7]);
const WEEKDAYS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const MONTHS_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const STATUS_LABEL: Record<string, string> = {
  AGUARDANDO_PAGAMENTO: "Aguard. pgto", CONFIRMADO: "Confirmado",
  CONCLUIDO: "Concluído", CANCELADO: "Cancelado", NO_SHOW: "No-show", EXPIRADO: "Expirado",
  // lead-only statuses
  NOVO: "Novo", APROVADO: "Aprovado", REJEITADO: "Rejeitado",
};
const STATUS_COLOR: Record<AppointmentStatus, string> = {
  AGUARDANDO_PAGAMENTO: "bg-yellow-100 border-yellow-400 text-yellow-800",
  CONFIRMADO: "bg-green-100 border-green-400 text-green-800",
  CONCLUIDO: "bg-gray-100 border-gray-400 text-gray-600",
  CANCELADO: "bg-red-50 border-red-300 text-red-500",
  NO_SHOW: "bg-red-100 border-red-400 text-red-700",
  EXPIRADO: "bg-gray-50 border-gray-300 text-gray-400",
};
const STATUS_DOT: Record<AppointmentStatus, string> = {
  AGUARDANDO_PAGAMENTO: "bg-yellow-400", CONFIRMADO: "bg-green-500",
  CONCLUIDO: "bg-gray-400", CANCELADO: "bg-red-400",
  NO_SHOW: "bg-red-600", EXPIRADO: "bg-gray-300",
};

// ── Modal de criar/editar agendamento ──────────────────────────
interface ModalProps {
  date?: Date;
  appointment?: AppointmentResponse;
  approvedLeads: LeadResponse[];
  onClose: () => void;
  onSaved: () => void;
}

function AppointmentModal({ date, appointment, approvedLeads, onClose, onSaved }: ModalProps) {
  const isEdit = !!appointment;
  const [form, setForm] = useState<{ leadId: string; scheduledAt: string; durationMinutes?: string | number; totalPrice: string | number; depositAmount: string | number; status: string }>({
    leadId: appointment?.leadId ?? "",
    scheduledAt: appointment
      ? toLocalInputValue(new Date(appointment.scheduledAt))
      : date ? toLocalInputValue(new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes() ?? 0)) : "",
  // leave duration empty for new appointments (use 60-minute fallback only for display)
  durationMinutes: appointment?.durationMinutes ?? "",
    // If editing, prefer appointment.totalPrice; otherwise default to empty string
  totalPrice: appointment?.totalPrice ?? "",
  depositAmount: appointment?.depositAmount ?? "",
    status: appointment?.status ?? "AGUARDANDO_PAGAMENTO",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setLoading(true); setError("");
    try {
    if (isEdit) {
        // If the selected status is an appointment status, call the appointment status endpoint.
        const appointmentStatuses = ["AGUARDANDO_PAGAMENTO","CONFIRMADO","CONCLUIDO","CANCELADO","NO_SHOW","EXPIRADO"];
        if (appointmentStatuses.includes(form.status)) {
          await api.patch(`/api/v1/dashboard/appointments/${appointment!.id}/status?status=${form.status}`);
        } else {
          // otherwise it's a lead-only status; PATCH the lead resource so server synchronizes appointments as needed
          if (appointment!.leadId) {
            await api.patch(`/api/v1/dashboard/leads/${appointment!.leadId}`, { status: form.status });
          }
        }
        const newDate = localInputToOffsetIso(form.scheduledAt);
        if (newDate !== appointment!.scheduledAt) {
          await api.patch(`/api/v1/dashboard/appointments/${appointment!.id}/reschedule?scheduledAt=${encodeURIComponent(newDate)}`);
        }
      } else {
        const payload: any = {
          leadId: form.leadId,
          scheduledAt: localInputToOffsetIso(form.scheduledAt),
        };
        if (form.durationMinutes !== "" && form.durationMinutes != null) payload.durationMinutes = Number(form.durationMinutes);
  if (form.totalPrice !== "" && form.totalPrice != null && !isNaN(Number(form.totalPrice))) payload.totalPrice = Number(form.totalPrice);
  if (form.depositAmount !== "" && form.depositAmount != null && !isNaN(Number(form.depositAmount))) payload.depositAmount = Number(form.depositAmount);
        const resp = await api.post("/api/v1/dashboard/appointments", payload);
        // persist deposit amount on the lead record if provided
        if (form.leadId && form.depositAmount !== "" && !isNaN(Number(form.depositAmount))) {
          try {
            await api.patch(`/api/v1/dashboard/leads/${form.leadId}`, { depositAmount: Number(form.depositAmount) });
          } catch (_) {
            // non-critical: appointment created but could not persist deposit on lead
          }
        }
      }
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erro ao salvar.");
    } finally { setLoading(false); }
  }

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl border border-gray-200 w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-base font-semibold">{isEdit ? "Editar agendamento" : "Novo agendamento"}</h2>
        </div>

        <div className="flex flex-col gap-3">
          {!isEdit && (
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Lead (aprovado)</label>
              <select aria-label="Lead (aprovado)" value={form.leadId} onChange={async e => {
                  const selectedId = e.target.value;
                  // fetch fresh lead from server to ensure deposit and quoted price are up-to-date
                  if (!selectedId) {
                    setForm(f => ({ ...f, leadId: "" }));
                    return;
                  }
                  try {
                    const res = await api.get(`/api/v1/dashboard/leads/${selectedId}`);
                    const lead = res.data as any;
                    setForm(f => ({
                      ...f,
                      leadId: selectedId,
                      totalPrice: lead.quotedPrice != null ? String(lead.quotedPrice) : f.totalPrice,
                      depositAmount: lead.depositAmount != null ? String(lead.depositAmount) : f.depositAmount,
                    }));
                  } catch (err) {
                    // fallback: use local approvedLeads if server fetch fails
                    const lead = approvedLeads.find(l => l.id === selectedId);
                    setForm(f => ({
                      ...f,
                      leadId: selectedId,
                      totalPrice: lead && typeof lead.quotedPrice === 'number' ? String(lead.quotedPrice) : f.totalPrice,
                      depositAmount: lead && typeof lead.depositAmount === 'number' ? String(lead.depositAmount) : f.depositAmount,
                    }));
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required>
                <option value="">Selecione...</option>
                {approvedLeads.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.clientName} — {l.tattooStyle} ({l.bodyPart})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Data e hora</label>
            <input aria-label="Data e hora" placeholder="dd/mm/aaaa hh:mm" type="datetime-local" value={form.scheduledAt}
              onChange={e => setForm(f => ({...f, scheduledAt: e.target.value}))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Duração (minutos)</label>
            <input aria-label="Duração (minutos)" placeholder="Ex: 120" type="number" min={30} step={30} value={form.durationMinutes as any}
              onChange={e => setForm(f => ({...f, durationMinutes: e.target.value === '' ? '' : Number(e.target.value)}))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>

          {!isEdit && (
            <>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Valor total (R$)</label>
                <input aria-label="Valor total (R$)" placeholder="Ex: 350.00" type="number" min={0} value={form.totalPrice}
                  onChange={e => setForm(f => ({...f, totalPrice: e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Valor do sinal (R$)</label>
                <input aria-label="Valor do sinal (R$)" placeholder="Ex: 100.00" type="number" min={0} value={form.depositAmount}
                  onChange={e => setForm(f => ({...f, depositAmount: e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </>
          )}

          {isEdit && (
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Status</label>
              <select aria-label="Status do agendamento" value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value as LeadStatus | AppointmentStatus}))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {Object.keys(STATUS_LABEL).map(s => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50">
            Cancelar
          </button>
          {isEdit && (
            <button
              onClick={async () => {
                if (!confirm('Excluir este agendamento?')) return;
                try {
                  await api.delete(`/api/v1/dashboard/appointments/${appointment!.id}`);
                  onSaved();
                } catch (err: any) {
                  setError(err.response?.data?.detail || 'Erro ao excluir agendamento.');
                }
              }}
              className="px-3 py-2 mr-2 rounded border text-sm text-red-600 hover:bg-red-50"
            >Excluir</button>
          )}
          <button onClick={handleSave} disabled={loading}
            className="flex-1 bg-black text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
            {loading ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────
export default function AgendaPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"week"|"month">("week");
  const [reference, setReference] = useState(new Date());
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [approvedLeads, setApprovedLeads] = useState<LeadResponse[]>([]);
  const [modal, setModal] = useState<{ date?: Date; appointment?: AppointmentResponse } | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapseAfternoon, setCollapseAfternoon] = useState(false);
  const [collapseNight, setCollapseNight] = useState(false);
  const [collapseMadrugada, setCollapseMadrugada] = useState(false);
  const [collapseMorning, setCollapseMorning] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  // persist collapse state keys
  const COLLAPSE_KEYS = {
    afternoon: 'stigma.agenda.collapse.afternoon',
    night: 'stigma.agenda.collapse.night',
    madrugada: 'stigma.agenda.collapse.madrugada',
    morning: 'stigma.agenda.collapse.morning',
  };

  // load persisted collapse state on mount; use `hydrated` to avoid writing defaults before load
  useEffect(() => {
    try {
      const a = localStorage.getItem(COLLAPSE_KEYS.afternoon);
      const n = localStorage.getItem(COLLAPSE_KEYS.night);
      const m = localStorage.getItem(COLLAPSE_KEYS.madrugada);
      const mo = localStorage.getItem(COLLAPSE_KEYS.morning);
      if (a !== null) setCollapseAfternoon(a === '1');
      if (n !== null) setCollapseNight(n === '1');
      if (m !== null) setCollapseMadrugada(m === '1');
      if (mo !== null) setCollapseMorning(mo === '1');
    } catch (_) {}
    // mark hydrated after attempting to read stored prefs
    setHydrated(true);
  }, []);

  // persist whenever collapse toggles change — only after hydrated to avoid overwriting stored prefs with defaults
  useEffect(() => { if (!hydrated) return; try { localStorage.setItem(COLLAPSE_KEYS.afternoon, collapseAfternoon ? '1' : '0'); } catch(_){} }, [collapseAfternoon, hydrated]);
  useEffect(() => { if (!hydrated) return; try { localStorage.setItem(COLLAPSE_KEYS.night, collapseNight ? '1' : '0'); } catch(_){} }, [collapseNight, hydrated]);
  useEffect(() => { if (!hydrated) return; try { localStorage.setItem(COLLAPSE_KEYS.madrugada, collapseMadrugada ? '1' : '0'); } catch(_){} }, [collapseMadrugada, hydrated]);
  useEffect(() => { if (!hydrated) return; try { localStorage.setItem(COLLAPSE_KEYS.morning, collapseMorning ? '1' : '0'); } catch(_){} }, [collapseMorning, hydrated]);

  useEffect(() => { setMounted(true); }, []);

  // header show/hide on scroll (consistent with leads page)
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  useEffect(() => {
    function onScroll() {
      const currentY = window.scrollY || window.pageYOffset;
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const delta = currentY - lastScrollY.current;
          if (Math.abs(delta) > 10) {
            if (currentY > lastScrollY.current && currentY > 50) setShowHeader(false);
            else setShowHeader(true);
            lastScrollY.current = currentY;
          }
          ticking.current = false;
        });
        ticking.current = true;
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated()) { router.replace("/login"); return; }
    fetchAll();
  }, [mounted]);

  async function fetchAll() {
    setLoading(true);
    try {
      const [apptRes, leadsRes] = await Promise.all([
        api.get<AppointmentResponse[]>('/api/v1/dashboard/appointments'),
        // fetch leads without a single status filter then pick allowed statuses client-side
        api.get<Page<LeadResponse>>('/api/v1/dashboard/leads', { params: { size: 200 } }),
      ]);
      setAppointments(apptRes.data);
      // allow leads that are APROVADO, AGUARDANDO_PAGAMENTO or CONFIRMADO to be scheduled
      const allowed = ['APROVADO', 'AGUARDANDO_PAGAMENTO', 'CONFIRMADO'];
      setApprovedLeads(leadsRes.data.content.filter(l => allowed.includes(l.status)));
    } catch { router.replace("/login"); }
    finally { setLoading(false); }
  }

  function apptOnDay(day: Date) {
    return appointments.filter(a => sameDay(new Date(a.scheduledAt), day));
  }

  // ── Navegação ──────────────────────────────────────────────
  function prev() {
    if (view === "week") setReference(d => addDays(d, -7));
    else setReference(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function next() {
    if (view === "week") setReference(d => addDays(d, 7));
    else setReference(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  // ── Vista semanal ──────────────────────────────────────────
  function WeekView() {
    const weekStart = startOfWeek(reference);
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const today = new Date();

    // compute displayed hours: default range plus any appointment hours
    const bySet = (() => {
      const s = new Set<number>(DEFAULT_HOURS);
      appointments.forEach(a => { s.add(new Date(a.scheduledAt).getHours()); });
      return s;
    })();

    // build ordered groups: morning(6-11 including 6-7), afternoon(12-17), night(18-23 then 0-5)
    const morning = Array.from(bySet).filter(h => h === 6 || h === 7 || (h >= 8 && h < 12)).sort((a,b) => a-b);
    const afternoon = Array.from(bySet).filter(h => h >= 12 && h < 18).sort((a,b) => a-b);
    const nightHigh = Array.from(bySet).filter(h => h >= 18 && h <= 23).sort((a,b) => a-b);
    const nightLow = Array.from(bySet).filter(h => h >= 0 && h <= 5).sort((a,b) => a-b);
    const madrugada = nightLow; // 00-05
    const night = nightHigh; // 18-23

    // helper to count unique appointments that fall into a given set of hours across the week
    function countHiddenForHours(hours: number[]) {
      const s = new Set<string>();
      days.forEach(day => {
        appointments.forEach(a => {
          if (hours.some(h => appointmentIntersectsHour(a, day, h))) s.add(String(a.id));
        });
      });
      return s.size;
    }
    const morningHiddenCount = countHiddenForHours(morning);
    const afternoonHiddenCount = countHiddenForHours(afternoon);
    const nightHiddenCount = countHiddenForHours(night);
    const madrugadaHiddenCount = countHiddenForHours(madrugada);

    return (
      // wide grid for desktop/tablet
      <div className="hidden sm:block overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Header dias */}
          <div className="grid grid-cols-8 border-b border-gray-200">
            <div className="py-2" />
            {days.map((day, i) => (
              <div key={i} className={`py-2 text-center text-xs font-medium ${sameDay(day, today) ? "text-black" : "text-gray-500"}`}>
                <div>{WEEKDAYS[day.getDay()]}</div>
                <div className={`mx-auto w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold
                  ${sameDay(day, today) ? "bg-black text-white" : ""}`}>
                  {day.getDate()}
                </div>
              </div>
            ))}
          </div>
          {/* (No separate off-hours row) */}
          {/* Grade de horas */}
          <div className="relative">
            {/* morning header with collapse toggle */}
            <div className="flex items-center justify-between px-2 py-1 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium">Manhã</div>
                {collapseMorning && morningHiddenCount > 0 && (
                  <div className="text-xs bg-gray-200 text-gray-800 px-2 py-0.5 rounded-full">{morningHiddenCount}</div>
                )}
              </div>
              <button onClick={() => setCollapseMorning(c => !c)} className="text-xs text-gray-600 px-2 py-1 rounded border">
                {collapseMorning ? 'Expandir' : 'Colapsar'}
              </button>
            </div>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${collapseMorning ? 'max-h-0' : 'max-h-[1200px]'}`}>
              {morning.map(hour => (
                <div key={`m-${hour}`} className="grid grid-cols-8 border-b border-gray-100 min-h-[56px]">
                  <div className="text-xs text-gray-400 pr-2 pt-1 text-right leading-none">{hour}:00</div>
                  {days.map((day, di) => {
                    const dayAppts = apptOnDay(day).filter(a => appointmentIntersectsHour(a, day, hour));
                    return (
                      <div key={di}
                        className="border-l border-gray-100 px-0.5 pt-0.5 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setModal({ date: new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour) })}>
                        {dayAppts.map(a => (
                          <div key={a.id}
                            onClick={e => { e.stopPropagation(); setModal({ appointment: a }); }}
                            className={`text-xs rounded px-1 py-0.5 mb-0.5 border-l-2 cursor-pointer truncate ${STATUS_COLOR[a.status]}`}>
                            <span className="font-medium">{appointmentStartsAtHour(a, hour) ? fmtHour(new Date(a.scheduledAt)) : ''}</span> {a.clientName}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* afternoon header with collapse toggle */}
            <div className="flex items-center justify-between px-2 py-1 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium">Tarde</div>
                {collapseAfternoon && afternoonHiddenCount > 0 && (
                  <div className="text-xs bg-gray-200 text-gray-800 px-2 py-0.5 rounded-full">{afternoonHiddenCount}</div>
                )}
              </div>
              <button onClick={() => setCollapseAfternoon(c => !c)} className="text-xs text-gray-600 px-2 py-1 rounded border">
                {collapseAfternoon ? 'Expandir' : 'Colapsar'}
              </button>
            </div>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${collapseAfternoon ? 'max-h-0' : 'max-h-[1600px]'}`}>
              {afternoon.map(hour => (
                <div key={`a-${hour}`} className="grid grid-cols-8 border-b border-gray-100 min-h-[56px]">
                  <div className="text-xs text-gray-400 pr-2 pt-1 text-right leading-none">{hour}:00</div>
                  {days.map((day, di) => {
                    const dayAppts = apptOnDay(day).filter(a => appointmentIntersectsHour(a, day, hour));
                    return (
                      <div key={di}
                        className="border-l border-gray-100 px-0.5 pt-0.5 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setModal({ date: new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour) })}>
                        {dayAppts.map(a => (
                          <div key={a.id}
                            onClick={e => { e.stopPropagation(); setModal({ appointment: a }); }}
                            className={`text-xs rounded px-1 py-0.5 mb-0.5 border-l-2 cursor-pointer truncate ${STATUS_COLOR[a.status]}`}>
                            <span className="font-medium">{appointmentStartsAtHour(a, hour) ? fmtHour(new Date(a.scheduledAt)) : ''}</span> {a.clientName}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* night header with collapse toggle */}
            <div className="flex items-center justify-between px-2 py-1 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium">Noite</div>
                {collapseNight && nightHiddenCount > 0 && (
                  <div className="text-xs bg-gray-200 text-gray-800 px-2 py-0.5 rounded-full">{nightHiddenCount}</div>
                )}
              </div>
              <button onClick={() => setCollapseNight(c => !c)} className="text-xs text-gray-600 px-2 py-1 rounded border">
                {collapseNight ? 'Expandir' : 'Colapsar'}
              </button>
            </div>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${collapseNight ? 'max-h-0' : 'max-h-[1600px]'}`}>
              {night.map(hour => (
                <div key={`n-${hour}`} className="grid grid-cols-8 border-b border-gray-100 min-h-[56px]">
                  <div className="text-xs text-gray-400 pr-2 pt-1 text-right leading-none">{hour}:00</div>
                  {days.map((day, di) => {
                    const dayAppts = apptOnDay(day).filter(a => appointmentIntersectsHour(a, day, hour));
                    return (
                      <div key={di}
                        className="border-l border-gray-100 px-0.5 pt-0.5 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setModal({ date: new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour) })}>
                        {dayAppts.map(a => (
                          <div key={a.id}
                            onClick={e => { e.stopPropagation(); setModal({ appointment: a }); }}
                            className={`text-xs rounded px-1 py-0.5 mb-0.5 border-l-2 cursor-pointer truncate ${STATUS_COLOR[a.status]}`}>
                            <span className="font-medium">{appointmentStartsAtHour(a, hour) ? fmtHour(new Date(a.scheduledAt)) : ''}</span> {a.clientName}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* madrugada header with collapse toggle (00:00-05:00) */}
            <div className="flex items-center justify-between px-2 py-1 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium">Madrugada</div>
                {collapseMadrugada && madrugadaHiddenCount > 0 && (
                  <div className="text-xs bg-gray-200 text-gray-800 px-2 py-0.5 rounded-full">{madrugadaHiddenCount}</div>
                )}
              </div>
              <button onClick={() => setCollapseMadrugada(c => !c)} className="text-xs text-gray-600 px-2 py-1 rounded border">
                {collapseMadrugada ? 'Expandir' : 'Colapsar'}
              </button>
            </div>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${collapseMadrugada ? 'max-h-0' : 'max-h-[1200px]'}`}>
              {madrugada.map(hour => (
                <div key={`md-${hour}`} className="grid grid-cols-8 border-b border-gray-100 min-h-[56px]">
                  <div className="text-xs text-gray-400 pr-2 pt-1 text-right leading-none">{hour}:00</div>
                  {days.map((day, di) => {
                    const dayAppts = apptOnDay(day).filter(a => appointmentIntersectsHour(a, day, hour));
                    return (
                      <div key={di}
                        className="border-l border-gray-100 px-0.5 pt-0.5 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setModal({ date: new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour) })}>
                        {dayAppts.map(a => (
                          <div key={a.id}
                            onClick={e => { e.stopPropagation(); setModal({ appointment: a }); }}
                            className={`text-xs rounded px-1 py-0.5 mb-0.5 border-l-2 cursor-pointer truncate ${STATUS_COLOR[a.status]}`}>
                            <span className="font-medium">{appointmentStartsAtHour(a, hour) ? fmtHour(new Date(a.scheduledAt)) : ''}</span> {a.clientName}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // compact stacked view for mobile: days stacked with appointment cards
  function CompactWeekView() {
    const weekStart = startOfWeek(reference);
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const today = new Date();

    return (
      <div className="block sm:hidden">
        <div className="flex flex-col gap-3">
          {days.map((day, i) => {
            const dayAppts = apptOnDay(day);
            return (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-xs text-gray-500">{WEEKDAYS[day.getDay()]}</div>
                    <div className={`text-sm font-semibold ${sameDay(day, today) ? 'text-black' : 'text-gray-700'}`}>{fmtDate(day)}</div>
                  </div>
                  <div className="text-xs text-gray-500">{fmtMonthYear(day)}</div>
                </div>

                {dayAppts.length === 0 ? (
                  <div className="text-xs text-gray-400">Nenhum agendamento</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {dayAppts.map(a => (
                      <div key={a.id} onClick={() => setModal({ appointment: a })} className={`p-2 rounded border ${STATUS_COLOR[a.status]} cursor-pointer`}> 
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium truncate">{a.clientName}</div>
                          <div className="text-xs text-gray-600">{fmtHour(new Date(a.scheduledAt))}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 truncate">{a.tattooStyle || ''}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Vista mensal ──────────────────────────────────────────
  function MonthView() {
    const firstDay = startOfMonth(reference);
    const lastDay = endOfMonth(reference);
    const startPad = firstDay.getDay();
    const totalCells = Math.ceil((startPad + lastDay.getDate()) / 7) * 7;
    const cells = Array.from({ length: totalCells }, (_, i) => addDays(firstDay, i - startPad));
    const today = new Date();

    return (
      <div>
        <div className="grid grid-cols-7 border-b border-gray-200">
          {WEEKDAYS.map(d => (
            <div key={d} className="py-2 text-center text-xs font-medium text-gray-500">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const isCurrentMonth = day.getMonth() === reference.getMonth();
            const dayAppts = apptOnDay(day);
            return (
              <div key={i}
                onClick={() => setModal({ date: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 10) })}
                className={`min-h-[90px] border-b border-r border-gray-100 p-1 cursor-pointer hover:bg-gray-50 transition-colors
                  ${!isCurrentMonth ? "bg-gray-50" : ""}`}>
                <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs mb-1
                  ${sameDay(day, today) ? "bg-black text-white font-semibold" : isCurrentMonth ? "text-gray-700" : "text-gray-300"}`}>
                  {day.getDate()}
                </div>
                {dayAppts.slice(0,3).map(a => (
                  <div key={a.id}
                    onClick={e => { e.stopPropagation(); setModal({ appointment: a }); }}
                    className="flex items-center gap-1 mb-0.5 cursor-pointer group">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[a.status]}`} />
                    <span className="text-xs truncate text-gray-700 group-hover:text-black">{a.clientName}</span>
                  </div>
                ))}
                {dayAppts.length > 3 && (
                  <span className="text-xs text-gray-400">+{dayAppts.length - 3} mais</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className={`fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 transform-gpu transition-all duration-300 ease-in-out ${showHeader ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
  <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 sm:grid sm:grid-cols-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-lg font-semibold truncate">Agenda</span>
            <Link href="/dashboard/leads" className="hidden sm:inline-block text-sm bg-black text-white px-3 py-1.5 rounded-lg hover:bg-gray-800">
              Dashboard
            </Link>
          </div>

          <div className="flex justify-center">
            <h1 className="text-lg font-semibold hidden sm:block">Stigma</h1>
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            <button onClick={() => setModal({ date: new Date() })}
              className="text-sm bg-black text-white px-3 py-1.5 rounded-lg hover:bg-gray-800">
              + Agendamento
            </button>
          </div>
        </div>
      </header>

      <div className="h-16 sm:h-16" aria-hidden />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Controles de navegação */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={prev}
              className="px-2 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">←</button>
            <button onClick={() => setReference(new Date())}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Hoje</button>
            <button onClick={next}
              className="px-2 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">→</button>
            <span className="text-sm font-medium text-gray-700 ml-2 capitalize">
              {view === "week"
                ? `${fmtDate(startOfWeek(reference))} – ${fmtDate(addDays(startOfWeek(reference), 6))}`
                : fmtMonthYear(reference)}
            </span>
          </div>
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button onClick={() => setView("week")}
              className={`px-3 py-1.5 text-sm transition-colors ${view==="week" ? "bg-black text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
              Semana
            </button>
            <button onClick={() => setView("month")}
              className={`px-3 py-1.5 text-sm transition-colors ${view==="month" ? "bg-black text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
              Mês
            </button>
          </div>
        </div>

        {/* Calendário */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">Carregando...</div>
          ) : view === "week" ? (
            <>
              <WeekView />
              <CompactWeekView />
            </>
          ) : (
            <>
              <MonthView />
            </>
          )}
        </div>

        {/* Legenda */}
        <div className="flex gap-4 mt-3 flex-wrap">
          {(Object.entries(STATUS_DOT) as [AppointmentStatus, string][]).map(([s, dot]) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${dot}`} />
              <span className="text-xs text-gray-500">{STATUS_LABEL[s]}</span>
            </div>
          ))}
        </div>
      </main>

      {modal && (
        <AppointmentModal
          date={modal.date}
          appointment={modal.appointment}
          approvedLeads={approvedLeads}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchAll(); }}
        />
      )}

      {/* Mobile-only floating button to go to Leads */}
      <button
        onClick={() => router.push('/dashboard/leads')}
        className="fixed right-4 bottom-6 z-40 sm:hidden bg-black text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
        aria-label="Ir para leads"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>
    </div>
  );
}