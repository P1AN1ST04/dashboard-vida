/**
 * src/components/modals/CsvImportModal.tsx — Importa transacciones desde CSV.
 *
 * Pipeline:
 *   1. Drop/pick CSV
 *   2. Detect bank por headers (BCP/BBVA/Interbank/Scotiabank/generic)
 *   3. Parse rows → candidatos de Transaction
 *   4. Detect duplicates contra Storage
 *   5. Preview con checkboxes
 *   6. Commit a Storage
 *
 * AutoCat (sugerencia inteligente de categoría) entra en Bloque H. Por ahora
 * cae a "cat_other" si no podemos detectar mejor.
 */

import { useState, type ChangeEvent, type DragEvent } from "react";
import { useApp } from "@/hooks/useApp";
import { Icon } from "@/components/ui/Icon";
import { Storage, fmtDateShort, fmtMoney } from "@/lib";
import type { Transaction, Currency, PaymentMethod } from "@/types";

type Step = "upload" | "preview" | "done";

interface ParsedRow {
  date: string;
  amt: number;
  merchant_es: string;
  merchant_en: string;
  method: PaymentMethod;
  currency: Currency;
  cat: string;
  _dup: boolean;
}

// ─────────────────────────────────────────────────────────────────
// Parser CSV — comillas dobles + comas en campos
// ─────────────────────────────────────────────────────────────────
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (inQuote) {
      if (c === '"' && next === '"') { field += '"'; i++; }
      else if (c === '"') { inQuote = false; }
      else { field += c; }
    } else {
      if (c === '"') { inQuote = true; }
      else if (c === ",") { current.push(field); field = ""; }
      else if (c === "\n") { current.push(field); rows.push(current); current = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else { field += c; }
    }
  }
  if (field.length > 0 || current.length > 0) {
    current.push(field);
    rows.push(current);
  }
  return rows.filter((r) => r.length > 0 && r.some((c) => c.trim().length > 0));
}

function detectBank(headers: string[]): string {
  const h = headers.map((x) => x.toLowerCase().trim()).join("|");
  if (h.includes("fecha") && h.includes("monto") && h.includes("descripcion")) {
    if (h.includes("operacion")) return "bcp";
    if (h.includes("oficina") || h.includes("comercio")) return "bbva";
    if (h.includes("referencia")) return "interbank";
  }
  if (h.includes("date") && h.includes("amount")) return "generic-en";
  return "generic";
}

function parseDate(s: string): string | null {
  if (!s) return null;
  s = s.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = "20" + y;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

function parseAmount(s: string): number | null {
  if (!s) return null;
  let str = String(s).replace(/[^\d.,-]/g, "").trim();
  if (!str) return null;
  if (str.includes(",") && str.includes(".")) {
    str = str.replace(/,/g, "");
  } else if (str.includes(",") && !str.includes(".")) {
    str = str.replace(",", ".");
  }
  const n = parseFloat(str);
  return isNaN(n) ? null : n;
}

function rowsToTransactions(rows: string[][]): Omit<ParsedRow, "_dup">[] {
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.toLowerCase().trim());
  const dataRows = rows.slice(1);
  const idx = {
    date:    headers.findIndex((h) => h.includes("fecha") || h.includes("date")),
    amount:  headers.findIndex((h) => h.includes("monto") || h.includes("importe") || h.includes("amount")),
    description: headers.findIndex((h) =>
      h.includes("descripcion") || h.includes("description") || h.includes("operacion") || h.includes("concepto"),
    ),
  };

  return dataRows
    .map((row): Omit<ParsedRow, "_dup"> | null => {
      const date = idx.date >= 0 ? parseDate(row[idx.date]) : null;
      const amount = idx.amount >= 0 ? parseAmount(row[idx.amount]) : null;
      const description = idx.description >= 0 ? (row[idx.description] || "").trim() : "";
      if (!date || amount === null) return null;
      return {
        date,
        amt: amount,
        merchant_es: description,
        merchant_en: description,
        method: "transfer",
        currency: "PEN",
        cat: "cat_other",
      };
    })
    .filter((r): r is Omit<ParsedRow, "_dup"> => r !== null);
}

function isDuplicate(tx: Omit<ParsedRow, "_dup">, existing: Transaction[]): boolean {
  return existing.some((e) =>
    e.date === tx.date &&
    Math.abs(e.amt - tx.amt) < 0.01 &&
    (e.merchant_es || "").trim().toLowerCase() === (tx.merchant_es || "").trim().toLowerCase(),
  );
}

// ─────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────

export interface CsvImportModalProps {
  onClose: () => void;
}

export function CsvImportModal({ onClose }: CsvImportModalProps) {
  const { lang } = useApp();
  const [step, setStep] = useState<Step>("upload");
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [dupCount, setDupCount] = useState(0);
  const [bankDetected, setBankDetected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importedCount, setImportedCount] = useState(0);

  function handleFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) {
      setError(lang === "es" ? "Solo archivos CSV" : "Only CSV files");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = String(e.target?.result || "");
        const rows = parseCSV(text);
        if (rows.length < 2) {
          setError(lang === "es" ? "CSV vacío o sin datos" : "Empty CSV");
          return;
        }
        const bank = detectBank(rows[0]);
        setBankDetected(bank);
        const txs = rowsToTransactions(rows);
        const existing = Storage.get("transactions");
        let dups = 0;
        const flagged: ParsedRow[] = txs.map((t) => {
          const dup = isDuplicate(t, existing);
          if (dup) dups++;
          return { ...t, _dup: dup };
        });
        setParsed(flagged);
        setDupCount(dups);
        setSelected(new Set(flagged.map((_, i) => i).filter((i) => !flagged[i]._dup)));
        setStep("preview");
      } catch (err) {
        setError(`Error parsing CSV: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function handleImport() {
    let count = 0;
    parsed.forEach((tx, i) => {
      if (!selected.has(i)) return;
      const { _dup: _omit, ...clean } = tx;
      void _omit;
      Storage.add("transactions", clean);
      count++;
    });
    setImportedCount(count);
    setStep("done");
  }

  function toggleRow(i: number) {
    const s = new Set(selected);
    if (s.has(i)) s.delete(i);
    else s.add(i);
    setSelected(s);
  }

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    handleFile(e.target.files?.[0]);
  }
  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  }

  return (
    <div className="modal-scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ maxWidth: 740, padding: 24, maxHeight: "90vh", overflowY: "auto" }}>
        <button type="button" className="ob-close" onClick={onClose} aria-label="close">
          <Icon name="x" size={14} />
        </button>
        <div className="kicker">{lang === "es" ? "IMPORTAR CSV" : "IMPORT CSV"}</div>
        <div className="h2" style={{ marginBottom: 18 }}>
          {lang === "es" ? "Trae tus transacciones del banco" : "Bring your bank transactions"}
        </div>

        {step === "upload" && (
          <div>
            <div
              className="csv-drop"
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
            >
              <div style={{ fontSize: 36 }}>📁</div>
              <div className="serif" style={{ fontSize: 18, marginTop: 8 }}>
                {lang === "es" ? "Arrastra tu CSV aquí" : "Drag your CSV here"}
              </div>
              <div className="caption" style={{ marginTop: 6 }}>
                {lang === "es" ? "o" : "or"}
              </div>
              <label
                className="btn warm"
                style={{ marginTop: 10, display: "inline-block", cursor: "pointer" }}
              >
                {lang === "es" ? "Selecciona archivo" : "Pick file"}
                <input
                  type="file" accept=".csv"
                  onChange={onPick}
                  style={{ display: "none" }}
                />
              </label>
            </div>
            {error && <div className="form-error" style={{ marginTop: 14 }}>{error}</div>}
            <div className="caption" style={{ marginTop: 20, lineHeight: 1.5 }}>
              {lang === "es"
                ? "Compatible con CSVs de BCP, BBVA, Interbank, Scotiabank. La app detecta el formato automáticamente."
                : "Compatible with BCP, BBVA, Interbank, Scotiabank CSVs."}
            </div>
          </div>
        )}

        {step === "preview" && (
          <div>
            <div className="caption" style={{ marginBottom: 14 }}>
              {lang === "es"
                ? `Detectado: ${bankDetected} · ${parsed.length} transacciones (${dupCount} duplicados omitidos)`
                : `Detected: ${bankDetected} · ${parsed.length} transactions (${dupCount} duplicates skipped)`}
            </div>
            <div style={{
              maxHeight: 380, overflowY: "auto",
              border: "1px solid var(--line)", borderRadius: "var(--radius-sm)",
            }}>
              {parsed.map((tx, i) => (
                <label
                  key={i}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 12px", borderBottom: "1px solid var(--line-soft)",
                    cursor: "pointer", opacity: tx._dup ? 0.4 : 1,
                    background: selected.has(i) ? "var(--paper-2)" : "transparent",
                  }}
                >
                  <input type="checkbox" checked={selected.has(i)} onChange={() => toggleRow(i)} />
                  <span className="meta" style={{ width: 80 }}>{fmtDateShort(tx.date, lang)}</span>
                  <span style={{
                    flex: 1, fontSize: 13, overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{tx.merchant_es}</span>
                  <span className="caption" style={{ width: 100 }}>{tx.cat}</span>
                  <span
                    className="num"
                    style={{
                      width: 90, textAlign: "right",
                      color: tx.amt > 0 ? "var(--sage)" : "var(--ink)",
                    }}
                  >
                    {fmtMoney(tx.amt)}
                  </span>
                  {tx._dup && (
                    <span
                      className="badge-auto"
                      style={{ background: "var(--terracotta-soft)", color: "var(--rust)" }}
                    >DUP</span>
                  )}
                </label>
              ))}
            </div>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setStep("upload")}>
                {lang === "es" ? "Atrás" : "Back"}
              </button>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button type="button" className="btn" onClick={onClose}>
                  {lang === "es" ? "Cancelar" : "Cancel"}
                </button>
                <button type="button" className="btn warm" onClick={handleImport}>
                  {lang === "es" ? `Importar ${selected.size}` : `Import ${selected.size}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "done" && (
          <div style={{ textAlign: "center", padding: 24 }}>
            <div style={{ fontSize: 48 }}>✓</div>
            <div className="serif" style={{ fontSize: 24, marginTop: 12 }}>
              {lang === "es"
                ? `${importedCount} transacciones importadas`
                : `${importedCount} transactions imported`}
            </div>
            <button type="button" className="btn warm" style={{ marginTop: 20 }} onClick={onClose}>
              {lang === "es" ? "Listo" : "Done"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CsvImportModal;
