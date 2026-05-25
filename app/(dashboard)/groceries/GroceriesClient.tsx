"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { ShoppingCart, Plus, Trash2, Check, Camera, Loader2, Receipt, ChevronDown, ChevronUp, Store, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import type { GroceryItem, Receipt as ReceiptType } from "@/lib/types";

interface Props {
  userId: string;
  weekStart: string;
  weekLabel: string;
  items: GroceryItem[];
  budget: { id: string; amount: number } | null;
  profiles: { id: string; name: string }[];
  receipts: ReceiptType[];
}

export default function GroceriesClient({ userId, weekStart, weekLabel, items, budget, profiles, receipts }: Props) {
  const [tab, setTab] = useState<"list" | "receipts">("list");
  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [saving, setSaving] = useState(false);

  // Receipt scanning state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [scanResult, setScanResult] = useState<ReceiptType | null>(null);
  const [savingReceipt, setSavingReceipt] = useState(false);
  const [expandedReceipt, setExpandedReceipt] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const router = useRouter();

  const totalSpent = items.reduce((sum, i) => sum + (i.price || 0), 0);
  const budgetLeft = (budget?.amount ?? 0) - totalSpent;
  const checkedCount = items.filter((i) => i.checked).length;

  function getUserName(id: string) {
    return profiles.find((p) => p.id === id)?.name ?? "?";
  }

  function notify(message: string, url: string) {
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, url }),
    });
  }

  async function addItem() {
    if (!newName.trim()) return;
    setSaving(true);
    const label = newQty.trim() ? `${newName.trim()} (${newQty.trim()})` : newName.trim();
    await supabase.from("grocery_items").insert({
      week_start: weekStart,
      name: newName.trim(),
      quantity: newQty.trim() || null,
      price: parseFloat(newPrice) || 0,
      checked: false,
      added_by: userId,
    });
    notify(`a ajouté "${label}" dans la liste de courses`, "/groceries");
    setNewName("");
    setNewQty("");
    setNewPrice("");
    setSaving(false);
    router.refresh();
  }

  async function toggleItem(item: GroceryItem) {
    const newState = !item.checked;
    await supabase.from("grocery_items").update({ checked: newState }).eq("id", item.id);
    notify(
      newState ? `a coché "${item.name}" dans la liste de courses` : `a décoché "${item.name}" dans la liste de courses`,
      "/groceries"
    );
    router.refresh();
  }

  async function updatePrice(id: string, price: string, name: string) {
    const val = parseFloat(price);
    if (!isNaN(val)) {
      await supabase.from("grocery_items").update({ price: val }).eq("id", id);
      notify(`a mis à jour le prix de "${name}" à ${val.toFixed(2)}€`, "/groceries");
      router.refresh();
    }
  }

  async function deleteItem(id: string, name: string) {
    await supabase.from("grocery_items").delete().eq("id", id);
    notify(`a supprimé "${name}" de la liste de courses`, "/groceries");
    router.refresh();
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setScanResult(null);
  }

  async function analyzeReceipt() {
    if (!imageFile) return;
    setAnalyzing(true);
    try {
      const fd = new FormData();
      fd.append("image", imageFile);
      const res = await fetch("/api/analyze-receipt", { method: "POST", body: fd });
      const data = await res.json();
      if (data.items) {
        setScanResult(data);
      }
    } catch {}
    setAnalyzing(false);
  }

  async function saveReceipt() {
    if (!scanResult) return;
    setSavingReceipt(true);
    try {
      let photoUrl: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `receipts/${userId}/${Date.now()}.${ext}`;
        const { data: uploadData } = await supabase.storage
          .from("meal-photos")
          .upload(path, imageFile, { upsert: true });
        if (uploadData) {
          const { data: urlData } = supabase.storage.from("meal-photos").getPublicUrl(path);
          photoUrl = urlData.publicUrl;
        }
      }

      const { data: receipt, error } = await supabase
        .from("receipts")
        .insert({
          user_id: userId,
          store_name: scanResult.store_name ?? null,
          date: scanResult.date ?? new Date().toISOString().split("T")[0],
          total: scanResult.total ?? 0,
          photo_url: photoUrl,
        })
        .select()
        .single();

      if (receipt && !error) {
        const itemsToInsert = (scanResult.items ?? []).map((item) => ({
          receipt_id: receipt.id,
          name: item.name,
          quantity: item.quantity ?? null,
          price: item.price ?? 0,
        }));
        if (itemsToInsert.length > 0) {
          await supabase.from("receipt_items").insert(itemsToInsert);
        }
        const store = scanResult.store_name ? ` chez ${scanResult.store_name}` : "";
        const total = Number(scanResult.total ?? 0).toFixed(2);
        notify(`a enregistré un ticket de caisse${store} — ${total}€`, "/groceries");
      }

      setImageFile(null);
      setImagePreview(null);
      setScanResult(null);
      router.refresh();
    } catch {}
    setSavingReceipt(false);
  }

  async function deleteReceipt(id: string, storeName: string) {
    await supabase.from("receipts").delete().eq("id", id);
    notify(`a supprimé le ticket de caisse${storeName ? ` de ${storeName}` : ""}`, "/groceries");
    router.refresh();
  }

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-brand-500" />
          Courses
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">{weekLabel}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab("list")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            tab === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >
          📋 Liste de courses
        </button>
        <button
          onClick={() => setTab("receipts")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1",
            tab === "receipts" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >
          🧾 Tickets de caisse
          {receipts.length > 0 && (
            <span className="bg-brand-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {receipts.length}
            </span>
          )}
        </button>
      </div>

      {/* ===== LIST TAB ===== */}
      {tab === "list" && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card text-center">
              <div className="text-2xl font-bold text-gray-900">{items.length}</div>
              <div className="text-xs text-gray-500 mt-0.5">Articles</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-brand-600">{totalSpent.toFixed(2)} €</div>
              <div className="text-xs text-gray-500 mt-0.5">Total</div>
            </div>
            <div className={cn("card text-center", budgetLeft < 0 && "bg-red-50")}>
              <div className={cn("text-2xl font-bold", budgetLeft < 0 ? "text-red-500" : "text-gray-900")}>
                {budget?.amount ? `${budgetLeft.toFixed(2)} €` : "—"}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Reste budget</div>
            </div>
          </div>

          {/* Add item form */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-3">Ajouter un article</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                className="input flex-[3]"
                placeholder="Nom (ex: Poulet)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem()}
              />
              <input
                type="text"
                className="input flex-1"
                placeholder="Qté (ex: 2kg)"
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
              />
              <input
                type="number"
                className="input flex-1"
                placeholder="Prix (€)"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                step="0.01"
                min="0"
              />
              <button className="btn-primary flex items-center gap-1" onClick={addItem} disabled={saving}>
                <Plus className="w-4 h-4" />
                {saving ? "..." : "Ajouter"}
              </button>
            </div>
          </div>

          {/* Items to buy */}
          {unchecked.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-3">À acheter ({unchecked.length})</h2>
              <div className="space-y-2">
                {unchecked.map((item) => (
                  <GroceryRow
                    key={item.id}
                    item={item}
                    addedBy={getUserName(item.added_by)}
                    onToggle={() => toggleItem(item)}
                    onDelete={() => deleteItem(item.id, item.name)}
                    onPriceChange={(p) => updatePrice(item.id, p, item.name)}
                    showUser={profiles.length > 1}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Done */}
          {checked.length > 0 && (
            <div className="card opacity-70">
              <h2 className="font-semibold text-gray-500 mb-3">Fait ({checkedCount}/{items.length})</h2>
              <div className="space-y-2">
                {checked.map((item) => (
                  <GroceryRow
                    key={item.id}
                    item={item}
                    addedBy={getUserName(item.added_by)}
                    onToggle={() => toggleItem(item)}
                    onDelete={() => deleteItem(item.id, item.name)}
                    onPriceChange={(p) => updatePrice(item.id, p, item.name)}
                    showUser={profiles.length > 1}
                  />
                ))}
              </div>
            </div>
          )}

          {items.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>La liste est vide. Ajoute des articles !</p>
            </div>
          )}
        </>
      )}

      {/* ===== RECEIPTS TAB ===== */}
      {tab === "receipts" && (
        <>
          {/* Scanner */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Camera className="w-4 h-4 text-brand-500" />
              Scanner un ticket de caisse
            </h2>

            <div className="flex flex-wrap gap-3 items-start">
              <button
                className="btn-secondary flex items-center gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="w-4 h-4" />
                {imageFile ? "Changer la photo" : "Prendre / choisir une photo"}
              </button>

              {imageFile && !analyzing && !scanResult && (
                <button className="btn-primary flex items-center gap-2" onClick={analyzeReceipt}>
                  <Receipt className="w-4 h-4" />
                  Analyser avec IA
                </button>
              )}

              {analyzing && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Lecture du ticket en cours...
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleImageChange}
            />

            {imagePreview && (
              <div className="mt-3 relative w-40 h-56 rounded-xl overflow-hidden border border-gray-200">
                <Image src={imagePreview} alt="ticket" fill className="object-cover" />
              </div>
            )}

            {/* Scan result preview */}
            {scanResult && (
              <div className="mt-4 border border-brand-200 bg-brand-50/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    {scanResult.store_name && (
                      <div className="flex items-center gap-1 text-sm font-semibold text-gray-800">
                        <Store className="w-4 h-4 text-brand-500" />
                        {scanResult.store_name}
                      </div>
                    )}
                    {scanResult.date && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {scanResult.date}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-brand-600">{Number(scanResult.total ?? 0).toFixed(2)} €</div>
                    <div className="text-xs text-gray-400">Total</div>
                  </div>
                </div>

                <div className="space-y-1">
                  {(scanResult.items ?? []).map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                      <span className="text-gray-700">
                        {item.name}
                        {item.quantity && <span className="text-gray-400 ml-1">({item.quantity})</span>}
                      </span>
                      <span className="font-medium text-gray-800">{Number(item.price ?? 0).toFixed(2)} €</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                    onClick={saveReceipt}
                    disabled={savingReceipt}
                  >
                    {savingReceipt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {savingReceipt ? "Enregistrement..." : "Enregistrer ce ticket"}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => { setScanResult(null); setImageFile(null); setImagePreview(null); }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Receipts history */}
          {receipts.length > 0 ? (
            <div className="space-y-3">
              <h2 className="font-semibold text-gray-700">Historique des tickets</h2>
              {receipts.map((receipt) => (
                <div key={receipt.id} className="card">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedReceipt(expandedReceipt === receipt.id ? null : receipt.id)}
                  >
                    <div className="flex items-start gap-3">
                      {receipt.photo_url && (
                        <div className="relative w-12 h-16 rounded-lg overflow-hidden flex-shrink-0">
                          <Image src={receipt.photo_url} alt="ticket" fill className="object-cover" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1 font-semibold text-gray-900">
                          <Store className="w-4 h-4 text-brand-500" />
                          {receipt.store_name ?? "Magasin inconnu"}
                        </div>
                        {receipt.date && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            {new Date(receipt.date + "T12:00:00").toLocaleDateString("fr-FR", {
                              weekday: "long", day: "numeric", month: "long", year: "numeric"
                            })}
                          </div>
                        )}
                        <div className="text-sm font-bold text-brand-600 mt-1">{Number(receipt.total ?? 0).toFixed(2)} €</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteReceipt(receipt.id, receipt.store_name ?? ""); }}
                        className="text-gray-300 hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {expandedReceipt === receipt.id
                        ? <ChevronUp className="w-4 h-4 text-gray-400" />
                        : <ChevronDown className="w-4 h-4 text-gray-400" />
                      }
                    </div>
                  </div>

                  {expandedReceipt === receipt.id && receipt.items && receipt.items.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100 space-y-1">
                      {receipt.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm py-1">
                          <span className="text-gray-700">
                            {item.name}
                            {item.quantity && <span className="text-gray-400 ml-1">({item.quantity})</span>}
                          </span>
                          <span className="font-medium text-gray-800">{Number(item.price ?? 0).toFixed(2)} €</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-semibold text-sm pt-2 border-t border-gray-200 mt-2">
                        <span>Total</span>
                        <span className="text-brand-600">{Number(receipt.total ?? 0).toFixed(2)} €</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucun ticket scanné pour l&apos;instant.</p>
              <p className="text-sm mt-1">Prends une photo de ton prochain ticket !</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GroceryRow({
  item,
  addedBy,
  onToggle,
  onDelete,
  onPriceChange,
  showUser,
}: {
  item: GroceryItem;
  addedBy: string;
  onToggle: () => void;
  onDelete: () => void;
  onPriceChange: (p: string) => void;
  showUser: boolean;
}) {
  const [price, setPrice] = useState(item.price?.toString() ?? "0");

  return (
    <div className={cn("flex items-center gap-3 py-2 px-1 rounded-xl hover:bg-gray-50 group transition-colors", item.checked && "opacity-60")}>
      <button
        onClick={onToggle}
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
          item.checked ? "bg-brand-500 border-brand-500 text-white" : "border-gray-300 hover:border-brand-400"
        )}
      >
        {item.checked && <Check className="w-3 h-3" />}
      </button>

      <div className="flex-1 min-w-0">
        <span className={cn("text-sm font-medium", item.checked && "line-through text-gray-400")}>
          {item.name}
        </span>
        {item.quantity && <span className="text-xs text-gray-400 ml-2">{item.quantity}</span>}
        {showUser && <span className="text-xs text-brand-400 ml-2">{addedBy}</span>}
      </div>

      <input
        type="number"
        className="w-20 text-sm border border-gray-200 rounded-lg px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-brand-400"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        onBlur={() => onPriceChange(price)}
        step="0.01"
        min="0"
      />
      <span className="text-xs text-gray-400">€</span>

      <button
        onClick={onDelete}
        className="text-gray-300 hover:text-red-400 transition-all sm:opacity-0 sm:group-hover:opacity-100"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
