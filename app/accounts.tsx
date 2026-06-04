"use client";
import { useState, useEffect } from "react";
import { supabase } from "./supabase";

export default function Accounts({ userEmail }: { userEmail?: string }) {
  const [activeTab, setActiveTab] = useState("pl");
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [tdsEntries, setTdsEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showTdsForm, setShowTdsForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [expenseForm, setExpenseForm] = useState({
    category: "Rent", description: "", amount: "", date: ""
  });
  const [tdsForm, setTdsForm] = useState({
    vendor: "", payment: "", tdsRate: "2", date: "", description: ""
  });

  const expenseCategories = [
    "Rent", "Salaries", "Travel", "Software",
    "Marketing", "Utilities", "Raw Materials",
    "Equipment", "Professional Fees", "Other"
  ];

  const tdsRates = [
    { label: "1% - Sale of property", value: "1" },
    { label: "2% - Contractor/Sub-contractor", value: "2" },
    { label: "5% - Insurance commission", value: "5" },
    { label: "10% - Professional fees/Rent", value: "10" },
    { label: "30% - Lottery/Gaming", value: "30" },
  ];

  useEffect(() => { fetchData(); }, [userEmail]);

  const fetchData = async () => {
    setLoading(true);
    let salesQ = supabase.from("sales").select("*").order("created_at", { ascending: false });
    if (userEmail) salesQ = salesQ.eq("owner_email", userEmail);
    const { data: salesData } = await salesQ;
    if (salesData) setSales(salesData);

    let expQ = supabase.from("expenses").select("*").order("created_at", { ascending: false });
    if (userEmail) expQ = expQ.eq("owner_email", userEmail);
    const { data: expData } = await expQ;
    if (expData) setExpenses(expData);

    setLoading(false);
  };

  const addExpense = async () => {
    if (!expenseForm.description || !expenseForm.amount) { alert("Fill required fields!"); return; }
    setSaving(true);
    await supabase.from("expenses").insert([{
      category: expenseForm.category,
      description: expenseForm.description,
      amount: Number(expenseForm.amount),
      date: expenseForm.date || new Date().toLocaleDateString("en-IN"),
      owner_email: userEmail
    }]);
    setExpenseForm({ category: "Rent", description: "", amount: "", date: "" });
    setShowExpenseForm(false);
    await fetchData();
    setSaving(false);
  };

  const addTds = () => {
    if (!tdsForm.vendor || !tdsForm.payment) { alert("Fill required fields!"); return; }
    const payment = Number(tdsForm.payment);
    const tdsAmount = (payment * Number(tdsForm.tdsRate)) / 100;
    const entry = {
      id: tdsEntries.length + 1,
      vendor: tdsForm.vendor,
      payment,
      tdsRate: Number(tdsForm.tdsRate),
      tdsAmount,
      netPayment: payment - tdsAmount,
      date: tdsForm.date || new Date().toLocaleDateString("en-IN"),
      description: tdsForm.description
    };
    setTdsEntries([...tdsEntries, entry]);
    setTdsForm({ vendor: "", payment: "", tdsRate: "2", date: "", description: "" });
    setShowTdsForm(false);
  };

  const deleteExpense = async (id: number) => {
    await supabase.from("expenses").delete().eq("id", id);
    await fetchData();
  };

  // Filter by month
  const filteredSales = selectedMonth === "all" ? sales : sales.filter(s => s.date?.includes(selectedMonth));

  // Calculations
  const totalRevenue = filteredSales.reduce((a, s) => a + Number(s.total || 0), 0);
  const totalBaseRevenue = filteredSales.reduce((a, s) => a + Number(s.base_amount || 0), 0);
  const totalGSTCollected = filteredSales.reduce((a, s) => a + Number(s.gst_amount || 0), 0);
  const totalCGST = filteredSales.reduce((a, s) => a + Number(s.cgst || 0), 0);
  const totalSGST = filteredSales.reduce((a, s) => a + Number(s.sgst || 0), 0);
  const totalCOGS = filteredSales.reduce((a, s) => a + (Number(s.cost || 0) * Number(s.qty || 0)), 0);
  const totalExpenses = expenses.reduce((a, e) => a + Number(e.amount || 0), 0);
  const grossProfit = totalBaseRevenue - totalCOGS;
  const netProfit = grossProfit - totalExpenses;
  const profitMargin = totalBaseRevenue > 0 ? ((netProfit / totalBaseRevenue) * 100).toFixed(1) : "0";
  const totalReceived = filteredSales.reduce((a, s) => a + Number(s.paid || 0), 0);
  const totalPending = totalRevenue - totalReceived;
  const totalTDS = tdsEntries.reduce((a, t) => a + t.tdsAmount, 0);
  const expenseByCategory = expenses.reduce((acc: any, e) => {
    if (!acc[e.category]) acc[e.category] = 0;
    acc[e.category] += Number(e.amount || 0);
    return acc;
  }, {});

  // GST by rate
  const gstByRate = filteredSales.reduce((acc: any, s) => {
    const rate = s.gst_rate || 0;
    if (!acc[rate]) acc[rate] = { base: 0, cgst: 0, sgst: 0, total: 0, count: 0 };
    acc[rate].base += Number(s.base_amount || 0);
    acc[rate].cgst += Number(s.cgst || 0);
    acc[rate].sgst += Number(s.sgst || 0);
    acc[rate].total += Number(s.gst_amount || 0);
    acc[rate].count += 1;
    return acc;
  }, {});

  // Download as CSV
  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) { alert("No data to download!"); return; }
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row => Object.values(row).join(",")).join("\n");
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
  };

  // Download P&L as text
  const downloadPL = () => {
    const content = `
PROFIT & LOSS STATEMENT
FY 2025-26
Generated by AI CFO
================================

INCOME
Gross Revenue (with GST): ₹${totalRevenue.toLocaleString()}
Less: GST Collected: -₹${totalGSTCollected.toFixed(0)}
Net Revenue: ₹${totalBaseRevenue.toFixed(0)}

COST OF GOODS SOLD
Cost of Products/Services: -₹${totalCOGS.toFixed(0)}
Gross Profit: ₹${grossProfit.toFixed(0)}

OPERATING EXPENSES
${Object.entries(expenseByCategory).map(([cat, amt]: any) => `${cat}: -₹${amt.toLocaleString()}`).join("\n")}
Total Expenses: -₹${totalExpenses.toLocaleString()}

================================
NET PROFIT: ₹${netProfit.toFixed(0)}
PROFIT MARGIN: ${profitMargin}%

⚠️ Draft - Verify with CA before filing
    `;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "PL_Statement_FY2025-26.txt";
    a.click();
  };

  const months = ["all", "01/2026", "02/2026", "03/2026", "04/2026", "05/2026", "06/2026", "07/2026", "08/2026", "09/2026", "10/2026", "11/2026", "12/2026"];

  if (loading) return (
    <div className="p-8 bg-gray-950 min-h-screen text-white flex items-center justify-center">
      <p className="text-gray-400">Loading financial data...</p>
    </div>
  );

  return (
    <div className="p-8 bg-gray-950 min-h-screen text-white">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold">📊 Accounts & Tax</h2>
          <p className="text-gray-400">Real financial statements from your data</p>
        </div>
        <div className="flex gap-3 items-center">
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm">
            <option value="all">All Time</option>
            {months.slice(1).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <div className="text-right">
            <p className="text-xs text-gray-400">Financial Year</p>
            <p className="text-sm font-semibold text-green-400">FY 2025-26</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <p className="text-gray-400 text-sm">Total Revenue</p>
          <p className="text-2xl font-bold mt-1">₹{totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-gray-900 rounded-2xl p-5 border border-green-900">
          <p className="text-gray-400 text-sm">Net Profit</p>
          <p className={`text-2xl font-bold mt-1 ${netProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
            ₹{netProfit.toFixed(0)}
          </p>
        </div>
        <div className="bg-gray-900 rounded-2xl p-5 border border-yellow-900">
          <p className="text-gray-400 text-sm">GST Collected</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">₹{totalGSTCollected.toFixed(0)}</p>
        </div>
        <div className="bg-gray-900 rounded-2xl p-5 border border-red-900">
          <p className="text-gray-400 text-sm">Total Expenses</p>
          <p className="text-2xl font-bold text-red-400 mt-1">₹{totalExpenses.toLocaleString()}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { id: "pl", label: "📊 P&L" },
          { id: "gstr1", label: "🧾 GSTR-1" },
          { id: "gstr3b", label: "📋 GSTR-3B" },
          { id: "gstr9", label: "📅 GSTR-9 Annual" },
          { id: "tds", label: "💼 TDS Tracker" },
          { id: "itr", label: "📁 ITR Data" },
          { id: "expenses", label: "💸 Expenses" },
          { id: "balance", label: "🏦 Balance Sheet" },
          { id: "cashflow", label: "💰 Cash Flow" },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${activeTab === tab.id ? "bg-green-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* P&L STATEMENT */}
      {activeTab === "pl" && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="p-6 border-b border-gray-800 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg">📊 Profit & Loss Statement</h3>
              <p className="text-gray-400 text-sm">Auto-generated from your sales data</p>
            </div>
            <div className="flex gap-3">
              <span className="text-xs bg-yellow-900 text-yellow-400 px-3 py-1 rounded-full">
                ⚠️ Draft — Verify with CA
              </span>
              <button onClick={downloadPL}
                className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-xl text-sm font-semibold">
                ⬇️ Download
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="mb-6">
              <h4 className="font-semibold text-green-400 mb-3 text-sm uppercase tracking-wide">INCOME</h4>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-300">Gross Revenue (with GST)</span>
                  <span className="font-semibold">₹{totalRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-400 pl-4">Less: GST Collected</span>
                  <span className="text-yellow-400">- ₹{totalGSTCollected.toFixed(0)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-800 font-semibold">
                  <span>Net Revenue</span>
                  <span>₹{totalBaseRevenue.toFixed(0)}</span>
                </div>
              </div>
            </div>
            <div className="mb-6">
              <h4 className="font-semibold text-red-400 mb-3 text-sm uppercase tracking-wide">COST OF GOODS SOLD</h4>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-300">Cost of Products/Services</span>
                  <span className="text-red-400">- ₹{totalCOGS.toFixed(0)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-800 font-semibold">
                  <span>Gross Profit</span>
                  <span className={grossProfit >= 0 ? "text-green-400" : "text-red-400"}>₹{grossProfit.toFixed(0)}</span>
                </div>
              </div>
            </div>
            <div className="mb-6">
              <h4 className="font-semibold text-red-400 mb-3 text-sm uppercase tracking-wide">OPERATING EXPENSES</h4>
              <div className="space-y-2">
                {Object.entries(expenseByCategory).map(([cat, amt]: any) => (
                  <div key={cat} className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-300 pl-4">{cat}</span>
                    <span className="text-red-400">- ₹{amt.toLocaleString()}</span>
                  </div>
                ))}
                {expenses.length === 0 && (
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-500 pl-4">No expenses recorded</span>
                    <span className="text-gray-500">₹0</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-gray-800 font-semibold">
                  <span>Total Expenses</span>
                  <span className="text-red-400">- ₹{totalExpenses.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xl font-bold">NET PROFIT</span>
                <span className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                  ₹{netProfit.toFixed(0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Profit Margin</span>
                <span className={`font-semibold ${Number(profitMargin) >= 20 ? "text-green-400" : "text-yellow-400"}`}>
                  {profitMargin}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GSTR-1 */}
      {activeTab === "gstr1" && (
        <div className="space-y-6">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">🧾 GSTR-1 — Outward Supplies</h3>
                <p className="text-gray-400 text-sm">Details of all sales invoices</p>
              </div>
              <div className="flex gap-3">
                <span className="text-xs bg-yellow-900 text-yellow-400 px-3 py-1 rounded-full">⚠️ Verify with CA</span>
                <button onClick={() => downloadCSV(filteredSales.map(s => ({
                  Date: s.date,
                  Client: s.client_name,
                  Product: s.product,
                  Qty: s.qty,
                  "Base Amount": Number(s.base_amount || 0).toFixed(2),
                  "GST Rate": `${s.gst_rate}%`,
                  CGST: Number(s.cgst || 0).toFixed(2),
                  SGST: Number(s.sgst || 0).toFixed(2),
                  "Total GST": Number(s.gst_amount || 0).toFixed(2),
                  "Invoice Total": Number(s.total || 0).toFixed(2)
                })), "GSTR1_Data")}
                  className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-xl text-sm font-semibold">
                  ⬇️ Download CSV
                </button>
              </div>
            </div>

            {/* GST Rate Summary */}
            <div className="p-6 border-b border-gray-800">
              <h4 className="font-semibold mb-3 text-sm text-gray-400 uppercase">GST Rate-wise Summary</h4>
              <div className="grid grid-cols-4 gap-3">
                {Object.entries(gstByRate).map(([rate, data]: any) => (
                  <div key={rate} className="bg-gray-800 rounded-xl p-4">
                    <p className="text-yellow-400 font-bold text-lg">{rate}%</p>
                    <p className="text-xs text-gray-400 mt-1">{data.count} invoices</p>
                    <p className="text-sm font-semibold mt-1">Base: ₹{data.base.toFixed(0)}</p>
                    <p className="text-sm text-yellow-400">GST: ₹{data.total.toFixed(0)}</p>
                  </div>
                ))}
              </div>
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-sm">
                  <th className="text-left p-4">Date</th>
                  <th className="text-left p-4">Client</th>
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
                {filteredSales.map(sale => (
                  <tr key={sale.id} className="border-b border-gray-800 hover:bg-gray-800">
                    <td className="p-4 text-gray-400 text-sm">{sale.date}</td>
                    <td className="p-4 font-medium text-sm">{sale.client_name}</td>
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
                  <td colSpan={3} className="p-4">TOTAL</td>
                  <td className="p-4 text-right">₹{totalBaseRevenue.toFixed(2)}</td>
                  <td className="p-4"></td>
                  <td className="p-4 text-right">₹{totalCGST.toFixed(2)}</td>
                  <td className="p-4 text-right">₹{totalSGST.toFixed(2)}</td>
                  <td className="p-4 text-right text-yellow-400">₹{totalGSTCollected.toFixed(2)}</td>
                  <td className="p-4 text-right">₹{totalRevenue.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* GSTR-3B */}
      {activeTab === "gstr3b" && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="p-6 border-b border-gray-800 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg">📋 GSTR-3B — Monthly Summary</h3>
              <p className="text-gray-400 text-sm">Summary return for GST payment</p>
            </div>
            <div className="flex gap-3">
              <span className="text-xs bg-yellow-900 text-yellow-400 px-3 py-1 rounded-full">⚠️ Verify with CA</span>
              <button onClick={() => downloadCSV([{
                "Total Taxable Value": totalBaseRevenue.toFixed(2),
                "Total CGST": totalCGST.toFixed(2),
                "Total SGST": totalSGST.toFixed(2),
                "Total GST": totalGSTCollected.toFixed(2),
                "Total Invoice Value": totalRevenue.toFixed(2)
              }], "GSTR3B_Summary")}
                className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-xl text-sm font-semibold">
                ⬇️ Download
              </button>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <h4 className="font-semibold text-green-400 mb-4 text-sm uppercase">3.1 OUTWARD SUPPLIES (Sales)</h4>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-sm">
                    <th className="text-left p-3">Nature of Supply</th>
                    <th className="text-right p-3">Total Taxable Value</th>
                    <th className="text-right p-3">CGST</th>
                    <th className="text-right p-3">SGST</th>
                    <th className="text-right p-3">Total Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(gstByRate).map(([rate, data]: any) => (
                    <tr key={rate} className="border-b border-gray-800">
                      <td className="p-3">Taxable @ {rate}%</td>
                      <td className="p-3 text-right">₹{data.base.toFixed(2)}</td>
                      <td className="p-3 text-right">₹{data.cgst.toFixed(2)}</td>
                      <td className="p-3 text-right">₹{data.sgst.toFixed(2)}</td>
                      <td className="p-3 text-right text-yellow-400">₹{data.total.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-gray-700 bg-gray-800 font-bold">
                    <td className="p-3">TOTAL</td>
                    <td className="p-3 text-right">₹{totalBaseRevenue.toFixed(2)}</td>
                    <td className="p-3 text-right">₹{totalCGST.toFixed(2)}</td>
                    <td className="p-3 text-right">₹{totalSGST.toFixed(2)}</td>
                    <td className="p-3 text-right text-yellow-400">₹{totalGSTCollected.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-gray-800 rounded-xl p-6">
              <h4 className="font-semibold mb-4 text-sm uppercase text-gray-400">6. TAX PAYABLE</h4>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span>CGST Payable</span>
                  <span className="font-bold text-yellow-400">₹{totalCGST.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span>SGST Payable</span>
                  <span className="font-bold text-yellow-400">₹{totalSGST.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 font-bold text-lg">
                  <span>TOTAL GST PAYABLE</span>
                  <span className="text-yellow-400">₹{totalGSTCollected.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GSTR-9 ANNUAL */}
      {activeTab === "gstr9" && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="p-6 border-b border-gray-800 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg">📅 GSTR-9 — Annual Return</h3>
              <p className="text-gray-400 text-sm">Annual GST return summary for FY 2025-26</p>
            </div>
            <div className="flex gap-3">
              <span className="text-xs bg-yellow-900 text-yellow-400 px-3 py-1 rounded-full">⚠️ Verify with CA</span>
              <button onClick={() => downloadCSV([{
                "FY": "2025-26",
                "Total Outward Supplies": totalRevenue.toFixed(2),
                "Total Taxable Value": totalBaseRevenue.toFixed(2),
                "Total GST Collected": totalGSTCollected.toFixed(2),
                "CGST": totalCGST.toFixed(2),
                "SGST": totalSGST.toFixed(2),
                "Total Invoices": filteredSales.length
              }], "GSTR9_Annual")}
                className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-xl text-sm font-semibold">
                ⬇️ Download
              </button>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-sm">Total Outward Supplies</p>
                <p className="text-xl font-bold mt-1">₹{totalRevenue.toLocaleString()}</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-sm">Total Tax Collected</p>
                <p className="text-xl font-bold text-yellow-400 mt-1">₹{totalGSTCollected.toFixed(0)}</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-sm">Total Invoices</p>
                <p className="text-xl font-bold mt-1">{sales.length}</p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-green-400 mb-3 text-sm uppercase">PART II — OUTWARD AND INWARD SUPPLIES</h4>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-sm">
                    <th className="text-left p-3">Description</th>
                    <th className="text-right p-3">Taxable Value</th>
                    <th className="text-right p-3">CGST</th>
                    <th className="text-right p-3">SGST</th>
                    <th className="text-right p-3">Total Tax</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-800">
                    <td className="p-3">Supplies made to unregistered persons (B2C)</td>
                    <td className="p-3 text-right">₹{totalBaseRevenue.toFixed(2)}</td>
                    <td className="p-3 text-right">₹{totalCGST.toFixed(2)}</td>
                    <td className="p-3 text-right">₹{totalSGST.toFixed(2)}</td>
                    <td className="p-3 text-right text-yellow-400">₹{totalGSTCollected.toFixed(2)}</td>
                  </tr>
                  <tr className="border-t border-gray-700 bg-gray-800 font-bold">
                    <td className="p-3">TOTAL ANNUAL</td>
                    <td className="p-3 text-right">₹{totalBaseRevenue.toFixed(2)}</td>
                    <td className="p-3 text-right">₹{totalCGST.toFixed(2)}</td>
                    <td className="p-3 text-right">₹{totalSGST.toFixed(2)}</td>
                    <td className="p-3 text-right text-yellow-400">₹{totalGSTCollected.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TDS TRACKER */}
      {activeTab === "tds" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg">💼 TDS Tracker</h3>
            <button onClick={() => setShowTdsForm(true)}
              className="bg-green-600 hover:bg-green-500 px-6 py-3 rounded-xl font-semibold">
              + Add TDS Entry
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <p className="text-gray-400 text-sm">Total Payments</p>
              <p className="text-2xl font-bold mt-1">₹{tdsEntries.reduce((a, t) => a + t.payment, 0).toLocaleString()}</p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-5 border border-yellow-900">
              <p className="text-gray-400 text-sm">Total TDS Deducted</p>
              <p className="text-2xl font-bold text-yellow-400 mt-1">₹{totalTDS.toFixed(0)}</p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-5 border border-green-900">
              <p className="text-gray-400 text-sm">Net Payments Made</p>
              <p className="text-2xl font-bold text-green-400 mt-1">₹{tdsEntries.reduce((a, t) => a + t.netPayment, 0).toFixed(0)}</p>
            </div>
          </div>

          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            {tdsEntries.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <p className="text-4xl mb-4">💼</p>
                <p className="text-xl font-semibold mb-2">No TDS entries yet</p>
                <p>Add TDS entries for payments made to vendors, contractors, professionals</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-sm">
                    <th className="text-left p-4">Date</th>
                    <th className="text-left p-4">Vendor</th>
                    <th className="text-left p-4">Description</th>
                    <th className="text-right p-4">Payment</th>
                    <th className="text-right p-4">TDS Rate</th>
                    <th className="text-right p-4">TDS Amount</th>
                    <th className="text-right p-4">Net Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {tdsEntries.map(t => (
                    <tr key={t.id} className="border-b border-gray-800 hover:bg-gray-800">
                      <td className="p-4 text-gray-400">{t.date}</td>
                      <td className="p-4 font-medium">{t.vendor}</td>
                      <td className="p-4 text-gray-300">{t.description}</td>
                      <td className="p-4 text-right">₹{t.payment.toLocaleString()}</td>
                      <td className="p-4 text-right text-yellow-400">{t.tdsRate}%</td>
                      <td className="p-4 text-right text-red-400">₹{t.tdsAmount.toFixed(0)}</td>
                      <td className="p-4 text-right text-green-400">₹{t.netPayment.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-700 bg-gray-800 font-bold">
                    <td colSpan={3} className="p-4">TOTAL</td>
                    <td className="p-4 text-right">₹{tdsEntries.reduce((a, t) => a + t.payment, 0).toLocaleString()}</td>
                    <td className="p-4"></td>
                    <td className="p-4 text-right text-yellow-400">₹{totalTDS.toFixed(0)}</td>
                    <td className="p-4 text-right text-green-400">₹{tdsEntries.reduce((a, t) => a + t.netPayment, 0).toFixed(0)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {showTdsForm && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
              <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md border border-gray-700">
                <h3 className="text-xl font-bold mb-6">➕ Add TDS Entry</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Vendor/Payee Name *</label>
                    <input placeholder="e.g. CA Sharma, ABC Contractors"
                      value={tdsForm.vendor} onChange={e => setTdsForm({...tdsForm, vendor: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Description</label>
                    <input placeholder="e.g. Professional fees for tax filing"
                      value={tdsForm.description} onChange={e => setTdsForm({...tdsForm, description: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Total Payment Amount (₹) *</label>
                    <input placeholder="e.g. 50000" type="number"
                      value={tdsForm.payment} onChange={e => setTdsForm({...tdsForm, payment: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">TDS Rate *</label>
                    <select value={tdsForm.tdsRate} onChange={e => setTdsForm({...tdsForm, tdsRate: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white">
                      {tdsRates.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  {tdsForm.payment && (
                    <div className="bg-gray-800 rounded-xl p-4 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Gross Payment</span>
                        <span>₹{Number(tdsForm.payment).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">TDS @ {tdsForm.tdsRate}%</span>
                        <span className="text-red-400">- ₹{((Number(tdsForm.payment) * Number(tdsForm.tdsRate)) / 100).toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold border-t border-gray-700 pt-1">
                        <span>Net Payment to Vendor</span>
                        <span className="text-green-400">₹{(Number(tdsForm.payment) - (Number(tdsForm.payment) * Number(tdsForm.tdsRate)) / 100).toFixed(0)}</span>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Date</label>
                    <input placeholder="e.g. 12 May 2026"
                      value={tdsForm.date} onChange={e => setTdsForm({...tdsForm, date: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={addTds} className="flex-1 bg-green-600 hover:bg-green-500 py-3 rounded-xl font-semibold">Save ✅</button>
                  <button onClick={() => setShowTdsForm(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-xl">Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ITR DATA */}
      {activeTab === "itr" && (
        <div className="space-y-6">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">📁 ITR Data Preparation</h3>
                <p className="text-gray-400 text-sm">Income Tax Return data — verify with CA before filing</p>
              </div>
              <button onClick={() => downloadCSV([{
                "Business Income": totalBaseRevenue.toFixed(2),
                "Cost of Goods Sold": totalCOGS.toFixed(2),
                "Gross Profit": grossProfit.toFixed(2),
                "Total Expenses": totalExpenses.toFixed(2),
                "Net Profit": netProfit.toFixed(2),
                "TDS Deducted by Others": "0",
                "Advance Tax Paid": "0"
              }], "ITR_Data")}
                className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-xl text-sm font-semibold">
                ⬇️ Download
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-yellow-900 border border-yellow-700 rounded-xl p-4">
                <p className="text-yellow-400 text-sm font-semibold">⚠️ Important Note</p>
                <p className="text-yellow-300 text-sm mt-1">This is prepared data only. ITR must be filed by a CA or you on the Income Tax portal (incometax.gov.in). This data helps your CA file faster.</p>
              </div>

              <div>
                <h4 className="font-semibold text-green-400 mb-4 text-sm uppercase">Recommended ITR Form</h4>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { form: "ITR-1", desc: "For salaried individuals with business income up to ₹50L", suitable: totalBaseRevenue < 5000000 },
                    { form: "ITR-3", desc: "For individuals with business/professional income", suitable: true },
                    { form: "ITR-4", desc: "Presumptive income scheme for businesses under ₹2Cr", suitable: totalBaseRevenue < 20000000 },
                  ].map(itr => (
                    <div key={itr.form} className={`rounded-xl p-4 border ${itr.suitable ? "bg-green-900 border-green-700" : "bg-gray-800 border-gray-700"}`}>
                      <p className="font-bold text-lg">{itr.form}</p>
                      <p className="text-sm text-gray-300 mt-1">{itr.desc}</p>
                      {itr.suitable && <span className="text-xs text-green-400 mt-2 block">✅ May be applicable</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-green-400 mb-3 text-sm uppercase">Income Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-300">Gross Business Income</span>
                    <span className="font-semibold">₹{totalBaseRevenue.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-300">Less: Cost of Goods Sold</span>
                    <span className="text-red-400">- ₹{totalCOGS.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-300">Less: Business Expenses</span>
                    <span className="text-red-400">- ₹{totalExpenses.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-800 font-bold">
                    <span>Net Taxable Income from Business</span>
                    <span className={netProfit >= 0 ? "text-green-400" : "text-red-400"}>₹{netProfit.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-300">TDS Deducted (from 26AS)</span>
                    <span className="text-gray-400">₹0 (update manually)</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-sm text-gray-400">📋 <strong>Next Steps:</strong> Share this data with your CA. They will verify, add other income sources (salary, interest, etc.), apply deductions (80C, 80D), and file your ITR on the government portal.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXPENSES */}
      {activeTab === "expenses" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg">💸 Business Expenses</h3>
            <button onClick={() => setShowExpenseForm(true)}
              className="bg-green-600 hover:bg-green-500 px-6 py-3 rounded-xl font-semibold">
              + Add Expense
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(expenseByCategory).map(([cat, amt]: any) => (
              <div key={cat} className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
                <p className="text-gray-400 text-sm">{cat}</p>
                <p className="text-xl font-bold text-red-400 mt-1">₹{amt.toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            {expenses.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <p className="text-4xl mb-4">💸</p>
                <p className="text-xl font-semibold mb-2">No expenses recorded yet</p>
                <p>Click "+ Add Expense" to start tracking</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-sm">
                    <th className="text-left p-4">Date</th>
                    <th className="text-left p-4">Category</th>
                    <th className="text-left p-4">Description</th>
                    <th className="text-right p-4">Amount</th>
                    <th className="text-center p-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(exp => (
                    <tr key={exp.id} className="border-b border-gray-800 hover:bg-gray-800">
                      <td className="p-4 text-gray-400">{exp.date}</td>
                      <td className="p-4"><span className="bg-gray-800 px-3 py-1 rounded-full text-xs">{exp.category}</span></td>
                      <td className="p-4 text-gray-300">{exp.description}</td>
                      <td className="p-4 text-right text-red-400 font-semibold">₹{Number(exp.amount).toLocaleString()}</td>
                      <td className="p-4 text-center">
                        <button onClick={() => deleteExpense(exp.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-700 bg-gray-800 font-bold">
                    <td colSpan={3} className="p-4">Total</td>
                    <td className="p-4 text-right text-red-400">₹{totalExpenses.toLocaleString()}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
          {showExpenseForm && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
              <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md border border-gray-700">
                <h3 className="text-xl font-bold mb-6">➕ Add Expense</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Category *</label>
                    <select value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white">
                      {expenseCategories.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Description *</label>
                    <input placeholder="e.g. Office rent for May"
                      value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Amount (₹) *</label>
                    <input placeholder="e.g. 15000" type="number"
                      value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Date</label>
                    <input placeholder="e.g. 12 May 2026"
                      value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={addExpense} disabled={saving}
                    className="flex-1 bg-green-600 hover:bg-green-500 py-3 rounded-xl font-semibold disabled:opacity-50">
                    {saving ? "Saving..." : "Save ✅"}
                  </button>
                  <button onClick={() => setShowExpenseForm(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-xl">Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BALANCE SHEET */}
      {activeTab === "balance" && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="p-6 border-b border-gray-800 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg">🏦 Balance Sheet</h3>
              <p className="text-gray-400 text-sm">Assets vs Liabilities</p>
            </div>
            <span className="text-xs bg-yellow-900 text-yellow-400 px-3 py-1 rounded-full">⚠️ Draft — Verify with CA</span>
          </div>
          <div className="p-6 grid grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-green-400 mb-4 text-sm uppercase">ASSETS</h4>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-300">Cash & Bank (Received)</span>
                  <span className="font-semibold">₹{totalReceived.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-300">Accounts Receivable (Pending)</span>
                  <span className="font-semibold">₹{totalPending.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-700 font-bold text-lg mt-4">
                  <span>Total Assets</span>
                  <span className="text-green-400">₹{totalRevenue.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-red-400 mb-4 text-sm uppercase">LIABILITIES & EQUITY</h4>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-300">GST Payable</span>
                  <span className="text-red-400">₹{totalGSTCollected.toFixed(0)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-300">Operating Expenses</span>
                  <span className="text-red-400">₹{totalExpenses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-300">TDS Payable</span>
                  <span className="text-red-400">₹{totalTDS.toFixed(0)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-300">Owner's Equity (Net Profit)</span>
                  <span className={netProfit >= 0 ? "text-green-400" : "text-red-400"}>₹{netProfit.toFixed(0)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-700 font-bold text-lg mt-4">
                  <span>Total Liabilities + Equity</span>
                  <span className="text-green-400">₹{totalRevenue.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CASH FLOW */}
      {activeTab === "cashflow" && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-900 rounded-2xl p-6 border border-green-900">
              <p className="text-gray-400 text-sm">Cash Received from Clients</p>
              <p className="text-2xl font-bold text-green-400 mt-1">₹{totalReceived.toLocaleString()}</p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-6 border border-red-900">
              <p className="text-gray-400 text-sm">Cash Out (Expenses + GST)</p>
              <p className="text-2xl font-bold text-red-400 mt-1">₹{(totalExpenses + totalGSTCollected).toFixed(0)}</p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <p className="text-gray-400 text-sm">Net Cash Position</p>
              <p className={`text-2xl font-bold mt-1 ${totalReceived - totalExpenses - totalGSTCollected >= 0 ? "text-green-400" : "text-red-400"}`}>
                ₹{(totalReceived - totalExpenses - totalGSTCollected).toFixed(0)}
              </p>
            </div>
          </div>
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="p-6 border-b border-gray-800">
              <h3 className="font-bold text-lg">💰 Cash Flow Statement</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h4 className="text-green-400 font-semibold mb-3 text-sm uppercase">OPERATING ACTIVITIES — INFLOWS</h4>
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-300">Collections from clients</span>
                  <span className="text-green-400 font-semibold">+ ₹{totalReceived.toLocaleString()}</span>
                </div>
              </div>
              <div>
                <h4 className="text-red-400 font-semibold mb-3 text-sm uppercase">OPERATING ACTIVITIES — OUTFLOWS</h4>
                {Object.entries(expenseByCategory).map(([cat, amt]: any) => (
                  <div key={cat} className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-300">{cat}</span>
                    <span className="text-red-400">- ₹{amt.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-300">GST Payable to Government</span>
                  <span className="text-red-400">- ₹{totalGSTCollected.toFixed(0)}</span>
                </div>
              </div>
              <div className="bg-gray-800 rounded-xl p-4 flex justify-between items-center">
                <span className="font-bold text-lg">NET CASH FLOW</span>
                <span className={`text-2xl font-bold ${totalReceived - totalExpenses - totalGSTCollected >= 0 ? "text-green-400" : "text-red-400"}`}>
                  ₹{(totalReceived - totalExpenses - totalGSTCollected).toFixed(0)}
                </span>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Pending Collections: ₹{totalPending.toLocaleString()} (not yet received)</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}