"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { setToken } from "@/lib/auth";
import { AuthResponse } from "@/types";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    whatsapp: "",
    slug: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post<AuthResponse>("/api/v1/auth/register", form);
      setToken(data.token);
      router.push("/dashboard/leads");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-xl border border-gray-200 p-8">
        <h1 className="text-xl font-semibold mb-6">Stigma — Criar conta</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {[
            { label: "Nome", key: "name", type: "text" },
            { label: "Email", key: "email", type: "email" },
            { label: "Senha", key: "password", type: "password" },
            { label: "WhatsApp", key: "whatsapp", type: "text", placeholder: "11999999999" },
            { label: "Slug (URL pública)", key: "slug", type: "text", placeholder: "joao-tattoo" },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="text-sm text-gray-600 mb-1 block">{label}</label>
              <input
                type={type}
                value={(form as any)[key]}
                onChange={set(key)}
                placeholder={placeholder}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                required
              />
            </div>
          ))}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Criando..." : "Criar conta"}
          </button>
        </form>

        <p className="text-sm text-center text-gray-500 mt-4">
          Já tem conta?{" "}
          <a href="/login" className="text-black font-medium underline">
            Entrar
          </a>
        </p>
      </div>
    </main>
  );
}
