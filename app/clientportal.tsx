"use client";
import { useState, useEffect } from "react";
import { supabase } from "./supabase";

export default function ClientPortal({ client, onBack, onWhatsApp }: { client: any, onBack: () => void, onWhatsApp: (c: any) => void }) {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClientSales();
  }, [client]);

  const fetchClientSales = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("sales")
      .select("*")
      .eq("client_name", client.name)
      .order("created_at", { ascending: false });
    if (data) setSales(data);
    setLoading(false);
  };

  const totalBilled = sales.reduce((a, s) => a + Number(s.total || 0), 0);
  const totalPaid = sales.reduce((a, s) => a + Number(s.paid || 0), 0);
  const totalBalance = totalBilled - totalPaid;
  const totalGST = sales.reduce((a, s) => a + Number(s.gst_amount || 0), 0);

  return (
    <div className="p-8 bg-gray-950 min-h-screen text-white">
      <button onClick={onBack} className="text-gray-400 hover:text-white mb-6 flex items-center gap-2">
        ← Back to Clients
      </button>

      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-2xl font-bold">{client.name}</h2>
          <p className="text-gray-400">📱 {client.phone || "No phone added"}</p>
        </div>
        <button onClick={() => onWhatsApp(client)}
          className="bg-green-600 hover:bg-green-500 px-6 py-3 rounded-xl font-semibold">
          💬 Send WhatsApp Reminder
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <p className="text-gray-400 text-sm">Total Billed</p>
          <p className="text-2xl font-bold mt-1">₹{totalBilled.toLocaleString()}</p>
        </div>
        <div className="bg-gray-900 rounded-2xl p-5 border border-green-900">
          <p className="text-gray-400 text-sm">Total Received</p>
          <p className="text-2xl font-bold text-green-400 mt-1">₹{totalPaid.toLocaleString()}</p>
        </div>
        <div className="bg-gray-900 rounded-2xl p-5 border border-red-900">
          <p className="text-gray-400 text-sm">Balance Due</p>
          <p className="text-2xl font-bold text-red-400 mt-1">₹{totalBalance.toLocaleString()}</p>
        </div>
        <div className="bg-gray-900 rounded-2xl p-5 border border-yellow-900">
          <p className="text-gray-400 text-sm">Total GST</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">₹{totalGST.toFixed(0)}</p>
        </div>
      </div>

      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-6">
        <h3 className="font-semibold mb-3">Payment Status</h3>
        <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
          totalBalance === 0 ? "bg-green-900 text-green-400" :
          totalBalance < totalBilled ? "bg-yellow-900 text-yellow-400" :
          "bg-red-900 text-red-400"}`}>
          {totalBalance === 0 ? "✅ Fully Paid" : totalBalance < totalBilled ? "🟡 Partially Paid" : "🔴 Payment Pending"}
        </span>
      </div>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h3 className="font-bold text-lg">📋 Purchase History</h3>
          <p className="text-gray-400 text-sm">{sales.length} sale(s) recorded</p>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : sales.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No sales recorded for this client yet</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-sm">
                <th className="text-left p-4">Date</th>
                <th className="text-left p-4">Product</th>
                <th className="text-right p-4">Qty</th>
                <th className="text-right p-4">Base Amount</th>
                <th className="text-right p-4">GST</th>
                <th className="text-right p-4">Total</th>
                <th className="text-right p-4">Paid</th>
                <th className="text-right p-4">Balance</th>
                <th className="text-center p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {sales.map(sale => (
                <tr key={sale.id} className="border-b border-gray-800 hover:bg-gray-800">
                  <td className="p-4 text-gray-400 text-sm">{sale.date}</td>
                  <td className="p-4 font-medium">{sale.product}</td>
                  <td className="p-4 text-right">{sale.qty}</td>
                  <td className="p-4 text-right text-sm">₹{Number(sale.base_amount || 0).toFixed(0)}</td>
                  <td className="p-4 text-right text-yellow-400 text-sm">₹{Number(sale.gst_amount || 0).toFixed(0)}</td>
                  <td className="p-4 text-right font-semibold">₹{Number(sale.total || 0).toLocaleString()}</td>
                  <td className="p-4 text-right text-green-400">₹{Number(sale.paid || 0).toLocaleString()}</td>
                  <td className="p-4 text-right text-red-400">₹{(Number(sale.total || 0) - Number(sale.paid || 0)).toLocaleString()}</td>
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      sale.status === "paid" ? "bg-green-900 text-green-400" :
                      sale.status === "partial" ? "bg-yellow-900 text-yellow-400" :
                      "bg-red-900 text-red-400"}`}>
                      {sale.status === "paid" ? "✅ Paid" : sale.status === "partial" ? "🟡 Partial" : "🔴 Unpaid"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-700 bg-gray-800 font-bold">
                <td colSpan={5} className="p-4">Total</td>
                <td className="p-4 text-right">₹{totalBilled.toLocaleString()}</td>
                <td className="p-4 text-right text-green-400">₹{totalPaid.toLocaleString()}</td>
                <td className="p-4 text-right text-red-400">₹{totalBalance.toLocaleString()}</td>
                <td className="p-4"></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}