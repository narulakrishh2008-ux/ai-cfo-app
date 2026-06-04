"use client";
import { useState } from "react";
import { supabase } from "./supabase";

export default function Login({ onLogin }: { onLogin: (user: any) => void }) {
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "owner",
    business_name: "",
    ca_license: ""
  });

  const handleSubmit = async () => {
    if (!form.email || !form.password) {
      setError("Please fill all required fields!");
      return;
    }
    setLoading(true);
    setError("");

    if (isSignup) {
      // Sign up
      const { data, error: signupError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });

      if (signupError) {
        setError(signupError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        // Save user profile
        await supabase.from("users").insert([{
          email: form.email,
          name: form.name,
          role: form.role,
          business_name: form.business_name,
          ca_license: form.ca_license,
          subscription: "free"
        }]);

        // Fetch user profile
        const { data: profile } = await supabase
          .from("users")
          .select("*")
          .eq("email", form.email)
          .single();

        onLogin({ ...data.user, profile });
      }
    } else {
      // Login
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (loginError) {
        setError("Invalid email or password!");
        setLoading(false);
        return;
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from("users")
          .select("*")
          .eq("email", form.email)
          .single();

        onLogin({ ...data.user, profile });
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-green-400">💼 AI CFO</h1>
          <p className="text-gray-400 mt-2">Smart Finance Dashboard for Indian Businesses</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold mb-6 text-white">
            {isSignup ? "Create Account" : "Welcome Back"}
          </h2>

          {error && (
            <div className="bg-red-900 border border-red-700 text-red-400 px-4 py-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {isSignup && (
              <>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Full Name *</label>
                  <input placeholder="e.g. Krishh Narula"
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-1 block">I am a *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setForm({...form, role: "owner"})}
                      className={`py-3 rounded-xl font-medium border transition-all ${form.role === "owner" ? "bg-green-600 border-green-500 text-white" : "bg-gray-800 border-gray-700 text-gray-400"}`}>
                      🏢 Business Owner
                    </button>
                    <button
                      onClick={() => setForm({...form, role: "ca"})}
                      className={`py-3 rounded-xl font-medium border transition-all ${form.role === "ca" ? "bg-green-600 border-green-500 text-white" : "bg-gray-800 border-gray-700 text-gray-400"}`}>
                      📊 Chartered Accountant
                    </button>
                  </div>
                </div>

                {form.role === "owner" && (
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Business Name *</label>
                    <input placeholder="e.g. Krishh Enterprises"
                      value={form.business_name}
                      onChange={e => setForm({...form, business_name: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
                  </div>
                )}

                {form.role === "ca" && (
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">CA License Number *</label>
                    <input placeholder="e.g. CA/2024/123456"
                      value={form.ca_license}
                      onChange={e => setForm({...form, ca_license: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
                  </div>
                )}
              </>
            )}

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Email *</label>
              <input placeholder="you@example.com" type="email"
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Password *</label>
              <input placeholder="Min 6 characters" type="password"
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500" />
            </div>
          </div>

          <button onClick={handleSubmit} disabled={loading}
            className="w-full bg-green-600 hover:bg-green-500 py-3 rounded-xl font-semibold mt-6 disabled:opacity-50 text-white">
            {loading ? "Please wait..." : isSignup ? "Create Account 🚀" : "Login →"}
          </button>

          <p className="text-center text-gray-400 mt-4 text-sm">
            {isSignup ? "Already have an account?" : "Don't have an account?"}
            <button onClick={() => { setIsSignup(!isSignup); setError(""); }}
              className="text-green-400 ml-1 hover:text-green-300">
              {isSignup ? "Login" : "Sign Up Free"}
            </button>
          </p>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          ₹500/month after free trial • Cancel anytime
        </p>
      </div>
    </div>
  );
}