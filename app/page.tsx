"use client";
import Expenses from "./expenses";
import Sales from "./sales";
import ClientPortal from "./clientportal";
import Login from "./login";
import CADashboard from "./cadashboard";
import Accounts from "./accounts";
import { useState, useEffect } from "react";
import { supabase } from "./supabase";


export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showEditClient, setShowEditClient] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [activePage, setActivePage] = useState("dashboard");
  const [newClient, setNewClient] = useState({ name: "", phone: "", totalBusiness: "", amountDue: "" });
  const [editClient, setEditClient] = useState({ name: "", phone: "", totalBusiness: "", amountDue: "" });
  const [caEmail, setCaEmail] = useState("");
  const [inviteSent, setInviteSent] = useState(false);
  const [loading, setLoading] = useState(true);


  useEffect(() => { checkUser(); }, []);


  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase
        .from("users").select("*").eq("email", session.user.email).single();
      setUser({ ...session.user, profile });
      await fetchClients(session.user.email);
    }
    setLoading(false);
  };


  const fetchClients = async (email?: string) => {
    const userEmail = email || user?.email;
    if (!userEmail) return;
    const { data } = await supabase
      .from("clients").select("*").eq("owner_email", userEmail).order("created_at", { ascending: false });
    if (data) setClients(data.map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      totalBusiness: Number(c.total_business) || 0,
      amountDue: Number(c.amount_due) || 0,
      lastPayment: c.last_payment || "Not yet",
      status: c.status || "pending",
      gstin: c.gstin || ""
    })));
  };


  const handleLogin = async (loggedInUser: any) => {
    setUser(loggedInUser);
    await fetchClients(loggedInUser.email);
  };


  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setClients([]);
    setActivePage("dashboard");
  };


  const addClient = async () => {
    if (!newClient.name || !newClient.phone) return;
    await supabase.from("clients").insert([{
      name: newClient.name,
      phone: newClient.phone,
      total_business: Number(newClient.totalBusiness) || 0,
      amount_due: Number(newClient.amountDue) || 0,
      last_payment: "Not yet",
      status: Number(newClient.amountDue) > 0 ? "pending" : "paid",
      owner_email: user?.email
    }]);
    fetchClients();
    setNewClient({ name: "", phone: "", totalBusiness: "", amountDue: "" });
    setShowAddClient(false);
  };


  const openEditClient = (client: any) => {
    setEditingClient(client);
    setEditClient({
      name: client.name || "",
      phone: client.phone || "",
      totalBusiness: String(client.totalBusiness || ""),
      amountDue: String(client.amountDue || "")
    });
    setShowEditClient(true);
  };


  const saveEditClient = async () => {
    if (!editClient.name || !editingClient) return;
    await supabase.from("clients").update({
      name: editClient.name,
      phone: editClient.phone,
      total_business: Number(editClient.totalBusiness) || 0,
      amount_due: Number(editClient.amountDue) || 0,
    }).eq("id", editingClient.id);
    await fetchClients();
    setShowEditClient(false);
    setEditingClient(null);
  };


  const deleteClient = async (id: number) => {
    if (!confirm("Are you sure you want to delete this client?")) return;
    await supabase.from("clients").delete().eq("id", id);
    fetchClients();
  };


  const sendWhatsApp = (client: any) => {
    const message = `Dear ${client.name}, your payment of ₹${client.amountDue.toLocaleString()} is due. Please make the payment at your earliest convenience. Thank you!`;
    window.open(`https://wa.me/91${client.phone}?text=${encodeURIComponent(message)}`, "_blank");
  };


  const inviteCA = async () => {
    if (!caEmail) return;
    await supabase.from("ca_client_links").insert([{
      ca_email: caEmail,
      client_email: user?.email,
      ca_name: "",
      client_name: user?.profile?.name || user?.profile?.business_name,
      status: "pending",
      invited_at: new Date().toLocaleDateString("en-IN")
    }]);
    setInviteSent(true);
    setCaEmail("");
    setTimeout(() => setInviteSent(false), 2000);
  };


  const totalReceivables = clients.reduce((a, c) => a + c.amountDue, 0);
  const totalBusiness = clients.reduce((a, c) => a + c.totalBusiness, 0);
  const overdueClients = clients.filter(c => c.status === "overdue").length;


  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-green-400 text-xl">Loading AI CFO...</p>
    </div>
  );


  if (!user) return <Login onLogin={handleLogin} />;
  if (user?.profile?.role === "ca") return <CADashboard user={user} />;


  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col min-h-screen">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold text-green-400">💼 AI CFO</h1>
          <p className="text-xs text-gray-400 mt-1">Smart Finance Dashboard</p>
        </div>
        <nav className="overflow-y-auto p-4 space-y-2 flex-1">
          {[
            { id: "dashboard", icon: "🏠", label: "Dashboard" },
            { id: "clients", icon: "👥", label: "Clients" },
            { id: "sales", icon: "🧾", label: "Sales & Payments" },
            { id: "expenses", icon: "💰", label: "Expenses & Profit" },
            { id: "accounts", icon: "📊", label: "Accounts & Tax" },
            { id: "ai", icon: "🤖", label: "AI CFO Chat" },
            { id: "invite", icon: "📨", label: "Invite My CA" },
          ].map(item => (
            <button key={item.id} onClick={() => { setActivePage(item.id); setSelectedClient(null); }}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all ${activePage === item.id ? "bg-green-600 text-white" : "text-gray-400 hover:bg-gray-800"}`}>
              <span>{item.icon}</span><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800 space-y-2">
          <p className="text-xs text-gray-300 font-semibold truncate">{user?.profile?.name || "User"}</p>
          <p className="text-xs text-gray-500 truncate">{user?.profile?.business_name || "Business Owner"}</p>
          <p className="text-xs text-green-400">Pro Plan Active</p>
          <button onClick={handleLogout}
            className="w-full bg-red-900 hover:bg-red-800 text-red-400 py-2 rounded-lg text-xs font-semibold mt-2">
            🚪 Logout
          </button>
        </div>
      </div>


      <div className="flex-1 overflow-y-auto">


        {activePage === "dashboard" && (
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-2">Good morning, {user?.profile?.name?.split(" ")[0] || "there"} 👋</h2>
            <p className="text-gray-400 mb-8">Here's your business overview for today</p>
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                <p className="text-gray-400 text-sm">Total Business</p>
                <p className="text-3xl font-bold text-white mt-2">₹{totalBusiness.toLocaleString()}</p>
              </div>
              <div className="bg-gray-900 rounded-2xl p-6 border border-red-900">
                <p className="text-gray-400 text-sm">Total Receivables</p>
                <p className="text-3xl font-bold text-red-400 mt-2">₹{totalReceivables.toLocaleString()}</p>
              </div>
              <div className="bg-gray-900 rounded-2xl p-6 border border-yellow-900">
                <p className="text-gray-400 text-sm">Overdue Clients</p>
                <p className="text-3xl font-bold text-yellow-400 mt-2">{overdueClients}</p>
              </div>
            </div>
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h3 className="font-semibold mb-4">⚠️ Overdue Alerts</h3>
              {clients.filter(c => c.status === "overdue").length === 0 ? (
                <p className="text-gray-400">No overdue clients 🎉</p>
              ) : clients.filter(c => c.status === "overdue").map(c => (
                <div key={c.id} className="flex justify-between items-center py-3 border-b border-gray-800 last:border-0">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-gray-400">Last payment: {c.lastPayment}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-red-400 font-bold">₹{c.amountDue.toLocaleString()}</p>
                    <button onClick={() => sendWhatsApp(c)} className="text-xs bg-green-600 px-3 py-1 rounded-full mt-1 hover:bg-green-500">Send WhatsApp</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {activePage === "clients" && !selectedClient && (
          <div className="p-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold">Clients</h2>
                <p className="text-gray-400">{clients.length} total clients</p>
              </div>
              <button onClick={() => setShowAddClient(true)} className="bg-green-600 hover:bg-green-500 px-6 py-3 rounded-xl font-semibold">+ Add New Client</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {clients.map(client => (
                <div key={client.id}
                  className="bg-gray-900 rounded-2xl p-6 border border-gray-800 hover:border-green-600 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="cursor-pointer flex-1" onClick={() => setSelectedClient(client)}>
                      <h3 className="font-bold text-lg">{client.name}</h3>
                      <p className="text-gray-400 text-sm">📱 {client.phone || "No phone"}</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className={`text-xs px-3 py-1 rounded-full ${client.status === "paid" ? "bg-green-900 text-green-400" : client.status === "overdue" ? "bg-red-900 text-red-400" : "bg-yellow-900 text-yellow-400"}`}>
                        {client.status}
                      </span>
                      <button onClick={() => openEditClient(client)}
                        className="text-xs bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded-lg">✏️</button>
                      <button onClick={() => deleteClient(client.id)}
                        className="text-xs bg-red-900 hover:bg-red-800 px-2 py-1 rounded-lg text-red-400">🗑️</button>
                    </div>
                  </div>
                  <div className="flex justify-between cursor-pointer" onClick={() => setSelectedClient(client)}>
                    <div>
                      <p className="text-xs text-gray-400">Total Business</p>
                      <p className="font-semibold">₹{client.totalBusiness.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Amount Due</p>
                      <p className={`font-semibold ${client.amountDue > 0 ? "text-red-400" : "text-green-400"}`}>
                        ₹{client.amountDue.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>


            {/* Add Client Modal */}
            {showAddClient && (
              <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md border border-gray-700">
                  <h3 className="text-xl font-bold mb-6">Add New Client</h3>
                  <div className="space-y-4">
                    <input placeholder="Client Name *" value={newClient.name}
                      onChange={e => setNewClient(f => ({...f, name: e.target.value}))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
                    <input placeholder="Phone Number *" value={newClient.phone}
                      onChange={e => setNewClient(f => ({...f, phone: e.target.value}))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
                    <input placeholder="Total Business (₹)" value={newClient.totalBusiness}
                      onChange={e => setNewClient(f => ({...f, totalBusiness: e.target.value}))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
                    <input placeholder="Amount Due (₹)" value={newClient.amountDue}
                      onChange={e => setNewClient(f => ({...f, amountDue: e.target.value}))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={addClient} className="flex-1 bg-green-600 hover:bg-green-500 py-3 rounded-xl font-semibold">Add Client</button>
                    <button onClick={() => setShowAddClient(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-xl">Cancel</button>
                  </div>
                </div>
              </div>
            )}


            {/* Edit Client Modal */}
            {showEditClient && editingClient && (
              <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md border border-blue-700">
                  <h3 className="text-xl font-bold mb-2">✏️ Edit Client</h3>
                  <p className="text-gray-400 text-sm mb-6">Editing: <span className="text-white font-semibold">{editingClient.name}</span></p>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Client Name *</label>
                      <input placeholder="Client Name" value={editClient.name}
                        onChange={e => setEditClient(f => ({...f, name: e.target.value}))}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Phone Number</label>
                      <input placeholder="Phone Number" value={editClient.phone}
                        onChange={e => setEditClient(f => ({...f, phone: e.target.value}))}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Total Business (₹)</label>
                      <input placeholder="Total Business" value={editClient.totalBusiness}
                        onChange={e => setEditClient(f => ({...f, totalBusiness: e.target.value}))}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Amount Due (₹)</label>
                      <input placeholder="Amount Due" value={editClient.amountDue}
                        onChange={e => setEditClient(f => ({...f, amountDue: e.target.value}))}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={saveEditClient} className="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-semibold">Save Changes ✅</button>
                    <button onClick={() => { setShowEditClient(false); setEditingClient(null); }} className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-xl">Cancel</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}


        {activePage === "clients" && selectedClient && (
          <ClientPortal
            client={selectedClient}
            onBack={() => setSelectedClient(null)}
            onWhatsApp={sendWhatsApp}
          />
        )}


        {activePage === "sales" && (
          <Sales clients={clients} onClientsChange={() => fetchClients()} userEmail={user?.email} />
        )}


        {activePage === "expenses" && <Expenses />}


        {activePage === "accounts" && <Accounts userEmail={user?.email} />}


        {activePage === "ai" && (
          <AIChat
            userEmail={user?.email}
            userName={user?.profile?.name}
            clients={clients}
            totalReceivables={totalReceivables}
            totalBusiness={totalBusiness}
          />
        )}


        {activePage === "invite" && (
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-2">📨 Invite My CA</h2>
            <p className="text-gray-400 mb-8">Invite your Chartered Accountant to view your financial data</p>
            <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 max-w-md">
              <h3 className="font-bold text-lg mb-6">Enter Your CA's Email</h3>
              {inviteSent ? (
                <div className="bg-green-900 border border-green-700 rounded-xl p-4 text-green-400 text-center font-semibold">
                  ✅ Invite sent successfully!
                </div>
              ) : (
                <div className="space-y-4">
                  <input placeholder="ca@example.com" type="email" value={caEmail}
                    onChange={e => setCaEmail(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
                  <button onClick={inviteCA} className="w-full bg-green-600 hover:bg-green-500 py-3 rounded-xl font-semibold">
                    Send Invite 📨
                  </button>
                </div>
              )}
              <div className="mt-6 bg-gray-800 rounded-xl p-4">
                <p className="text-sm text-gray-400">ℹ️ Your CA will receive an invite in their CA Dashboard. Once they accept, they can view your financial data, P&L, GST reports and more.</p>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
}


// AI CHAT COMPONENT
function AIChat({ userEmail, userName, clients, totalReceivables, totalBusiness }: any) {
  const [messages, setMessages] = useState<any[]>([
    { role: "assistant", content: `Hello ${userName?.split(" ")[0] || "there"}! 👋 I'm your AI CFO. I can help you with:\n\n💰 Financial analysis\n🧾 Tax saving tips\n📊 Business insights\n\nWhat would you like to know?` }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);


  useEffect(() => {
    fetchData();
  }, [userEmail]);


  const fetchData = async () => {
    if (!userEmail) return;
    const { data: salesData } = await supabase.from("sales").select("*").eq("owner_email", userEmail);
    if (salesData) setSales(salesData);
    const { data: expData } = await supabase.from("expenses").select("*").eq("owner_email", userEmail);
    if (expData) setExpenses(expData);
  };


  const totalRevenue = sales.reduce((a, s) => a + Number(s.total || 0), 0);
  const totalBaseRevenue = sales.reduce((a, s) => a + Number(s.base_amount || 0), 0);
  const totalGST = sales.reduce((a, s) => a + Number(s.gst_amount || 0), 0);
  const totalCOGS = sales.reduce((a, s) => a + (Number(s.cost || 0) * Number(s.qty || 0)), 0);
  const totalExpenses = expenses.reduce((a, e) => a + Number(e.amount || 0), 0);
  const netProfit = totalBaseRevenue - totalCOGS - totalExpenses;
  const expenseByCategory = expenses.reduce((acc: any, e) => {
    if (!acc[e.category]) acc[e.category] = 0;
    acc[e.category] += Number(e.amount || 0);
    return acc;
  }, {});


  const sendMessage = async () => {
    if (!input.trim() || loading) return;


    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);


    // Build context about the business
    const businessContext = `
You are an AI CFO assistant for an Indian small business. Here is the business's financial data:


BUSINESS OWNER: ${userName}
TOTAL REVENUE (with GST): ₹${totalRevenue.toLocaleString()}
NET REVENUE (without GST): ₹${totalBaseRevenue.toLocaleString()}
TOTAL GST COLLECTED: ₹${totalGST.toLocaleString()}
COST OF GOODS SOLD: ₹${totalCOGS.toLocaleString()}
TOTAL OPERATING EXPENSES: ₹${totalExpenses.toLocaleString()}
NET PROFIT: ₹${netProfit.toLocaleString()}
TOTAL RECEIVABLES (unpaid): ₹${totalReceivables.toLocaleString()}
TOTAL CLIENTS: ${clients.length}
OVERDUE CLIENTS: ${clients.filter((c: any) => c.status === "overdue").length}


EXPENSE BREAKDOWN:
${Object.entries(expenseByCategory).map(([cat, amt]: any) => `- ${cat}: ₹${amt.toLocaleString()}`).join("\n")}


TOP CLIENTS BY AMOUNT DUE:
${clients.sort((a: any, b: any) => b.amountDue - a.amountDue).slice(0, 3).map((c: any) => `- ${c.name}: ₹${c.amountDue.toLocaleString()} due`).join("\n")}


RECENT SALES: ${sales.length} total sales recorded


You must:
1. Answer questions about their specific business using the data above
2. Give tax saving suggestions relevant to Indian tax law (Income Tax Act, GST)
3. Mention specific sections like Section 32 (depreciation), Section 80C, Section 44AD (presumptive taxation), Section 37 (business expenses), GST input credit etc.
4. Calculate estimated tax savings in rupees when relevant
5. Be concise, practical and use Indian context (₹, Indian tax laws)
6. If asked about tax savings, look at their expenses and suggest what is deductible
7. Always be encouraging and helpful


Keep responses under 200 words. Use bullet points and emojis for readability.
    `;


    try {
      const response = await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    system: businessContext,
    messages: [
      ...messages.filter((m: any) => m.role !== "system").map((m: any) => ({
        role: m.role,
        content: m.content
      })),
      { role: "user", content: userMessage }
    ]
  })
});


      const data = await response.json();
      const reply =
  data.choices?.[0]?.message?.content ||
  "Sorry I couldn't process that. Please try again!";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry there was an error. Please try again!" }]);
    }


    setLoading(false);
  };


  // Tax saving suggestions based on real data
  const taxSuggestions = [
    expenseByCategory["Equipment"] > 0 && `💡 Equipment expenses of ₹${expenseByCategory["Equipment"]?.toLocaleString()} may qualify for depreciation deduction under **Section 32**. Estimated tax saving: ₹${Math.round(expenseByCategory["Equipment"] * 0.15 * 0.3).toLocaleString()}`,
    expenseByCategory["Professional Fees"] > 0 && `💡 Professional fees of ₹${expenseByCategory["Professional Fees"]?.toLocaleString()} are fully deductible under **Section 37**. Estimated tax saving: ₹${Math.round(expenseByCategory["Professional Fees"] * 0.3).toLocaleString()}`,
    expenseByCategory["Rent"] > 0 && `💡 Office rent of ₹${expenseByCategory["Rent"]?.toLocaleString()} is fully deductible as business expense under **Section 37**. Estimated tax saving: ₹${Math.round(expenseByCategory["Rent"] * 0.3).toLocaleString()}`,
    totalBaseRevenue < 20000000 && `💡 Your revenue is under ₹2 Crore. You may qualify for **Section 44AD Presumptive Taxation** — file ITR-4 and pay tax on just 8% of revenue instead of actual profit!`,
    totalGST > 0 && `💡 You've collected ₹${totalGST.toFixed(0)} in GST. Make sure to claim **Input Tax Credit** on your business purchases to reduce your GST liability!`,
  ].filter(Boolean);


  return (
    <div className="p-8 flex flex-col h-full bg-gray-950 min-h-screen text-white">
      <h2 className="text-2xl font-bold mb-2">🤖 AI CFO Chat</h2>
      <p className="text-gray-400 mb-6">Ask anything about your finances — powered by real data</p>


      {/* Tax Saving Suggestions */}
      {taxSuggestions.length > 0 && (
        <div className="bg-green-950 border border-green-800 rounded-2xl p-6 mb-6">
          <h3 className="font-bold text-green-400 mb-3">💰 Tax Saving Opportunities Found!</h3>
          <div className="space-y-2">
            {taxSuggestions.map((tip, i) => (
              <p key={i} className="text-sm text-green-300">{tip as string}</p>
            ))}
          </div>
        </div>
      )}


      {/* Quick Questions */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          "How can I save tax?",
          "Which client owes the most?",
          "What is my profit margin?",
          "How much GST do I owe?",
          "Tips to improve cash flow"
        ].map(q => (
          <button key={q} onClick={() => { setInput(q); }}
            className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-full text-gray-300 border border-gray-700">
            {q}
          </button>
        ))}
      </div>


      {/* Chat Messages */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-lg px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${msg.role === "user" ? "bg-green-700 text-white" : "bg-gray-800 text-gray-100"}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 px-4 py-3 rounded-2xl text-sm text-gray-400">
                Thinking... 🤔
              </div>
            </div>
          )}
        </div>


        <div className="p-4 border-t border-gray-800 flex gap-3">
          <input
            placeholder="Ask your AI CFO anything..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500"
          />
          <button onClick={sendMessage} disabled={loading || !input.trim()}
            className="bg-green-600 hover:bg-green-500 px-6 py-3 rounded-xl font-semibold disabled:opacity-50">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
