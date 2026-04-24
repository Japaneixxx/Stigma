"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { removeToken, isAuthenticated } from "@/lib/auth";
import { LeadResponse, LeadStatus, Page } from "@/types";

const STATUS_LABEL: Record<LeadStatus, string> = {
  NOVO: "Novo",
  APROVADO: "Aprovado",
  REJEITADO: "Rejeitado",
  AGUARDANDO_PAGAMENTO: "Aguard. pagamento",
  CONFIRMADO: "Confirmado",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
  NO_SHOW: "No-show",
  EXPIRADO: "Expirado",
};

const STATUS_COLOR: Record<LeadStatus, string> = {
  NOVO: "bg-blue-100 text-blue-700",
  APROVADO: "bg-green-100 text-green-700",
  REJEITADO: "bg-red-100 text-red-700",
  AGUARDANDO_PAGAMENTO: "bg-yellow-100 text-yellow-700",
  CONFIRMADO: "bg-green-100 text-green-800",
  CONCLUIDO: "bg-gray-100 text-gray-700",
  CANCELADO: "bg-gray-100 text-gray-500",
  NO_SHOW: "bg-red-100 text-red-500",
  EXPIRADO: "bg-gray-100 text-gray-400",
};

// ── helpers ───────────────────────────────────────────────
function sanitizePhone(phone?: string) {
  if (!phone) return "";
  // remove everything except digits
  return phone.replace(/\D/g, "");
}

function whatsappUrl(phone?: string, text?: string) {
  let num = sanitizePhone(phone);
  if (!num) return "";
  // ensure country code 55 is present
  if (!num.startsWith("55")) num = `55${num}`;
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${num}${q}`;
}

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<LeadResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LeadStatus | "">("");
  
  const [quotePrice, setQuotePrice] = useState("");
  const [editingLead, setEditingLead] = useState<LeadResponse | null>(null);
  const [creatingLead, setCreatingLead] = useState<boolean>(false);
  const [newClientName, setNewClientName] = useState<string>("");
  const [newClientWhatsapp, setNewClientWhatsapp] = useState<string>("");
  const [newClientEmail, setNewClientEmail] = useState<string>("");
  const [newTattooStyle, setNewTattooStyle] = useState<string>("");
  const [newBodyPart, setNewBodyPart] = useState<string>("");
  const [newEstimatedSize, setNewEstimatedSize] = useState<string>("");
  const [newDescription, setNewDescription] = useState<string>("");
  const [newReferenceImageUrl, setNewReferenceImageUrl] = useState<string>("");
  const [editQuotedPrice, setEditQuotedPrice] = useState<string>("");
  const [editDepositAmount, setEditDepositAmount] = useState<string>("");
  const [editTattooistNotes, setEditTattooistNotes] = useState<string>("");
  const [editStatus, setEditStatus] = useState<LeadStatus | "">("");
  const [editEstimatedSize, setEditEstimatedSize] = useState<string>("");
  const [editTattooStyle, setEditTattooStyle] = useState<string>("");
  const [editBodyPart, setEditBodyPart] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/login"); return; }
    fetchLeads();
  }, [filter]);

  async function fetchLeads() {
    setLoading(true);
    try {
      const params = filter ? { status: filter } : {};
      const { data } = await api.get<Page<LeadResponse>>("/api/v1/dashboard/leads", { params });
      setLeads(data.content);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  async function approve(id: string) {
    try {
      // send quotedPrice only when provided; allow approving without a price
      const payload = quotePrice ? { quotedPrice: parseFloat(quotePrice) } : {};
      await api.patch(`/api/v1/dashboard/leads/${id}/approve`, payload);
      setQuotePrice("");
      fetchLeads();
    } catch (err: any) {
      console.error("Approve error:", err.response || err);
      const statusCode = err.response?.status;
      const detail = err.response?.data?.detail || err.response?.data || err.message;
      if (statusCode === 422) {
        // common business error for invalid status transition
        if (String(detail).includes('Transição de status') || String(detail).includes('Só é possível')) {
          alert('Não foi possível aprovar este lead. Apenas leads com status "Novo" podem ser aprovados. Atualize a lista e verifique o status atual do lead.');
        } else {
          alert(String(detail) || 'Erro ao aprovar.');
        }
      } else {
        alert(String(detail) || 'Erro ao aprovar.');
      }
    }
  }

  async function reject(id: string) {
    if (!confirm("Rejeitar este lead?")) return;
    try {
      await api.patch(`/api/v1/dashboard/leads/${id}/reject`);
      fetchLeads();
    } catch (err: any) {
      const statusCode = err.response?.status;
      const detail = err.response?.data?.detail || err.response?.data || err.message;
      if (statusCode === 422 && (String(detail).includes('Transição de status') || String(detail).includes('Só é possível'))) {
        alert('Não foi possível rejeitar este lead. Apenas leads com status "Novo" podem ser rejeitados. Atualize a lista e verifique o status atual do lead.');
      } else {
        alert(String(detail) || 'Erro ao rejeitar.');
      }
    }
  }

  function logout() {
    removeToken();
    router.push("/login");
  }

  // show header/fab based on scroll direction
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    function onScroll() {
      const currentY = window.scrollY || window.pageYOffset;
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const delta = currentY - lastScrollY.current;
          // small threshold to avoid jitter
          if (Math.abs(delta) > 10) {
            if (currentY > lastScrollY.current && currentY > 50) {
              // scrolled down
              setShowHeader(false);
            } else {
              // scrolled up
              setShowHeader(true);
            }
            lastScrollY.current = currentY;
          }
          ticking.current = false;
        });
        ticking.current = true;
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
  <header className={`fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 transform-gpu transition-all duration-300 ease-in-out ${showHeader ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
  <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 sm:grid sm:grid-cols-3">
          {/* left controls */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-lg font-semibold truncate">Dashboard</span>
            <Link href="/dashboard/agenda" className="hidden sm:inline-block text-sm bg-black text-white px-3 py-1.5 rounded-lg hover:bg-gray-800">
              Agenda
            </Link>
          </div>

          {/* centered title (hidden on small screens to avoid overlap) */}
          <div className="flex justify-center">
            <h1 className="text-lg font-semibold hidden sm:block">Stigma</h1>
          </div>

          {/* right actions */}
          <div className="flex items-center justify-end gap-3 shrink-0">
            <button onClick={logout} className="text-sm text-gray-500 hover:text-black">
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* spacer to offset fixed header height (keeps content from jumping) */}
      <div className="h-16 sm:h-16" aria-hidden />

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Filters + Add button (responsive) */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex gap-2 flex-wrap pb-2">
            {(["", "NOVO", "APROVADO", "REJEITADO", "AGUARDANDO_PAGAMENTO", "CONFIRMADO"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  filter === s
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
                }`}
              >
                {s === "" ? "Todos" : STATUS_LABEL[s]}
              </button>
            ))}
          </div>

          <div className="w-full sm:w-auto">
            <button
              onClick={() => setCreatingLead(true)}
              className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 w-full sm:w-auto"
            >Adicionar Tatuagem</button>
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <p className="text-sm text-gray-400">Carregando...</p>
        ) : leads.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum lead encontrado.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {leads.map((lead) => (
              <div key={lead.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm break-words">{lead.clientName}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[lead.status]}`}>
                        {STATUS_LABEL[lead.status]}
                      </span>
                    </div>
                      <p className="text-xs text-gray-500 break-words">
                        {lead.tattooStyle} · {lead.bodyPart} · {lead.estimatedSizeCm}cm
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 break-words">{lead.clientWhatsapp}</p>
                    {lead.description && (
                        <p className="text-xs text-gray-600 mt-1 break-words">{lead.description}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 sm:flex-col sm:gap-1 items-center sm:items-end mt-3 sm:mt-0">
                    {lead.clientWhatsapp && (
                      <a
                        href={whatsappUrl(lead.clientWhatsapp, `Olá ${lead.clientName}, estou entrando em contato sobre sua tatuagem...`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 flex items-center gap-2"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                          <path d="M20.52 3.48A11.93 11.93 0 0012 0C5.37 0 .01 5.37.01 12a11.9 11.9 0 001.64 6.02L3 21l1.18-0.31A11.93 11.93 0 0012 24c6.63 0 12-5.37 12-12 0-3.2-1.25-6.2-3.48-8.52z" />
                          <path d="M16.5 14.5c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.78.97-.96 1.17-.18.2-.36.2-.66.07-.3-.13-1.27-.47-2.42-1.48-.9-.8-1.5-1.78-1.68-2.08-.18-.3-.02-.46.13-.6.13-.13.3-.36.45-.54.15-.18.2-.3.3-.5.1-.2 0-.37-.02-.5-.02-.13-.67-1.6-.92-2.19-.24-.57-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.5.07-.77.37-.27.3-1.04 1.02-1.04 2.47 0 1.45 1.06 2.86 1.21 3.06.15.2 2.09 3.2 5.06 4.49 2.97 1.29 2.97.86 3.5.8.53-.06 1.73-.7 1.98-1.37.25-.67.25-1.25.18-1.37-.07-.12-.27-.2-.57-.35z" />
                        </svg>
                        Whatsapp
                      </a>
                    )}

                    <button
                      onClick={() => {
                        setEditingLead(lead);
                        setEditQuotedPrice(lead.quotedPrice?.toString() || "");
                        setEditDepositAmount(lead.depositAmount?.toString() || "");
                        setEditTattooistNotes(lead.tattooistNotes || "");
                        setEditStatus(lead.status);
                        setEditEstimatedSize(lead.estimatedSizeCm?.toString() || "");
                        setEditTattooStyle(lead.tattooStyle || "");
                        setEditBodyPart(lead.bodyPart || "");
                        setEditDescription(lead.description || "");
                      }}
                      className="text-xs border border-gray-300 text-gray-600 px-3 py-1 rounded hover:border-gray-500"
                    >
                      Editar
                    </button>

                    {lead.status === "NOVO" && (
                      <>
                        <button
                          onClick={() => approve(lead.id)}
                          className="text-xs bg-black text-white px-3 py-1 rounded hover:bg-gray-800"
                        >
                          Aprovar
                        </button>
                        <button
                          onClick={() => reject(lead.id)}
                          className="text-xs border border-gray-300 text-gray-600 px-3 py-1 rounded hover:border-red-400 hover:text-red-600"
                        >
                          Rejeitar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Edit modal */}
        {editingLead && (
          <div onClick={() => setEditingLead(null)} className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg w-full max-w-md p-4 max-h-[80vh] overflow-hidden">
              <h2 className="text-lg font-semibold mb-3">Editar lead</h2>
              <div className="grid grid-cols-1 gap-3 overflow-auto pr-2 max-h-[calc(80vh-120px)]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-600">Orçamento (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editQuotedPrice}
                      onChange={(e) => setEditQuotedPrice(e.target.value)}
                      aria-label="Orçamento"
                      className="border rounded px-3 py-2 w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-600">Valor do sinal (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editDepositAmount}
                      onChange={(e) => setEditDepositAmount(e.target.value)}
                      aria-label="Valor do sinal"
                      className="border rounded px-3 py-2 w-full"
                    />
                  </div>
                </div>

                <label className="text-xs text-gray-600">Notas do tatuador</label>
                <textarea
                  value={editTattooistNotes}
                  onChange={(e) => setEditTattooistNotes(e.target.value)}
                  aria-label="Notas do tatuador"
                  className="border rounded px-3 py-2 h-24"
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-600">Tamanho estimado (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editEstimatedSize}
                      onChange={(e) => setEditEstimatedSize(e.target.value)}
                      aria-label="Tamanho estimado"
                      className="border rounded px-3 py-2 w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-600">Local do corpo</label>
                    <input
                      value={editBodyPart}
                      onChange={(e) => setEditBodyPart(e.target.value)}
                      aria-label="Local do corpo"
                      className="border rounded px-3 py-2 w-full"
                    />
                  </div>
                </div>

                <label className="text-xs text-gray-600">Estilo da tatuagem</label>
                <input
                  value={editTattooStyle}
                  onChange={(e) => setEditTattooStyle(e.target.value)}
                  aria-label="Estilo da tatuagem"
                  className="border rounded px-3 py-2 w-full"
                />

                <label className="text-xs text-gray-600">Descrição</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  aria-label="Descrição"
                  className="border rounded px-3 py-2 h-24 w-full"
                />

                <label className="text-xs text-gray-600">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as LeadStatus)}
                  aria-label="Status do lead"
                  className="border rounded px-3 py-2"
                >
                  <option value="">— Selecionar —</option>
                  {Object.keys(STATUS_LABEL).map((k) => (
                    <option key={k} value={k}>{STATUS_LABEL[k as LeadStatus]}</option>
                  ))}
                </select>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <div>
                  <button
                    onClick={async () => {
                      if (!confirm('Excluir este lead? Esta ação não pode ser desfeita.')) return;
                      try {
                        await api.delete(`/api/v1/dashboard/leads/${editingLead.id}`);
                        setEditingLead(null);
                        fetchLeads();
                      } catch (err: any) {
                        alert(err.response?.data?.detail || 'Erro ao excluir lead.');
                      }
                    }}
                    className="px-3 py-1 rounded border text-sm text-red-600 hover:bg-red-50"
                  >Excluir</button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingLead(null)}
                    className="px-3 py-1 rounded border text-sm"
                  >Cancelar</button>
                  <button
                    onClick={async () => {
                      try {
                        const payload: any = {};
                          if (editQuotedPrice) payload.quotedPrice = parseFloat(editQuotedPrice);
                          if (editDepositAmount) payload.depositAmount = parseFloat(editDepositAmount);
                          if (editTattooistNotes) payload.tattooistNotes = editTattooistNotes;
                        if (editStatus) payload.status = editStatus;
                        if (editEstimatedSize) payload.estimatedSizeCm = parseFloat(editEstimatedSize);
                        if (editTattooStyle) payload.tattooStyle = editTattooStyle;
                        if (editBodyPart) payload.bodyPart = editBodyPart;
                        if (editDescription) payload.description = editDescription;
                        await api.patch(`/api/v1/dashboard/leads/${editingLead.id}`, payload);
                        setEditingLead(null);
                        fetchLeads();
                      } catch (err: any) {
                        const statusCode = err.response?.status;
                        const detail = err.response?.data?.detail || err.response?.data || err.message;
                        if (statusCode === 422 && (String(detail).includes('Transição de status') || String(detail).includes('Só é possível'))) {
                          const current = editingLead?.status || 'desconhecido';
                          alert(`Não foi possível alterar o status para o valor solicitado. Status atual: "${current}". Somente é permitido mudar de "Novo" para "Aprovado" ou "Rejeitado".`);
                        } else {
                          alert(String(detail) || 'Erro ao atualizar lead.');
                        }
                      }
                    }}
                    className="px-3 py-1 rounded bg-black text-white text-sm"
                  >Salvar</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Create modal */}
        {creatingLead && (
          <div onClick={() => setCreatingLead(false)} className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg w-full max-w-md p-4 max-h-[80vh] overflow-hidden">
              <h2 className="text-lg font-semibold mb-3">Adicionar lead manualmente</h2>
              <div className="grid grid-cols-1 gap-3 overflow-auto pr-2 max-h-[calc(80vh-120px)]">
                <label className="text-xs text-gray-600">Nome do cliente</label>
                <input aria-label="Nome do cliente" placeholder="Ex: Maria" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} className="border rounded px-3 py-2" />

                <label className="text-xs text-gray-600">WhatsApp</label>
                <input aria-label="WhatsApp do cliente" placeholder="Ex: +5511999999999" value={newClientWhatsapp} onChange={(e) => setNewClientWhatsapp(e.target.value)} className="border rounded px-3 py-2" />

                <label className="text-xs text-gray-600">Email (opcional)</label>
                <input aria-label="Email do cliente" placeholder="(opcional)" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} className="border rounded px-3 py-2" />

                <label className="text-xs text-gray-600">Estilo da tatuagem</label>
                <input aria-label="Estilo da tatuagem" placeholder="Ex: Blackwork" value={newTattooStyle} onChange={(e) => setNewTattooStyle(e.target.value)} className="border rounded px-3 py-2" />

                <label className="text-xs text-gray-600">Local do corpo</label>
                <input aria-label="Local do corpo" placeholder="Ex: Braço" value={newBodyPart} onChange={(e) => setNewBodyPart(e.target.value)} className="border rounded px-3 py-2" />

                <label className="text-xs text-gray-600">Tamanho estimado (cm)</label>
                <input type="number" step="0.1" aria-label="Tamanho estimado" placeholder="Ex: 12.5" value={newEstimatedSize} onChange={(e) => setNewEstimatedSize(e.target.value)} className="border rounded px-3 py-2" />

                <label className="text-xs text-gray-600">Descrição (opcional)</label>
                <textarea aria-label="Descrição" placeholder="(opcional)" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className="border rounded px-3 py-2 h-24" />

                <label className="text-xs text-gray-600">Imagem de referência (URL opcional)</label>
                <input aria-label="URL da imagem de referência" placeholder="(opcional) https://..." value={newReferenceImageUrl} onChange={(e) => setNewReferenceImageUrl(e.target.value)} className="border rounded px-3 py-2" />
              </div>

              <div className="mt-3 flex items-center justify-end gap-2">
                <button onClick={() => setCreatingLead(false)} className="px-3 py-1 rounded border text-sm">Cancelar</button>
                <button
                  onClick={async () => {
                    try {
                      const payload: any = {
                        clientName: newClientName,
                        clientWhatsapp: newClientWhatsapp,
                        clientEmail: newClientEmail || undefined,
                        tattooStyle: newTattooStyle,
                        bodyPart: newBodyPart,
                        estimatedSizeCm: newEstimatedSize ? parseFloat(newEstimatedSize) : undefined,
                        description: newDescription || undefined,
                        referenceImageUrl: newReferenceImageUrl || undefined,
                      };
                      await api.post('/api/v1/dashboard/leads', payload);
                      setCreatingLead(false);
                      // reset fields
                      setNewClientName(''); setNewClientWhatsapp(''); setNewClientEmail(''); setNewTattooStyle(''); setNewBodyPart(''); setNewEstimatedSize(''); setNewDescription(''); setNewReferenceImageUrl('');
                      fetchLeads();
                    } catch (err: any) {
                      alert(err.response?.data?.detail || 'Erro ao criar lead. Verifique os campos.');
                    }
                  }}
                  className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
                >Criar</button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile-only floating Agenda button */}
      <Link
        href="/dashboard/agenda"
        className={`fixed right-4 bottom-6 z-40 sm:hidden bg-black text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg transform-gpu transition-all duration-300 ease-in-out ${showHeader ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0 pointer-events-none'}`}
        aria-label="Abrir agenda"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </Link>
    </div>
  );
}
