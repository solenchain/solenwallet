import { useState } from "react";
import { NetworkSelector } from "./NetworkSelector";
import { AccountSelector } from "./AccountSelector";
import { useWallet } from "../lib/context";

export function Header() {
  const { lock, hasPassword, setPassword, isLocked } = useWallet();
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    if (newPw.length < 6) {
      setPwError("Password must be at least 6 characters");
      return;
    }
    if (newPw !== confirmPw) {
      setPwError("Passwords don't match");
      return;
    }
    await setPassword(newPw);
    setShowSetPassword(false);
    setNewPw("");
    setConfirmPw("");
  };

  return (
    <>
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-xl font-bold tracking-tight">
              <span className="text-emerald-400">Solen</span>
              <span className="text-gray-400 font-normal">Wallet</span>
            </div>
            <NetworkSelector />
          </div>
          <div className="flex items-center gap-2">
            {!isLocked && <AccountSelector />}
            {!isLocked && hasPassword && (
              <button
                onClick={lock}
                title="Lock wallet"
                className="p-2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </button>
            )}
            {!isLocked && !hasPassword && (
              <button
                onClick={() => setShowSetPassword(true)}
                title="Set password"
                className="p-2 text-yellow-500 hover:text-yellow-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Set password modal */}
      {showSetPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-200 mb-2">Set Wallet Password</h3>
            <p className="text-sm text-gray-500 mb-4">
              Your keys will be encrypted. You'll need this password to unlock the wallet.
            </p>
            <form onSubmit={handleSetPassword} className="space-y-3">
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="New password (min 6 chars)"
                autoFocus
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
              />
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Confirm password"
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
              />
              {pwError && <p className="text-red-400 text-sm">{pwError}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-lg transition-colors"
                >
                  Set Password
                </button>
                <button
                  type="button"
                  onClick={() => { setShowSetPassword(false); setNewPw(""); setConfirmPw(""); setPwError(""); }}
                  className="px-4 bg-gray-800 text-gray-400 py-2.5 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
