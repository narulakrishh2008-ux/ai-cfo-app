"use client";
import { useState, useEffect } from "react";
import { supabase } from "./supabase";

export default function CADashboard({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState("home");
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [selectedDoc, setSelectedDoc] = useState("P&L Statement");
  const [loading, setLoading] = useState(true);
  const [clientSales, setClientSales] = useState<any[]>([]);
  const [clientPayments, setClientPayments] = useState<any[]>([]);
  const [gstStatus, setGstStatus] = useState<any>({});

  useEffect(() => {
    fetchClients();
    fetchPendingInvites();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      fetchClientSales();
      fetchClientNotes();
    }
  }, [selectedClient]);

  const fetchClients = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ca_client_links")
      .select("*")
      .eq("ca_email", user?.email)
      .eq("status", "accepted");
    if (data) setClients(data);
    setLoading(false);
  };

  const fetchPendingInvites = async () => {
    const { data } = await supabase
      .from("ca_client_links")
      .select("*")
      .eq("ca_email", user?.email)
      .eq("status", "pending");
    if (data) setPendingInvites(data);
  };

  const fetchClientSales = async () => {
    const { data: sales } = await supabase
      .from("sales")
      .select("*")
      .eq("client_name", selectedClient?.client_name)
      .order("created_at", { ascending: false });
    if (sales) setClientSales(sales);

    const { data: payments } = await supabase
      .from("payments")
      .select("*")
      .eq("client_name", selectedClient?.client_name)
      .order("created_at", { ascending: false });
    if (payments) setClientPayments(payments);
  };

  const fetchClientNotes = async () => {
    const { data } = await supabase
      .from("ca_notes")
      .select("*")
      .eq("ca_email", user?.email)
      .eq("client_email", selectedClient?.client_email)
      .order("created_at", { ascending: false });
    if (data) setNotes(data);
  };

  const acceptInvite = async (invite: any) => {
    await supabase
      .from("ca_client_links")
      .update({ status: "accepted" })
      .eq("id", invite.id);
    fetchClients();
    fetchPendingInvites();
  };

  const rejectInvite = async (invite: any) => {
    await supabase
      .from("ca_client_links")
      .update({ status: "rejected" })
      .eq("id", invite.id);
    fetchPendingInvites();
  };

  const addNote = async () => {
    if (!newNote || !selectedClient) return;
    await supabase.from("ca_notes").insert([{
      ca_email: user?.email,
      client_email: selectedClient?.client_email,
      document: selectedDoc,
      note: newNote,
      date: new Date().toLocaleDateString("en-IN")
    }]);
    setNewNote("");
    fetchClientNotes();
  };

  const updateGstStatus = async (clientEmail: string, type: string, status: string) => {
    setGstStatus((prev: any) => ({
      ...prev,
      [`${clientEmail}_${type}`]: status
    }));
  };

  // Calculations
  const totalRevenue = clientSales.reduce((a, s) => a + Number(s.total || 0), 0);
  const totalReceived = clientSales.reduce((a, s) => a + Number(s.paid || 0), 0);
  const totalPending = totalRevenue - totalReceived;
  const totalGST = clientSales.reduce((a, s) => a + Number(s.gst_amount || 0), 0);
  const totalBaseRevenue = clientSales.reduce((a, s) => a + Number(s.base_amount || 0), 0);
  const totalCost = clientSales.reduce((a, s) => a + (Number(s.cost || 0) * Number(s.qty || 0)), 0);
  const netProfit = totalBaseRevenue - totalCost;

  const documents = [
    "P&L Statement",
    "GST Report",
    "TDS Tracker",
    "Balance Sheet",
    "Cash Flow",
    "All Invoices"
  ];

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">

      {/* CA Sidebar */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold text-blue-400">📊 CA Portal</h1>
          <p className="text-xs text-gray-400 mt-1">Chartered Accountant Dashboard</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: "home", icon: "🏠", label: "Home" },
            { id: "clients", icon: "👥", label: "My Clients" },
            { id: "invites", icon: "📨", label: `Invites ${pendingInvites.length > 0 ? `(${pendingInvites.length})` : ""}` },
            { id: "deadlines", icon: "📅", label: "Deadlines" },
            { id: "gst", icon: "🧾", label: "GST Tracker" },
          ].map(item => (
            <button key={item.id}
              onClick={() => { setActiveTab(item.id); setSelectedClient(null); }}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all ${activeTab === item.id ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800"}`}>
              <span>{item.icon}</span><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <p className="text-xs text-gray-300 font-semibold">{user?.profile?.name}</p>
          <p className="text-xs text-gray-500">CA License: {user?.profile?.ca_license || "Not set"}</p>
          <p className="text-xs text-blue-400 mt-1">CA Professional Plan</p>
<button
  onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}
  className="w-full bg-red-900 hover:bg-red-800 text-red-400 py-2 rounded-lg text-xs font-semibold mt-2">
  🚪 Logout
</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">

        {/* HOME */}
        {activeTab === "home" && (
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-2">Welcome, {user?.profile?.name?.split(" ")[0]} 👋</h2>
            <p className="text-gray-400 mb-8">Here's your practice overview</p>

            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
                <p className="text-gray-400 text-sm">Total Clients</p>
                <p className="text-3xl font-bold mt-1">{clients.length}</p>
              </div>
              <div className="bg-gray-900 rounded-2xl p-5 border border-yellow-900">
                <p className="text-gray-400 text-sm">Pending Invites</p>
                <p className="text-3xl font-bold text-yellow-400 mt-1">{pendingInvites.length}</p>
              </div>
              <div className="bg-gray-900 rounded-2xl p-5 border border-red-900">
                <p className="text-gray-400 text-sm">GST Due This Month</p>
                <p className="text-3xl font-bold text-red-400 mt-1">{clients.length}</p>
              </div>
              <div className="bg-gray-900 rounded-2xl p-5 border border-green-900">
                <p className="text-gray-400 text-sm">Documents Approved</p>
                <p className="text-3xl font-bold text-green-400 mt-1">0</p>
              </div>
            </div>

            {/* Pending Invites Alert */}
            {pendingInvites.length > 0 && (
              <div className="bg-yellow-900 border border-yellow-700 rounded-2xl p-6 mb-6">
                <h3 className="font-bold text-yellow-400 mb-3">📨 Pending Client Invites</h3>
                {pendingInvites.map(invite => (
                  <div key={invite.id} className="flex justify-between items-center py-2 border-b border-yellow-800 last:border-0">
                    <div>
                      <p className="font-medium">{invite.client_name}</p>
                      <p className="text-sm text-yellow-400">{invite.client_email}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => acceptInvite(invite)}
                        className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg text-sm font-semibold">
                        Accept ✅
                      </button>
                      <button onClick={() => rejectInvite(invite)}
                        className="bg-red-700 hover:bg-red-600 px-4 py-2 rounded-lg text-sm">
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Client List Preview */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h3 className="font-semibold mb-4">👥 My Clients</h3>
              {clients.length === 0 ? (
                <p className="text-gray-400">No clients yet. Ask your clients to invite you from their dashboard!</p>
              ) : clients.map(client => (
                <div key={client.id}
                  onClick={() => { setSelectedClient(client); setActiveTab("clientportal"); }}
                  className="flex justify-between items-center py-3 border-b border-gray-800 last:border-0 cursor-pointer hover:bg-gray-800 px-2 rounded-lg">
                  <div>
                    <p className="font-medium">{client.client_name}</p>
                    <p className="text-sm text-gray-400">{client.client_email}</p>
                  </div>
                  <span className="text-blue-400 text-sm">View →</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CLIENTS LIST */}
        {activeTab === "clients" && !selectedClient && (
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-8">👥 My Clients</h2>
            {loading ? <p className="text-gray-400">Loading...</p> :
              clients.length === 0 ? (
                <div className="bg-gray-900 rounded-2xl p-12 text-center border border-gray-800">
                  <p className="text-4xl mb-4">👥</p>
                  <p className="text-xl font-semibold mb-2">No clients yet</p>
                  <p className="text-gray-400">Ask your clients to invite you from their Finlytix dashboard</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {clients.map(client => (
                    <div key={client.id}
                      onClick={() => { setSelectedClient(client); setActiveTab("clientportal"); }}
                      className="bg-gray-900 rounded-2xl p-6 border border-gray-800 cursor-pointer hover:border-blue-600 transition-all">
                      <h3 className="font-bold text-lg mb-1">{client.client_name}</h3>
                      <p className="text-gray-400 text-sm mb-4">{client.client_email}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs bg-green-900 text-green-400 px-3 py-1 rounded-full">Active Client</span>
                        <span className="text-blue-400 text-sm">Open Portal →</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}

        {/* CLIENT PORTAL */}
        {activeTab === "clientportal" && selectedClient && (
          <div className="p-8">
            <button onClick={() => { setSelectedClient(null); setActiveTab("clients"); }}
              className="text-gray-400 hover:text-white mb-6 flex items-center gap-2">
              ← Back to Clients
            </button>

            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-bold">{selectedClient.client_name}</h2>
                <p className="text-gray-400">{selectedClient.client_email}</p>
              </div>
              <span className="bg-green-900 text-green-400 px-4 py-2 rounded-full text-sm">Active Client</span>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
                <p className="text-gray-400 text-sm">Total Revenue</p>
                <p className="text-2xl font-bold mt-1">₹{totalRevenue.toLocaleString()}</p>
              </div>
              <div className="bg-gray-900 rounded-2xl p-5 border border-green-900">
                <p className="text-gray-400 text-sm">Received</p>
                <p className="text-2xl font-bold text-green-400 mt-1">₹{totalReceived.toLocaleString()}</p>
              </div>
              <div className="bg-gray-900 rounded-2xl p-5 border border-red-900">
                <p className="text-gray-400 text-sm">Pending</p>
                <p className="text-2xl font-bold text-red-400 mt-1">₹{totalPending.toLocaleString()}</p>
              </div>
              <div className="bg-gray-900 rounded-2xl p-5 border border-yellow-900">
                <p className="text-gray-400 text-sm">GST Collected</p>
                <p className="text-2xl font-bold text-yellow-400 mt-1">₹{totalGST.toFixed(0)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">

              {/* Documents */}
              <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-800">
                  <h3 className="font-bold text-lg">📁 Documents</h3>
                </div>
                <div className="p-4 space-y-2">
                  {[
                    { name: "📊 P&L Statement", status: "Ready" },
                    { name: "🧾 GST Report", status: "Ready" },
                    { name: "💼 TDS Tracker", status: "Pending" },
                    { name: "🏦 Balance Sheet", status: "Ready" },
                    { name: "💸 Cash Flow", status: "Ready" },
                  ].map((doc, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-gray-800 rounded-xl">
                      <span className="text-sm">{doc.name}</span>
                      <div className="flex gap-2 items-center">
                        <span className={`text-xs px-2 py-1 rounded-full ${doc.status === "Ready" ? "bg-green-900 text-green-400" : "bg-yellow-900 text-yellow-400"}`}>
                          {doc.status}
                        </span>
                        <button className="text-xs text-blue-400 hover:text-blue-300">View</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CA Notes */}
              <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-800">
                  <h3 className="font-bold text-lg">📝 CA Notes</h3>
                </div>
                <div className="p-4">
                  <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                    {notes.length === 0 ? (
                      <p className="text-gray-400 text-sm">No notes yet</p>
                    ) : notes.map((note, i) => (
                      <div key={i} className="bg-gray-800 rounded-xl p-3">
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-blue-400">{note.document}</span>
                          <span className="text-xs text-gray-500">{note.date}</span>
                        </div>
                        <p className="text-sm">{note.note}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <select value={selectedDoc}
                      onChange={e => setSelectedDoc(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm mb-2">
                      {documents.map(d => <option key={d}>{d}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <input placeholder="Add a note..."
                        value={newNote}
                        onChange={e => setNewNote(e.target.value)}
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-500" />
                      <button onClick={addNote}
                        className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl text-sm">
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* P&L Summary */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 mt-6 overflow-hidden">
              <div className="p-6 border-b border-gray-800">
                <h3 className="font-bold text-lg">📊 P&L Summary</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-400">Total Revenue (with GST)</span>
                    <span className="font-semibold">₹{totalRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-400">Less: GST Collected</span>
                    <span className="text-yellow-400">- ₹{totalGST.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-400">Net Revenue</span>
                    <span className="font-semibold">₹{totalBaseRevenue.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-400">Less: Cost of Goods</span>
                    <span className="text-red-400">- ₹{totalCost.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between py-2 font-bold text-lg">
                    <span>Net Profit</span>
                    <span className={netProfit >= 0 ? "text-green-400" : "text-red-400"}>
                      ₹{netProfit.toFixed(0)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-400">Profit Margin</span>
                    <span className="text-green-400">
                      {totalBaseRevenue > 0 ? ((netProfit / totalBaseRevenue) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sales History */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 mt-6 overflow-hidden">
              <div className="p-6 border-b border-gray-800">
                <h3 className="font-bold text-lg">🧾 Sales History</h3>
                <p className="text-gray-400 text-sm">{clientSales.length} sales recorded</p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-sm">
                    <th className="text-left p-4">Date</th>
                    <th className="text-left p-4">Product</th>
                    <th className="text-right p-4">Total</th>
                    <th className="text-right p-4">GST</th>
                    <th className="text-right p-4">Paid</th>
                    <th className="text-right p-4">Balance</th>
                    <th className="text-center p-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {clientSales.map(sale => (
                    <tr key={sale.id} className="border-b border-gray-800 hover:bg-gray-800">
                      <td className="p-4 text-gray-400 text-sm">{sale.date}</td>
                      <td className="p-4">{sale.product}</td>
                      <td className="p-4 text-right">₹{Number(sale.total).toLocaleString()}</td>
                      <td className="p-4 text-right text-yellow-400">₹{Number(sale.gst_amount || 0).toFixed(0)}</td>
                      <td className="p-4 text-right text-green-400">₹{Number(sale.paid).toLocaleString()}</td>
                      <td className="p-4 text-right text-red-400">₹{(Number(sale.total) - Number(sale.paid)).toLocaleString()}</td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs ${sale.status === "paid" ? "bg-green-900 text-green-400" : sale.status === "partial" ? "bg-yellow-900 text-yellow-400" : "bg-red-900 text-red-400"}`}>
                          {sale.status === "paid" ? "✅ Paid" : sale.status === "partial" ? "🟡 Partial" : "🔴 Unpaid"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* INVITES */}
        {activeTab === "invites" && (
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-8">📨 Client Invites</h2>
            {pendingInvites.length === 0 ? (
              <div className="bg-gray-900 rounded-2xl p-12 text-center border border-gray-800">
                <p className="text-4xl mb-4">📨</p>
                <p className="text-xl font-semibold mb-2">No pending invites</p>
                <p className="text-gray-400">When a business invites you, it will appear here</p>
              </div>
            ) : pendingInvites.map(invite => (
              <div key={invite.id} className="bg-gray-900 rounded-2xl p-6 border border-yellow-900 mb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg">{invite.client_name}</h3>
                    <p className="text-gray-400">{invite.client_email}</p>
                    <p className="text-sm text-gray-500 mt-1">Invited: {invite.invited_at}</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => acceptInvite(invite)}
                      className="bg-green-600 hover:bg-green-500 px-6 py-3 rounded-xl font-semibold">
                      Accept ✅
                    </button>
                    <button onClick={() => rejectInvite(invite)}
                      className="bg-red-700 hover:bg-red-600 px-6 py-3 rounded-xl">
                      Reject ❌
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* DEADLINES */}
        {activeTab === "deadlines" && (
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-8">📅 Tax Deadlines</h2>
            <div className="space-y-4">
              {[
                { task: "GSTR-1 Filing", due: "11th of every month", type: "GST", urgent: true },
                { task: "GSTR-3B Filing", due: "20th of every month", type: "GST", urgent: true },
                { task: "TDS Payment", due: "7th of every month", type: "TDS", urgent: false },
                { task: "TDS Return Q1", due: "31 July 2026", type: "TDS", urgent: false },
                { task: "TDS Return Q2", due: "31 Oct 2026", type: "TDS", urgent: false },
                { task: "TDS Return Q3", due: "31 Jan 2027", type: "TDS", urgent: false },
                { task: "TDS Return Q4", due: "31 May 2027", type: "TDS", urgent: false },
                { task: "ITR Filing", due: "31 July 2026", type: "Income Tax", urgent: false },
                { task: "Tax Audit", due: "30 Sep 2026", type: "Audit", urgent: false },
                { task: "GSTR-9 Annual Return", due: "31 Dec 2026", type: "GST", urgent: false },
              ].map((item, i) => (
                <div key={i} className={`bg-gray-900 rounded-2xl p-6 border ${item.urgent ? "border-red-900" : "border-gray-800"}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold">{item.task}</h3>
                      <p className="text-gray-400 text-sm mt-1">Due: {item.due}</p>
                    </div>
                    <div className="flex gap-3 items-center">
                      <span className={`text-xs px-3 py-1 rounded-full ${item.type === "GST" ? "bg-yellow-900 text-yellow-400" : item.type === "TDS" ? "bg-blue-900 text-blue-400" : item.type === "Audit" ? "bg-purple-900 text-purple-400" : "bg-green-900 text-green-400"}`}>
                        {item.type}
                      </span>
                      {item.urgent && <span className="text-xs bg-red-900 text-red-400 px-3 py-1 rounded-full">⚠️ Monthly</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GST TRACKER */}
        {activeTab === "gst" && (
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-8">🧾 GST Filing Tracker</h2>
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-sm">
                    <th className="text-left p-4">Client</th>
                    <th className="text-center p-4">GSTR-1</th>
                    <th className="text-center p-4">GSTR-3B</th>
                    <th className="text-center p-4">GSTR-9 Annual</th>
                    <th className="text-center p-4">ITR</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map(client => (
                    <tr key={client.id} className="border-b border-gray-800 hover:bg-gray-800">
                      <td className="p-4 font-medium">{client.client_name}</td>
                      {["gstr1", "gstr3b", "gstr9", "itr"].map(type => (
                        <td key={type} className="p-4 text-center">
                          <select
                            value={gstStatus[`${client.client_email}_${type}`] || "pending"}
                            onChange={e => updateGstStatus(client.client_email, type, e.target.value)}
                            className={`text-xs px-3 py-1 rounded-full border-0 cursor-pointer ${
                              (gstStatus[`${client.client_email}_${type}`] || "pending") === "filed"
                                ? "bg-green-900 text-green-400"
                                : (gstStatus[`${client.client_email}_${type}`] || "pending") === "pending"
                                ? "bg-yellow-900 text-yellow-400"
                                : "bg-red-900 text-red-400"
                            }`}>
                            <option value="pending">⚠️ Pending</option>
                            <option value="filed">✅ Filed</option>
                            <option value="overdue">🔴 Overdue</option>
                          </select>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}