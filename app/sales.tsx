"use client";
import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const GST_RATES = [
  { label: "0% - Exempt (Fresh food, milk)", value: 0 },
  { label: "5% - Essential (Clothes <₹1000, tea)", value: 5 },
  { label: "12% - Standard (Clothes >₹1000, hotels)", value: 12 },
  { label: "18% - Services (Software, restaurants)", value: 18 },
  { label: "28% - Luxury (Cars, AC, cigarettes)", value: 28 },
];

export default function Sales({ clients, onClientsChange, userEmail }: { clients: any[], onClientsChange?: () => void, userEmail?: string }) {
  const [sales, setSales] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("sales");
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [editingSale, setEditingSale] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [saleForm, setSaleForm] = useState({
    clientName: "", product: "", qty: "", price: "", cost: "", gstRate: "18", date: "", clientGst: "", includeInAccounts: true
  });
  const [editForm, setEditForm] = useState({
    clientName: "", product: "", qty: "", price: "", cost: "", gstRate: "18", date: "", clientGst: "", includeInAccounts: true
  });
  const [paymentForm, setPaymentForm] = useState({ amount: "", note: "", date: "" });

  useEffect(() => {
    fetchSales();
    fetchPayments();
  }, [userEmail]);

  const fetchSales = async () => {
    setLoading(true);
    let query = supabase.from("sales").select("*").order("created_at", { ascending: false });
    if (userEmail) query = query.eq("owner_email", userEmail);
    const { data } = await query;
    if (data) setSales(data);
    setLoading(false);
  };

  const fetchPayments = async () => {
    let query = supabase.from("payments").select("*").order("created_at", { ascending: false });
    if (userEmail) query = query.eq("owner_email", userEmail);
    const { data } = await query;
    if (data) setPayments(data);
  };

  const calcGST = (price: number, qty: number, gstRate: number) => {
    const totalWithGST = price * qty;
    const baseAmount = totalWithGST / (1 + gstRate / 100);
    const gstAmount = totalWithGST - baseAmount;
    const cgst = gstAmount / 2;
    const sgst = gstAmount / 2;
    return { totalWithGST, baseAmount, gstAmount, cgst, sgst };
  };

  const updateClientTotals = async (clientName: string, lastPaymentDate?: string) => {
    let salesQuery = supabase.from("sales").select("total, paid").eq("client_name", clientName);
    if (userEmail) salesQuery = salesQuery.eq("owner_email", userEmail);
    const { data: allClientSales } = await salesQuery;

    let unpaidQuery = supabase.from("sales").select("date, total, paid").eq("client_name", clientName).neq("status", "paid");
    if (userEmail) unpaidQuery = unpaidQuery.eq("owner_email", userEmail);
    const { data: unpaidSales } = await unpaidQuery;

    const newTotalBusiness = (allClientSales || []).reduce((a: number, s: any) => a + Number(s.total || 0), 0);
    const newAmountDue = (allClientSales || []).reduce((a: number, s: any) => a + (Number(s.total || 0) - Number(s.paid || 0)), 0);

    const today = new Date();
    const hasOverdue = (unpaidSales || []).some(s => {
      const saleDate = new Date(s.date);
      return saleDate < today && (Number(s.total) - Number(s.paid)) > 0;
    });

    const updateData: any = {
      total_business: newTotalBusiness,
      amount_due: newAmountDue,
      status: newAmountDue === 0 ? "paid" : hasOverdue ? "overdue" : "pending"
    };
    if (lastPaymentDate) updateData.last_payment = lastPaymentDate;

    let clientQuery = supabase.from("clients").update(updateData).eq("name", clientName);
    if (userEmail) clientQuery = clientQuery.eq("owner_email", userEmail);
    await clientQuery;
  };

  const addSale = async () => {
    if (!saleForm.clientName || !saleForm.product || !saleForm.qty || !saleForm.price) {
      alert("Please fill all required fields!");
      return;
    }
    setSaving(true);
    const price = Number(saleForm.price);
    const qty = Number(saleForm.qty);
    const gstRate = Number(saleForm.gstRate);
    const gst = calcGST(price, qty, gstRate);

    const newSale = {
      client_name: saleForm.clientName,
      product: saleForm.product,
      qty, price,
      cost: Number(saleForm.cost) || 0,
      total: gst.totalWithGST,
      base_amount: gst.baseAmount,
      gst_rate: gstRate,
      gst_amount: gst.gstAmount,
      cgst: gst.cgst,
      sgst: gst.sgst,
      paid: 0,
      date: saleForm.date || new Date().toLocaleDateString("en-IN"),
      status: "unpaid",
      owner_email: userEmail,
      client_gst: saleForm.clientGst || null,
      include_in_accounts: saleForm.includeInAccounts
    };

    const { error } = await supabase.from("sales").insert([newSale]);

    if (!error) {
      let clientCheckQuery = supabase.from("clients").select("*").eq("name", saleForm.clientName);
      if (userEmail) clientCheckQuery = clientCheckQuery.eq("owner_email", userEmail);
      const { data: existingClient } = await clientCheckQuery.single();

      if (existingClient) {
        await updateClientTotals(saleForm.clientName);
      } else {
        await supabase.from("clients").insert([{
          name: saleForm.clientName,
          phone: "",
          total_business: gst.totalWithGST,
          amount_due: gst.totalWithGST,
          last_payment: "Not yet",
          status: "overdue",
          owner_email: userEmail
        }]);
      }
      await fetchSales();
      if (onClientsChange) onClientsChange();
    }

    setSaleForm({ clientName: "", product: "", qty: "", price: "", cost: "", gstRate: "18", date: "", clientGst: "", includeInAccounts: true });
    setShowSaleForm(false);
    setSaving(false);
  };

  const openEditForm = (sale: any) => {
    setEditingSale(sale);
    setEditForm({
      clientName: sale.client_name || "",
      product: sale.product || "",
      qty: String(sale.qty || ""),
      price: String(sale.price || ""),
      cost: String(sale.cost || ""),
      gstRate: String(sale.gst_rate || "18"),
      date: sale.date || "",
      clientGst: sale.client_gst || "",
      includeInAccounts: sale.include_in_accounts !== false
    });
    setShowEditForm(true);
  };

  const saveSaleEdit = async () => {
    if (!editForm.clientName || !editForm.product || !editForm.qty || !editForm.price) {
      alert("Please fill all required fields!");
      return;
    }
    setSaving(true);
    const price = Number(editForm.price);
    const qty = Number(editForm.qty);
    const gstRate = Number(editForm.gstRate);
    const gst = calcGST(price, qty, gstRate);

    await supabase.from("sales").update({
      client_name: editForm.clientName,
      product: editForm.product,
      qty, price,
      cost: Number(editForm.cost) || 0,
      total: gst.totalWithGST,
      base_amount: gst.baseAmount,
      gst_rate: gstRate,
      gst_amount: gst.gstAmount,
      cgst: gst.cgst,
      sgst: gst.sgst,
      date: editForm.date,
      client_gst: editForm.clientGst || null,
      include_in_accounts: editForm.includeInAccounts
    }).eq("id", editingSale.id);

    await updateClientTotals(editForm.clientName);
    await fetchSales();
    if (onClientsChange) onClientsChange();
    setShowEditForm(false);
    setEditingSale(null);
    setSaving(false);
  };

  const addPayment = async () => {
    if (!paymentForm.amount || !selectedSale) return;
    setSaving(true);
    const amount = Number(paymentForm.amount);
    const newPaid = (Number(selectedSale.paid) || 0) + amount;
    const newStatus = newPaid >= selectedSale.total ? "paid" : newPaid > 0 ? "partial" : "unpaid";
    const paymentDate = paymentForm.date || new Date().toLocaleDateString("en-IN");

    await supabase.from("payments").insert([{
      sale_id: selectedSale.id,
      client_name: selectedSale.client_name,
      amount, date: paymentDate,
      note: paymentForm.note,
      owner_email: userEmail
    }]);

    await supabase.from("sales").update({ paid: newPaid, status: newStatus }).eq("id", selectedSale.id);
    await updateClientTotals(selectedSale.client_name, paymentDate);
    await fetchSales();
    await fetchPayments();
    if (onClientsChange) onClientsChange();
    setPaymentForm({ amount: "", note: "", date: "" });
    setShowPaymentForm(false);
    setSelectedSale(null);
    setSaving(false);
  };

  const accountSales = sales.filter(s => s.include_in_accounts !== false);
  const totalBilled = sales.reduce((a, s) => a + Number(s.total || 0), 0);
  const totalReceived = sales.reduce((a, s) => a + Number(s.paid || 0), 0);
  const totalPending = totalBilled - totalReceived;
  const totalGST = accountSales.reduce((a, s) => a + Number(s.gst_amount || 0), 0);

  const clientLedger = sales.reduce((acc: any, sale) => {
    const name = sale.client_name;
    if (!acc[name]) acc[name] = { billed: 0, paid: 0, sales: [] };
    acc[name].billed += Number(sale.total || 0);
    acc[name].paid += Number(sale.paid || 0);
    acc[name].sales.push(sale);
    return acc;
  }, {});

  const previewGST = saleForm.qty && saleForm.price
    ? calcGST(Number(saleForm.price), Number(saleForm.qty), Number(saleForm.gstRate))
    : null;

  const editPreviewGST = editForm.qty && editForm.price
    ? calcGST(Number(editForm.price), Number(editForm.qty), Number(editForm.gstRate))
    : null;

  return (
    <div className="p-8 bg-gray-950 min-h-screen text-white">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold">🧾 Sales & Payments</h2>
          <p className="text-gray-400">Track what you sold, to whom, and what's been paid</p>
        </div>
        <button onClick={() => setShowSaleForm(true)} className="bg-green-600 hover:bg-green-500 px-6 py-3 rounded-xl font-semibold">+ New Sale</button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <p className="text-gray-400 text-sm">Total Billed</p>
          <p className="text-2xl font-bold mt-1">₹{totalBilled.toLocaleString()}</p>
        </div>
        <div className="bg-gray-900 rounded-2xl p-5 border border-green-900">
          <p className="text-gray-400 text-sm">Total Received</p>
          <p className="text-2xl font-bold text-green-400 mt-1">₹{totalReceived.toLocaleString()}</p>
        </div>
        <div className="bg-gray-900 rounded-2xl p-5 border border-red-900">
          <p className="text-gray-400 text-sm">Total Pending</p>
          <p className="text-2xl font-bold text-red-400 mt-1">₹{totalPending.toLocaleString()}</p>
        </div>
        <div className="bg-gray-900 rounded-2xl p-5 border border-yellow-900">
          <p className="text-gray-400 text-sm">GST (Accounts only)</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">₹{totalGST.toFixed(0)}</p>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        {[
          { id: "sales", label: "📋 All Sales" },
          { id: "ledger", label: "📒 Client Ledger" },
          { id: "payments", label: "💳 Payment History" },
          { id: "gst", label: "🧾 GST Summary" }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2 rounded-xl font-medium transition-all ${activeTab === tab.id ? "bg-green-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "sales" && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          {loading ? <div className="p-8 text-center text-gray-400">Loading sales...</div> : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-sm">
                  <th className="text-left p-4">Client</th>
                  <th className="text-left p-4">GST No.</th>
                  <th className="text-left p-4">Product</th>
                  <th className="text-right p-4">Qty</th>
                  <th className="text-right p-4">Base Amt</th>
                  <th className="text-right p-4">GST</th>
                  <th className="text-right p-4">Total</th>
                  <th className="text-right p-4">Received</th>
                  <th className="text-right p-4">Balance</th>
                  <th className="text-center p-2">In A/C</th>
                  <th className="text-center p-4">Status</th>
                  <th className="text-center p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(sale => (
                  <tr key={sale.id} className={`border-b border-gray-800 hover:bg-gray-800 ${sale.include_in_accounts === false ? "opacity-50" : ""}`}>
                    <td className="p-4 font-medium">{sale.client_name}</td>
                    <td className="p-4 text-gray-500 text-xs">{sale.client_gst || "—"}</td>
                    <td className="p-4 text-gray-300">{sale.product}</td>
                    <td className="p-4 text-right">{sale.qty}</td>
                    <td className="p-4 text-right">₹{Number(sale.base_amount || 0).toFixed(0)}</td>
                    <td className="p-4 text-right text-yellow-400">₹{Number(sale.gst_amount || 0).toFixed(0)} ({sale.gst_rate}%)</td>
                    <td className="p-4 text-right font-semibold">₹{Number(sale.total || 0).toLocaleString()}</td>
                    <td className="p-4 text-right text-green-400">₹{Number(sale.paid || 0).toLocaleString()}</td>
                    <td className="p-4 text-right text-red-400">₹{(Number(sale.total || 0) - Number(sale.paid || 0)).toLocaleString()}</td>
                    <td className="p-2 text-center">
  {sale.include_in_accounts !== false
    ? <span className="text-xs text-green-400">✅</span>
    : <span className="text-xs text-gray-500">⛔</span>}
</td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${sale.status === "paid" ? "bg-green-900 text-green-400" : sale.status === "partial" ? "bg-yellow-900 text-yellow-400" : "bg-red-900 text-red-400"}`}>
                        {sale.status === "paid" ? "✅ Paid" : sale.status === "partial" ? "🟡 Partial" : "🔴 Unpaid"}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => openEditForm(sale)} className="text-xs bg-blue-700 hover:bg-blue-600 px-3 py-1 rounded-lg">✏️ Edit</button>
                        {sale.status !== "paid" && (
                          <button onClick={() => { setSelectedSale(sale); setShowPaymentForm(true); }} className="text-xs bg-green-700 hover:bg-green-600 px-3 py-1 rounded-lg">+ Pay</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "ledger" && (
        <div className="space-y-4">
          {Object.entries(clientLedger).map(([clientName, data]: any) => (
            <div key={clientName} className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-gray-800">
                <div>
                  <h3 className="font-bold text-lg">{clientName}</h3>
                  <p className="text-gray-400 text-sm">{data.sales.length} sale(s)</p>
                </div>
                <div className="flex gap-8 text-right">
                  <div><p className="text-xs text-gray-400">Total Billed</p><p className="font-bold">₹{data.billed.toLocaleString()}</p></div>
                  <div><p className="text-xs text-gray-400">Received</p><p className="font-bold text-green-400">₹{data.paid.toLocaleString()}</p></div>
                  <div><p className="text-xs text-gray-400">Balance Left</p><p className={`font-bold ${data.billed - data.paid > 0 ? "text-red-400" : "text-green-400"}`}>₹{(data.billed - data.paid).toLocaleString()}</p></div>
                </div>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-gray-400 text-xs border-b border-gray-800">
                    <th className="text-left p-3 pl-6">Date</th>
                    <th className="text-left p-3">Product</th>
                    <th className="text-center p-3">In Accounts</th>
                    <th className="text-right p-3">GST</th>
                    <th className="text-right p-3">Total</th>
                    <th className="text-right p-3">Paid</th>
                    <th className="text-right p-3 pr-6">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sales.map((sale: any) => (
                    <tr key={sale.id} className={`border-b border-gray-800 last:border-0 ${sale.include_in_accounts === false ? "opacity-50" : ""}`}>
                      <td className="p-3 pl-6 text-sm text-gray-400">{sale.date}</td>
                      <td className="p-3 text-sm">{sale.product} × {sale.qty}</td>
                      <td className="p-3 text-center text-xs">{sale.include_in_accounts !== false ? "✅" : "⛔"}</td>
                      <td className="p-3 text-right text-sm text-yellow-400">₹{Number(sale.gst_amount || 0).toFixed(0)}</td>
                      <td className="p-3 text-right text-sm">₹{Number(sale.total || 0).toLocaleString()}</td>
                      <td className="p-3 text-right text-sm text-green-400">₹{Number(sale.paid || 0).toLocaleString()}</td>
                      <td className="p-3 pr-6 text-right text-sm text-red-400">₹{(Number(sale.total || 0) - Number(sale.paid || 0)).toLocaleString()}</td>
                    </tr>
                  ))}
                  {payments.filter(p => p.client_name === clientName).map((p: any) => (
                    <tr key={`p-${p.id}`} className="bg-green-950 border-b border-gray-800 last:border-0">
                      <td className="p-3 pl-6 text-sm text-gray-400">{p.date}</td>
                      <td className="p-3 text-sm text-green-400">💳 Payment — {p.note}</td>
                      <td className="p-3 text-center text-xs">—</td>
                      <td className="p-3 text-right text-sm">—</td>
                      <td className="p-3 text-right text-sm">—</td>
                      <td className="p-3 text-right text-sm text-green-400">+₹{Number(p.amount).toLocaleString()}</td>
                      <td className="p-3 pr-6 text-right text-sm">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {activeTab === "payments" && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          {payments.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No payments recorded yet</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-sm">
                  <th className="text-left p-4">Date</th>
                  <th className="text-left p-4">Client</th>
                  <th className="text-left p-4">Note</th>
                  <th className="text-right p-4">Amount Received</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="border-b border-gray-800 hover:bg-gray-800">
                    <td className="p-4 text-gray-400">{p.date}</td>
                    <td className="p-4 font-medium">{p.client_name}</td>
                    <td className="p-4 text-gray-300">{p.note || "—"}</td>
                    <td className="p-4 text-right text-green-400 font-bold">₹{Number(p.amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "gst" && (
        <div className="space-y-6">
          <div className="bg-yellow-900 border border-yellow-700 rounded-xl p-4 text-yellow-300 text-sm">
            ⚠️ GST summary only includes sales marked as <strong>"Include in Accounts"</strong>. Excluded sales are not shown here.
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-900 rounded-2xl p-6 border border-yellow-900">
              <p className="text-gray-400 text-sm">Total GST Collected</p>
              <p className="text-2xl font-bold text-yellow-400 mt-1">₹{totalGST.toFixed(2)}</p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <p className="text-gray-400 text-sm">CGST (Central)</p>
              <p className="text-2xl font-bold mt-1">₹{(totalGST / 2).toFixed(2)}</p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <p className="text-gray-400 text-sm">SGST (State)</p>
              <p className="text-2xl font-bold mt-1">₹{(totalGST / 2).toFixed(2)}</p>
            </div>
          </div>
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="p-6 border-b border-gray-800">
              <h3 className="font-bold text-lg">🧾 GST Report — Accounts only</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-sm">
                  <th className="text-left p-4">Date</th>
                  <th className="text-left p-4">Client</th>
                  <th className="text-left p-4">Client GST</th>
                  <th className="text-left p-4">Product</th>
                  <th className="text-right p-4">Base Amt</th>
                  <th className="text-right p-4">GST%</th>
                  <th className="text-right p-4">CGST</th>
                  <th className="text-right p-4">SGST</th>
                  <th className="text-right p-4">Total GST</th>
                  <th className="text-right p-4">Invoice Total</th>
                </tr>
              </thead>
              <tbody>
                {accountSales.map(sale => (
                  <tr key={sale.id} className="border-b border-gray-800 hover:bg-gray-800">
                    <td className="p-4 text-gray-400 text-sm">{sale.date}</td>
                    <td className="p-4 font-medium text-sm">{sale.client_name}</td>
                    <td className="p-4 text-gray-500 text-xs">{sale.client_gst || "B2C"}</td>
                    <td className="p-4 text-gray-300 text-sm">{sale.product}</td>
                    <td className="p-4 text-right text-sm">₹{Number(sale.base_amount || 0).toFixed(2)}</td>
                    <td className="p-4 text-right text-sm text-yellow-400">{sale.gst_rate}%</td>
                    <td className="p-4 text-right text-sm">₹{Number(sale.cgst || 0).toFixed(2)}</td>
                    <td className="p-4 text-right text-sm">₹{Number(sale.sgst || 0).toFixed(2)}</td>
                    <td className="p-4 text-right text-sm text-yellow-400">₹{Number(sale.gst_amount || 0).toFixed(2)}</td>
                    <td className="p-4 text-right text-sm font-semibold">₹{Number(sale.total || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-700 bg-gray-800 font-bold">
                  <td colSpan={4} className="p-4">Total</td>
                  <td className="p-4 text-right">₹{accountSales.reduce((a, s) => a + Number(s.base_amount || 0), 0).toFixed(2)}</td>
                  <td className="p-4"></td>
                  <td className="p-4 text-right">₹{(totalGST / 2).toFixed(2)}</td>
                  <td className="p-4 text-right">₹{(totalGST / 2).toFixed(2)}</td>
                  <td className="p-4 text-right text-yellow-400">₹{totalGST.toFixed(2)}</td>
                  <td className="p-4 text-right">₹{accountSales.reduce((a, s) => a + Number(s.total || 0), 0).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* NEW SALE MODAL */}
      {showSaleForm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-start justify-center z-50 overflow-y-auto py-6">
          <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md border border-gray-700 my-4">
            <h3 className="text-xl font-bold mb-6">➕ New Sale</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Client Name *</label>
                <input placeholder="e.g. Ashish, Rahul Enterprises" value={saleForm.clientName}
                  onChange={e => setSaleForm(f => ({...f, clientName: e.target.value}))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Client GST Number <span className="text-gray-600">(Optional)</span></label>
                <input placeholder="e.g. 27AAPFU0939F1ZV" value={saleForm.clientGst}
                  onChange={e => setSaleForm(f => ({...f, clientGst: e.target.value}))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Product / Service *</label>
                <input placeholder="e.g. Kurta, Tour Package, Cake" value={saleForm.product}
                  onChange={e => setSaleForm(f => ({...f, product: e.target.value}))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Quantity *</label>
                  <input placeholder="e.g. 10" type="number" value={saleForm.qty}
                    onChange={e => setSaleForm(f => ({...f, qty: e.target.value}))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Selling Price (₹) *</label>
                  <input placeholder="e.g. 1500" type="number" value={saleForm.price}
                    onChange={e => setSaleForm(f => ({...f, price: e.target.value}))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Cost to Make/Deliver (₹)</label>
                <input placeholder="e.g. 600" type="number" value={saleForm.cost}
                  onChange={e => setSaleForm(f => ({...f, cost: e.target.value}))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">GST Rate *</label>
                <select value={saleForm.gstRate} onChange={e => setSaleForm(f => ({...f, gstRate: e.target.value}))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white">
                  {GST_RATES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              {previewGST && (
                <div className="bg-gray-800 rounded-xl px-4 py-3 space-y-2">
                  <p className="text-xs text-gray-400 font-semibold uppercase">Invoice Preview</p>
                  <div className="flex justify-between text-sm"><span className="text-gray-400">Base Amount</span><span>₹{previewGST.baseAmount.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-400">CGST ({Number(saleForm.gstRate)/2}%)</span><span className="text-yellow-400">₹{previewGST.cgst.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-400">SGST ({Number(saleForm.gstRate)/2}%)</span><span className="text-yellow-400">₹{previewGST.sgst.toFixed(2)}</span></div>
                  {saleForm.cost && (
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Your Profit</span><span className="text-green-400">₹{(previewGST.baseAmount - (Number(saleForm.cost) * Number(saleForm.qty))).toFixed(2)}</span></div>
                  )}
                  <div className="flex justify-between text-sm font-bold border-t border-gray-700 pt-2"><span>Total Invoice</span><span>₹{previewGST.totalWithGST.toFixed(2)}</span></div>
                </div>
              )}
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Date</label>
                <input placeholder="e.g. 12 May 2026" value={saleForm.date}
                  onChange={e => setSaleForm(f => ({...f, date: e.target.value}))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
              </div>
              <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3 border border-gray-700">
                <input type="checkbox" id="includeInAccounts" checked={saleForm.includeInAccounts}
                  onChange={e => setSaleForm(f => ({...f, includeInAccounts: e.target.checked}))}
                  className="w-5 h-5 accent-green-500 cursor-pointer" />
                <div>
                  <label htmlFor="includeInAccounts" className="text-sm font-semibold text-white cursor-pointer">Include in Accounts & Tax</label>
                  <p className="text-xs text-gray-500 mt-0.5">Uncheck to hide from GST reports, P&L and tax calculations</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={addSale} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-500 py-3 rounded-xl font-semibold disabled:opacity-50">
                {saving ? "Saving..." : "Save Sale ✅"}
              </button>
              <button onClick={() => setShowSaleForm(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-xl">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SALE MODAL */}
      {showEditForm && editingSale && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-start justify-center z-50 overflow-y-auto py-6">
          <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md border border-blue-700 my-4">
            <h3 className="text-xl font-bold mb-2">✏️ Edit Sale</h3>
            <p className="text-gray-400 text-sm mb-6">Editing sale for <span className="text-white font-semibold">{editingSale.client_name}</span></p>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Client Name *</label>
                <input placeholder="e.g. Ashish" value={editForm.clientName}
                  onChange={e => setEditForm(f => ({...f, clientName: e.target.value}))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Client GST Number <span className="text-gray-600">(Optional)</span></label>
                <input placeholder="e.g. 27AAPFU0939F1ZV" value={editForm.clientGst}
                  onChange={e => setEditForm(f => ({...f, clientGst: e.target.value}))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Product / Service *</label>
                <input placeholder="e.g. Kurta" value={editForm.product}
                  onChange={e => setEditForm(f => ({...f, product: e.target.value}))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Quantity *</label>
                  <input placeholder="e.g. 10" type="number" value={editForm.qty}
                    onChange={e => setEditForm(f => ({...f, qty: e.target.value}))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Selling Price (₹) *</label>
                  <input placeholder="e.g. 1500" type="number" value={editForm.price}
                    onChange={e => setEditForm(f => ({...f, price: e.target.value}))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Cost to Make/Deliver (₹)</label>
                <input placeholder="e.g. 600" type="number" value={editForm.cost}
                  onChange={e => setEditForm(f => ({...f, cost: e.target.value}))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">GST Rate *</label>
                <select value={editForm.gstRate} onChange={e => setEditForm(f => ({...f, gstRate: e.target.value}))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white">
                  {GST_RATES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              {editPreviewGST && (
                <div className="bg-gray-800 rounded-xl px-4 py-3 space-y-2">
                  <p className="text-xs text-gray-400 font-semibold uppercase">Updated Invoice Preview</p>
                  <div className="flex justify-between text-sm"><span className="text-gray-400">Base Amount</span><span>₹{editPreviewGST.baseAmount.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-400">CGST ({Number(editForm.gstRate)/2}%)</span><span className="text-yellow-400">₹{editPreviewGST.cgst.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-400">SGST ({Number(editForm.gstRate)/2}%)</span><span className="text-yellow-400">₹{editPreviewGST.sgst.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm font-bold border-t border-gray-700 pt-2"><span>Total Invoice</span><span>₹{editPreviewGST.totalWithGST.toFixed(2)}</span></div>
                </div>
              )}
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Date</label>
                <input placeholder="e.g. 12 May 2026" value={editForm.date}
                  onChange={e => setEditForm(f => ({...f, date: e.target.value}))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
              </div>
              <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3 border border-gray-700">
                <input type="checkbox" id="editIncludeInAccounts" checked={editForm.includeInAccounts}
                  onChange={e => setEditForm(f => ({...f, includeInAccounts: e.target.checked}))}
                  className="w-5 h-5 accent-green-500 cursor-pointer" />
                <div>
                  <label htmlFor="editIncludeInAccounts" className="text-sm font-semibold text-white cursor-pointer">Include in Accounts & Tax</label>
                  <p className="text-xs text-gray-500 mt-0.5">Uncheck to hide from GST reports, P&L and tax calculations</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={saveSaleEdit} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-semibold disabled:opacity-50">
                {saving ? "Saving..." : "Save Changes ✅"}
              </button>
              <button onClick={() => { setShowEditForm(false); setEditingSale(null); }} className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-xl">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPaymentForm && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md border border-gray-700">
            <h3 className="text-xl font-bold mb-2">💳 Add Payment</h3>
            <p className="text-gray-400 mb-6">Client: <span className="text-white font-semibold">{selectedSale.client_name}</span></p>
            <div className="bg-gray-800 rounded-xl p-4 mb-6">
              <div className="flex justify-between text-sm mb-2"><span className="text-gray-400">Total Invoice</span><span className="font-semibold">₹{Number(selectedSale.total).toLocaleString()}</span></div>
              <div className="flex justify-between text-sm mb-2"><span className="text-gray-400">Already Paid</span><span className="text-green-400">₹{Number(selectedSale.paid).toLocaleString()}</span></div>
              <div className="flex justify-between text-sm font-bold border-t border-gray-700 pt-2 mt-2"><span className="text-gray-400">Balance Due</span><span className="text-red-400">₹{(Number(selectedSale.total) - Number(selectedSale.paid)).toLocaleString()}</span></div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Amount Received (₹) *</label>
                <input placeholder="e.g. 5000" type="number" value={paymentForm.amount}
                  onChange={e => setPaymentForm(f => ({...f, amount: e.target.value}))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Note</label>
                <input placeholder="e.g. Advance, Final payment" value={paymentForm.note}
                  onChange={e => setPaymentForm(f => ({...f, note: e.target.value}))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Date</label>
                <input placeholder="e.g. 12 May 2026" value={paymentForm.date}
                  onChange={e => setPaymentForm(f => ({...f, date: e.target.value}))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={addPayment} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-500 py-3 rounded-xl font-semibold disabled:opacity-50">
                {saving ? "Saving..." : "Save Payment ✅"}
              </button>
              <button onClick={() => { setShowPaymentForm(false); setSelectedSale(null); }} className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-xl">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}