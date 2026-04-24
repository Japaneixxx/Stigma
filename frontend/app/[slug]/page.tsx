"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";

type ErrorState = {
  userMessage: string;
  technical?: string;
  code?: number | string;
  fieldErrors?: Record<string, string>;
};

const STYLES = ["Realismo", "Old School", "New School", "Blackwork", "Aquarela", "Geométrico", "Oriental", "Tribal", "Minimalista", "Outro"];
const BODY_PARTS = ["Braço", "Antebraço", "Mão", "Perna", "Panturrilha", "Pé", "Costas", "Peito", "Costela", "Pescoço", "Outro"];

export default function LandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState({
    clientName: "",
    clientWhatsapp: "",
    clientEmail: "",
    tattooStyle: "",
    bodyPart: "",
    estimatedSizeCm: "",
    description: "",
  });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const sanitizePhone = (raw: string) => {
    if (!raw) return raw;
    const trimmed = raw.trim();
    // keep digits only for normalization
    let digits = trimmed.replace(/\D/g, "");

    // if user included country code 55 (Brasil), drop it and keep DDD + number
    if (digits.startsWith("55") && digits.length > 10) {
      digits = digits.slice(2);
    }

    // remove any leading trunk zeros
    digits = digits.replace(/^0+/, "");

    // If we have DDD + 8-digit subscriber (10 digits), insert '9' after DDD
    if (digits.length === 10) {
      digits = digits.slice(0, 2) + "9" + digits.slice(2);
    } else if (digits.length === 11) {
      // ensure the subscriber starts with '9' (common in BR mobile numbers)
      if (digits[2] !== "9") {
        digits = digits.slice(0, 2) + "9" + digits.slice(2);
      }
    }

    // return the normalized digits (no country code, no formatting)
    return digits;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post(`/api/v1/tattooists/${slug}/leads`, {
        ...form,
        clientWhatsapp: sanitizePhone(form.clientWhatsapp),
        estimatedSizeCm: parseFloat(form.estimatedSizeCm),
      });
      setSent(true);
    } catch (err: any) {
      // build a more helpful error state for users and developers
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail || err?.message;

      let userMessage = "Erro ao enviar. Tente novamente.";
      let fieldErrors: Record<string, string> | undefined = undefined;
      if (status === 404) userMessage = "Tatuador não encontrado — verifique se o link está correto.";
      else if (status === 400) {
        userMessage = "Alguns campos estão incorretos.";
        // backend sets a property `errors` with a map field->message
        fieldErrors = err?.response?.data?.errors;
      } else if (status === 429) userMessage = "Muitas solicitações — por favor aguarde um momento e tente novamente.";
      else if (!status) userMessage = "Erro de rede — verifique sua conexão e tente novamente.";

      setError({ userMessage, technical: String(detail), code: status, fieldErrors });
      // Helpful console log for developers
      console.error("Lead submit error", { status, detail, err });
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">✓</div>
          <h2 className="text-xl font-semibold mb-2">Solicitação enviada!</h2>
          <p className="text-sm text-gray-500">
            Entraremos em contato pelo WhatsApp em breve.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-xl border border-gray-200 p-8">
        <h1 className="text-xl font-semibold mb-1">Solicitar orçamento</h1>
        <p className="text-sm text-gray-500 mb-6">Preencha as informações abaixo e entraremos em contato.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Nome completo</label>
            <input
              type="text"
              value={form.clientName}
              onChange={set("clientName")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              required
            />
            {error?.fieldErrors?.clientName && <p className="text-xs text-red-600 mt-1">{error.fieldErrors.clientName}</p>}
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">WhatsApp</label>
            <input
              type="tel"
              value={form.clientWhatsapp}
              onChange={set("clientWhatsapp")}
              placeholder="11999999999"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              required
            />
            {error?.fieldErrors?.clientWhatsapp && <p className="text-xs text-red-600 mt-1">{error.fieldErrors.clientWhatsapp}</p>}
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Email (opcional)</label>
            <input
              type="email"
              value={form.clientEmail}
              onChange={set("clientEmail")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
            {error?.fieldErrors?.clientEmail && <p className="text-xs text-red-600 mt-1">{error.fieldErrors.clientEmail}</p>}
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Estilo da tatuagem</label>
            <select
              value={form.tattooStyle}
              onChange={set("tattooStyle")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              required
            >
              <option value="">Selecione...</option>
              {STYLES.map((s) => <option key={s}>{s}</option>)}
            </select>
            {error?.fieldErrors?.tattooStyle && <p className="text-xs text-red-600 mt-1">{error.fieldErrors.tattooStyle}</p>}
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Local do corpo</label>
            <select
              value={form.bodyPart}
              onChange={set("bodyPart")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              required
            >
              <option value="">Selecione...</option>
              {BODY_PARTS.map((b) => <option key={b}>{b}</option>)}
            </select>
            {error?.fieldErrors?.bodyPart && <p className="text-xs text-red-600 mt-1">{error.fieldErrors.bodyPart}</p>}
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Tamanho estimado (cm)</label>
            <input
              type="number"
              min="1"
              max="100"
              value={form.estimatedSizeCm}
              onChange={set("estimatedSizeCm")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              required
            />
            {error?.fieldErrors?.estimatedSizeCm && <p className="text-xs text-red-600 mt-1">{error.fieldErrors.estimatedSizeCm}</p>}
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Descrição / referências</label>
            <textarea
              value={form.description}
              onChange={set("description")}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
            />
            {error?.fieldErrors?.description && <p className="text-xs text-red-600 mt-1">{error.fieldErrors.description}</p>}
          </div>

          {error && (
            <div className="text-sm text-red-600">
              {/* Mensagem simples e direta para usuários leigos */}
              <p className="font-medium">{error.userMessage}</p>
              
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Enviando..." : "Enviar solicitação"}
          </button>
        </form>
      </div>
    </main>
  );
}
