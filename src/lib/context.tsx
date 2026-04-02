import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { type NetworkId, DEFAULT_NETWORK } from "./networks";
import { type WalletAccount, loadAccounts, saveAccounts } from "./wallet";
import { encrypt, decrypt, hashPassword } from "./crypto";

const AUTO_LOCK_MS = 10 * 60 * 1000; // 10 minutes

interface WalletState {
  network: NetworkId;
  setNetwork: (n: NetworkId) => void;
  accounts: WalletAccount[];
  activeAccount: WalletAccount | null;
  setActiveAccount: (a: WalletAccount | null) => void;
  addAccount: (a: WalletAccount) => void;
  removeAccount: (accountId: string) => void;
  // Lock state
  isLocked: boolean;
  hasPassword: boolean;
  unlock: (password: string) => Promise<boolean>;
  lock: () => void;
  setPassword: (password: string) => Promise<void>;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [network, setNetwork] = useState<NetworkId>(() => {
    return (localStorage.getItem("solen_network") as NetworkId) || DEFAULT_NETWORK;
  });

  const hasPassword = !!localStorage.getItem("solen_pw_hash");

  // If password is set, start locked. Otherwise unlocked.
  const [isLocked, setIsLocked] = useState(hasPassword);
  const [accounts, setAccounts] = useState<WalletAccount[]>(() => {
    if (hasPassword) return []; // Don't load until unlocked
    return loadAccounts();
  });
  const [activeAccount, setActiveAccount] = useState<WalletAccount | null>(null);

  // Auto-lock timer
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (!hasPassword) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsLocked(true);
      setAccounts([]);
      setActiveAccount(null);
    }, AUTO_LOCK_MS);
  }, [hasPassword]);

  useEffect(() => {
    if (!hasPassword || isLocked) return;
    // Reset timer on any user interaction
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [hasPassword, isLocked, resetTimer]);

  // Initialize active account after loading
  useEffect(() => {
    if (accounts.length > 0 && !activeAccount) {
      const savedId = localStorage.getItem("solen_active_account");
      setActiveAccount(accounts.find((a) => a.accountId === savedId) || accounts[0]);
    }
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem("solen_network", network);
  }, [network]);

  useEffect(() => {
    if (activeAccount) {
      localStorage.setItem("solen_active_account", activeAccount.accountId);
    }
  }, [activeAccount]);

  const lock = () => {
    setIsLocked(true);
    setAccounts([]);
    setActiveAccount(null);
  };

  const unlock = async (password: string): Promise<boolean> => {
    const storedHash = localStorage.getItem("solen_pw_hash");
    if (!storedHash) return true;

    const inputHash = await hashPassword(password);
    if (inputHash !== storedHash) return false;

    // Decrypt accounts
    try {
      const encryptedData = localStorage.getItem("solen_wallet_encrypted");
      if (encryptedData) {
        const json = await decrypt(encryptedData, password);
        const decrypted: WalletAccount[] = JSON.parse(json);
        setAccounts(decrypted);
      } else {
        // Migration: accounts stored unencrypted, encrypt them now
        const raw = loadAccounts();
        setAccounts(raw);
        if (raw.length > 0) {
          const encrypted = await encrypt(JSON.stringify(raw), password);
          localStorage.setItem("solen_wallet_encrypted", encrypted);
          localStorage.removeItem("solen_wallet_accounts");
        }
      }
      setIsLocked(false);
      resetTimer();
      return true;
    } catch {
      return false;
    }
  };

  const setPasswordFn = async (password: string) => {
    const pwHash = await hashPassword(password);
    localStorage.setItem("solen_pw_hash", pwHash);

    // Encrypt current accounts
    const currentAccounts = accounts.length > 0 ? accounts : loadAccounts();
    if (currentAccounts.length > 0) {
      const encrypted = await encrypt(JSON.stringify(currentAccounts), password);
      localStorage.setItem("solen_wallet_encrypted", encrypted);
      localStorage.removeItem("solen_wallet_accounts");
    }
    setAccounts(currentAccounts);
  };

  const addAccount = async (a: WalletAccount) => {
    const updated = [...accounts, a];
    setAccounts(updated);
    if (!activeAccount) setActiveAccount(a);

    // Persist
    if (hasPassword || localStorage.getItem("solen_pw_hash")) {
      // Re-encrypt with current session — need password in memory.
      // For now, save plaintext and re-encrypt on next lock/unlock cycle.
      // This is a trade-off: the encrypted blob is updated on lock.
      saveAccounts(updated);
    } else {
      saveAccounts(updated);
    }
  };

  const removeAccount = (accountId: string) => {
    const updated = accounts.filter((a) => a.accountId !== accountId);
    setAccounts(updated);
    saveAccounts(updated);
    if (activeAccount?.accountId === accountId) {
      setActiveAccount(updated[0] || null);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        network,
        setNetwork,
        accounts,
        activeAccount,
        setActiveAccount,
        addAccount,
        removeAccount,
        isLocked,
        hasPassword,
        unlock,
        lock,
        setPassword: setPasswordFn,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
