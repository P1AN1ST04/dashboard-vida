/**
 * src/components/modals/AddTransactionModal.tsx — CRUD transacciones.
 *
 * Portado de add-transaction-modal.jsx. Si `transaction` viene, es edit;
 * si es null/undefined, es creación. Auto-categorización stub (sin AutoCat
 * todavía — entra en Bloque H junto con sync engine).
 */

import { useEffect, useState, type FormEvent } from "react";
import { useApp } from "@/hooks/useApp";
import { useCollection } from "@/hooks/useStore";
import { Icon } from "@/components/ui/Icon";
import {
  Storage, todayISO, CATEGORIES, PAYMENT_METHODS,
} from "@/lib";
import type { Transaction, Currency, PaymentMethod } from "@/types";

type TxType = "income" | "expense";

export interface AddTransactionModalProps {
  transaction?: Transaction | null;
  onClose: () => void;
}

export function AddTransactionModal({ transaction: tx, onClose }: AddTransactionModalProps) {
  const { lang } = useApp();
  const settings = useCollection("settings");
  const isEdit = !!tx;
  const defaultCurrency: Currency = settings?.currency ?? "PEN";

  const [type, setType]             = useState<TxType>(tx ? (tx.amt > 0 ? "income" : "expense") : "expense");
  const [amount, setAmount]         = useState(tx ? String(Math.abs(tx.amt)) : "");
  const [currency, setCurrency]     = useState<Currency>(tx?.currency ?? defaultCurrency);
  const [category, setCategory]     = useState(tx?.cat ?? "");
  const [description, setDescription] = useState(tx ? (tx.merchant_es || tx.merchant_en || "") : "");
  const [date, setDate]             = useState(tx?.date ?? todayISO());
  const [method, setMethod]         = useState<PaymentMethod>(tx?.method ?? "card");
  const [notes, setNotes]           = useState(tx?.notes ?? "");
  const [error, setError]           = useState<string | null>(null);

  const visibleCategories = CATEGORIES.filter((c) =>
    type === "income" ? c.type === "income" : c.type === "expense",
  );

  // Si la categoría actual no aplica al tipo, ajustar.
  useEffect(() => {
    if (!category && visibleCategories[0]) {
      setCategory(visibleCategories[0].key);
      return;
    }
    if (category && !visibleCategories.some((c) => c.key === category)) {
      setCategory(visibleCategories[0]?.key ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError(lang === "es" ? "Monto inválido" : "Invalid amount");
      return;
    }
    if (!category) {
      setError(lang === "es" ? "Elige una categoría" : "Pick a category");
      return;
    }
    if (!date) {
      setError(lang === "es" ? "Fecha requerida" : "Date required");
      return;
    }
    const merchant = description.trim() || (lang === "es" ? "Sin descripción" : "No description");
    const payload = {
      date,
      merchant_es: merchant,
      merchant_en: merchant,
      cat: category,
      amt: type === "income" ? amt : -amt,
      currency,
      method,
      notes: notes || undefined,
    };
    if (isEdit && tx) {
      Storage.update("transactions", tx.id, payload);
    } else {
      Storage.add("transactions", payload);
    }
    onClose();
  }

  function handleDelete() {
    if (!isEdit || !tx) return;
    const msg = lang === "es" ? "Borrar esta transacción?" : "Delete this transaction?";
    if (window.confirm(msg)) {
      Storage.remove("transactions", tx.id);
      onClose();
    }
  }

  return (
    <div className="modal-scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ maxWidth: 480, padding: 24, maxHeight: "90vh", overflowY: "auto" }}>
        <button type="button" className="ob-close" onClick={onClose} aria-label="close">
          <Icon name="x" size={14} />
        </button>
        <div className="kicker" style={{ marginBottom: 4 }}>
          {isEdit
            ? (lang === "es" ? "Editar movimiento" : "Edit transaction")
            : (lang === "es" ? "Nuevo movimiento" : "New transaction")}
        </div>
        <div className="h2" style={{ marginBottom: 20 }}>
          {type === "income"
            ? (lang === "es" ? "Ingreso" : "Income")
            : (lang === "es" ? "Gasto" : "Expense")}
        </div>

        <form onSubmit={handleSubmit} className="tx-form">
          <div className="form-row">
            <div className="seg">
              <button
                type="button"
                className={`seg-btn ${type === "expense" ? "on" : ""}`}
                onClick={() => setType("expense")}
              >
                {lang === "es" ? "Gasto" : "Expense"}
              </button>
              <button
                type="button"
                className={`seg-btn ${type === "income" ? "on" : ""}`}
                onClick={() => setType("income")}
              >
                {lang === "es" ? "Ingreso" : "Income"}
              </button>
            </div>
          </div>

          <div className="form-row">
            <label className="form-label">{lang === "es" ? "Monto" : "Amount"}</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="number" step="0.01" min="0"
                className="input mono" placeholder="0.00"
                value={amount} onChange={(e) => setAmount(e.target.value)}
                autoFocus required style={{ flex: 1 }}
              />
              <select
                className="input"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                style={{ width: 110 }}
              >
                <option value="PEN">S/ PEN</option>
                <option value="USD">$ USD</option>
                <option value="MXN">$ MXN</option>
                <option value="EUR">€ EUR</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <label className="form-label">{lang === "es" ? "Descripción" : "Description"}</label>
            <input
              type="text" className="input"
              placeholder={lang === "es" ? "Ej. Café, Uber, alquiler..." : "e.g. Coffee, Uber, rent..."}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-row">
            <label className="form-label">{lang === "es" ? "Categoría" : "Category"}</label>
            <select
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              {visibleCategories.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.emoji} {lang === "es" ? c.name_es : c.name_en}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row" style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">{lang === "es" ? "Fecha" : "Date"}</label>
              <input
                type="date" className="input"
                value={date} onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">{lang === "es" ? "Método" : "Method"}</label>
              <select
                className="input"
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.key} value={m.key}>
                    {lang === "es" ? m.name_es : m.name_en}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <label className="form-label">
              {lang === "es" ? "Notas (opcional)" : "Notes (optional)"}
            </label>
            <textarea
              className="input" rows={2}
              value={notes} onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="form-actions">
            {isEdit && (
              <button type="button" className="btn danger" onClick={handleDelete}>
                {lang === "es" ? "Borrar" : "Delete"}
              </button>
            )}
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button type="button" className="btn" onClick={onClose}>
                {lang === "es" ? "Cancelar" : "Cancel"}
              </button>
              <button type="submit" className="btn warm">
                {isEdit
                  ? (lang === "es" ? "Guardar" : "Save")
                  : (lang === "es" ? "Agregar" : "Add")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddTransactionModal;
