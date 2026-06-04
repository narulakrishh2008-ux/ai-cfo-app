"use client";
import { useState } from "react";

const categories = [
  "Food & Bakery", "Travel & Tourism", "Clothing & Boutique",
  "Hotel & Rooms", "Restaurant", "Salon & Beauty",
  "Education", "Healthcare", "Retail", "Other"
];

export default function Expenses() {
  const [items, setItems] = useState([
    { id: 1, name: "Chocolate Cake", category: "Food & Bakery", cost: 200, price: 500, qty: 45 },
    { id: 2, name: "Paris Tour Package", category: "Travel & Tourism", cost: 45000, price: 75000, qty: 3 },
    { id: 3, name: "Silk Saree", category: "Clothing & Boutique", cost: 2500, price: 5500, qty: 12 },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", category: "Other", cost: "", price: "", qty: "" });
  const [activeTab, setActiveTab] = useState("overview");

  const addItem = () => {
    if (!form.name || !form.cost || !form.price || !form.qty) return;
    setItems([...items, {
      id: items.length + 1,
      name: form.name,
      category: form.category,
      cost: Number(form.cost),
      price: Number(form.price),
      qty: Number(form.qty)
    }]);
    setForm({ name: "", category: "Other", cost: "", price: "", qty: "" });
    setShowForm(false);
  };

  const totalRevenue = items.reduce((a, i) => a + (i.price * i.qty), 0);
  const totalCost = items.reduce((a, i) => a + (i.cost * i.qty), 0);
  const totalProfit = totalRevenue - totalCost;
  const avgMargin = Math.round((totalProfit / totalRevenue) * 100);

  return (
    <div className="p-8 bg-gray-950 min-h-screen text-white">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold">💰 Expenses & Profit</h2>
          <p className="text-gray-400">Track cost vs revenue for every product or service</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="bg-green-600 hover:bg-green-500 px-6 py-3 rounded-xl font-semibold">
          + Add Product / Service
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <p className="text-gray-400 text-sm">Total Revenue</p>
          <p className="text-2xl font-bold text-white mt-1">₹{totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <p className="text-gray-400 text-sm">Total Cost</p>
          <p className="text-2xl font-bold text-red-400 mt-1">₹{totalCost.toLocaleString()}</p>
        </div>
        <div className="bg-gray-900 rounded-2xl p-5 border border-green-900">
          <p className="text-gray-400 text-sm">Total Profit</p>
          <p className="text-2xl font-bold text-green-400 mt-1">₹{totalProfit.toLocaleString()}</p>
        </div>
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <p className="text-gray-400 text-sm">Avg Margin</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">{avgMargin}%</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 mb-6">
        {["overview", "best", "worst"].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-xl font-medium capitalize transition-all ${activeTab === tab ? "bg-green-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
            {tab === "overview" ? "📊 All Items" : tab === "best" ? "🏆 Most Profitable" : "⚠️ Low Margin"}
          </button>
        ))}
      </div>

      {/* Items Table */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-sm">
              <th className="text-left p-4">Product / Service</th>
              <th className="text-left p-4">Category</th>
              <th className="text-right p-4">Cost</th>
              <th className="text-right p-4">Price</th>
              <th className="text-right p-4">Qty Sold</th>
              <th className="text-right p-4">Revenue</th>
              <th className="text-right p-4">Profit</th>
              <th className="text-right p-4">Margin</th>
            </tr>
          </thead>
          <tbody>
            {items
              .filter(item => {
                const margin = Math.round(((item.price - item.cost) / item.price) * 100);
                if (activeTab === "best") return margin >= 40;
                if (activeTab === "worst") return margin < 30;
                return true;
              })
              .sort((a, b) => {
                if (activeTab === "best") return ((b.price - b.cost) / b.price) - ((a.price - a.cost) / a.price);
                return 0;
              })
              .map(item => {
                const profit = (item.price - item.cost) * item.qty;
                const margin = Math.round(((item.price - item.cost) / item.price) * 100);
                return (
                  <tr key={item.id} className="border-b border-gray-800 hover:bg-gray-800 transition-all">
                    <td className="p-4 font-medium">{item.name}</td>
                    <td className="p-4 text-gray-400 text-sm">{item.category}</td>
                    <td className="p-4 text-right text-red-400">₹{item.cost.toLocaleString()}</td>
                    <td className="p-4 text-right text-white">₹{item.price.toLocaleString()}</td>
                    <td className="p-4 text-right text-gray-300">{item.qty}</td>
                    <td className="p-4 text-right text-white">₹{(item.price * item.qty).toLocaleString()}</td>
                    <td className="p-4 text-right text-green-400">₹{profit.toLocaleString()}</td>
                    <td className="p-4 text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${margin >= 40 ? "bg-green-900 text-green-400" : margin >= 25 ? "bg-yellow-900 text-yellow-400" : "bg-red-900 text-red-400"}`}>
                        {margin}%
                      </span>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* AI Insight Box */}
      <div className="mt-6 bg-gray-900 rounded-2xl p-6 border border-green-900">
        <h3 className="font-semibold text-green-400 mb-3">🤖 AI CFO Insight</h3>
        <div className="space-y-2 text-sm text-gray-300">
          {items.length > 0 && (() => {
            const best = [...items].sort((a, b) => ((b.price - b.cost) / b.price) - ((a.price - a.cost) / a.price))[0];
            const worst = [...items].sort((a, b) => ((a.price - a.cost) / a.price) - ((b.price - b.cost) / b.price))[0];
            const bestMargin = Math.round(((best.price - best.cost) / best.price) * 100);
            const worstMargin = Math.round(((worst.price - worst.cost) / worst.price) * 100);
            return (
              <>
                <p>🏆 <strong>{best.name}</strong> is your most profitable item at <strong>{bestMargin}% margin</strong> — focus on selling more of this.</p>
                <p>⚠️ <strong>{worst.name}</strong> has the lowest margin at <strong>{worstMargin}%</strong> — consider raising the price or reducing costs.</p>
                <p>💡 Your overall profit margin is <strong>{avgMargin}%</strong> — {avgMargin >= 40 ? "excellent! You're running a healthy business." : avgMargin >= 25 ? "decent, but there's room to improve." : "below average. Review your pricing strategy."}</p>
              </>
            );
          })()}
        </div>
      </div>

      {/* Add Item Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md border border-gray-700">
            <h3 className="text-xl font-bold mb-6">Add Product / Service</h3>
            <div className="space-y-4">
              <input placeholder="Name (e.g. Chocolate Cake, Paris Tour, Silk Saree)"
                value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white">
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
              <input placeholder="Your cost to make/deliver it (₹)"
                value={form.cost} onChange={e => setForm({...form, cost: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
              <input placeholder="Your selling price (₹)"
                value={form.price} onChange={e => setForm({...form, price: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
              <input placeholder="How many did you sell?"
                value={form.qty} onChange={e => setForm({...form, qty: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={addItem} className="flex-1 bg-green-600 hover:bg-green-500 py-3 rounded-xl font-semibold">Add</button>
              <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-xl">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}