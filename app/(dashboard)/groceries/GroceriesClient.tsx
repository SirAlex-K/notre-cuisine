"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { ShoppingCart, Plus, Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GroceryItem } from "@/lib/types";

interface Props {
  userId: string;
  weekStart: string;
  weekLabel: string;
  items: GroceryItem[];
  budget: { id: string; amount: number } | null;
  profiles: { id: string; name: string }[];
}

export default function GroceriesClient({ userId, weekStart, weekLabel, items, budget, profiles }: Props) {
  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const totalSpent = items.reduce((sum, i) => sum + (i.price || 0), 0);
  const budgetLeft = (budget?.amount ?? 0) - totalSpent;
  const checkedCount = items.filter((i) => i.checked).length;

  function getUserName(id: string) {
    return profiles.find((p) => p.id === id)?.name ?? "?";
  }

  async function addItem() {
    if (!newName.trim()) return;
    setSaving(true);
    await supabase.from("grocery_items").insert({
      week_start: weekStart,
      name: newName.trim(),
      quantity: newQty.trim() || null,
      price: parseFloat(newPrice) || 0,
      checked: false,
      added_by: userId,
    });
    setNewName("");
    setNewQty("");
    setNewPrice("");
    setSaving(false);
    router.refresh();
  }

  async function toggleItem(item: GroceryItem) {
    await supabase.from("grocery_items").update({ checked: !item.checked }).eq("id", item.id);
    router.refresh();
  }

  async function updatePrice(id: string, price: string) {
    const val = parseFloat(price);
    if (!isNaN(val)) {
      await supabase.from("grocery_items").update({ price: val }).eq("id", id);
      router.refresh();
    }
  }

  async function deleteItem(id: string) {
    await supabase.from("grocery_items").delete().eq("id", id);
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
          <h2 className="font-semibold text-gray-900 mb-3">
            À acheter ({unchecked.length})
          </h2>
          <div className="space-y-2">
            {unchecked.map((item) => (
              <GroceryRow
                key={item.id}
                item={item}
                addedBy={getUserName(item.added_by)}
                onToggle={() => toggleItem(item)}
                onDelete={() => deleteItem(item.id)}
                onPriceChange={(p) => updatePrice(item.id, p)}
                showUser={profiles.length > 1}
              />
            ))}
          </div>
        </div>
      )}

      {/* Done */}
      {checked.length > 0 && (
        <div className="card opacity-70">
          <h2 className="font-semibold text-gray-500 mb-3">
            Fait ({checkedCount}/{items.length})
          </h2>
          <div className="space-y-2">
            {checked.map((item) => (
              <GroceryRow
                key={item.id}
                item={item}
                addedBy={getUserName(item.added_by)}
                onToggle={() => toggleItem(item)}
                onDelete={() => deleteItem(item.id)}
                onPriceChange={(p) => updatePrice(item.id, p)}
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
        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
