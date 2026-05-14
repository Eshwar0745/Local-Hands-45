import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import API from "../services/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // {id, name, email, role, verified}
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Restore session on mount
  useEffect(() => {
    const cachedToken = localStorage.getItem("lh_token");
    const cachedUser = localStorage.getItem("lh_user");

    if (cachedToken) {
      setToken(cachedToken);

      API.get("/auth/me", {
        headers: { Authorization: `Bearer ${cachedToken}` },
      })
        .then((res) => {
          const u = res.data.user;
          setUser(u);
          localStorage.setItem("lh_user", JSON.stringify(u));
        })
        .catch((err) => {
          console.warn("Session validation failed:", err.message);
          if (cachedUser) {
            try {
              setUser(JSON.parse(cachedUser));
            } catch {
              clearSession();
            }
          } else {
            clearSession();
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // 🔹 Save session (token + user)
  const saveSession = (t, u) => {
    if (t) {
      setToken(t);
      localStorage.setItem("lh_token", t);
    }
    if (u) {
      setUser(u); // ✅ ensures instant re-render
      localStorage.setItem("lh_user", JSON.stringify(u));
    }
  };

  // 🔹 Clear session completely
  const clearSession = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("lh_token");
    localStorage.removeItem("lh_user");
  };

  // 🔹 Auth methods
  const register = async (payload) => {
    const { data } = await API.post("/auth/register", payload);
    saveSession(data.token, data.user);
    return data.user;
  };

  const login = async (payload) => {
    const { data } = await API.post("/auth/login", payload);
    saveSession(data.token, data.user);
    return data.user;
  };

  const loginWithGoogleIdToken = async (idToken) => {
    const { data } = await API.post("/auth/google", { idToken });
    saveSession(data.token, data.user);
    return data.user;
  };

  const setRole = async (role) => {
    const { data } = await API.post(
      "/auth/set-role",
      { role },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    saveSession(data.token || token, data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      if (user?.role === "provider" && user?.isAvailable) {
        await setAvailability(false);
      }
    } catch (e) {
      // Best-effort: still clear session on failure.
      console.warn("Failed to set provider offline during logout:", e?.message || e);
    } finally {
      clearSession();
    }
  };

  // 🔹 WhatsApp login handler
  const loginWithWhatsApp = (responseData) => {
    // Response structure: { token, user, needsRoleSelection }
    saveSession(responseData.token, responseData.user);
    return responseData;
  };

  // 🔹 Provider availability toggle
  const setAvailability = async (isAvailable, location = null) => {
    const payload = { isAvailable };
    
    // ✅ If toggling ON and location provided, include it
    if (isAvailable && location) {
      payload.lng = location.lng;
      payload.lat = location.lat;
    }
    
    const { data } = await API.patch("/providers/availability", payload);
    const merged = { ...user, ...data.user };
    saveSession(token, merged);
    return merged;
  };

  // 🔹 Redirect helper
  const redirectAfterAuth = (u, nav) => {
    if (!u?.role) nav("/choose-role", { replace: true });
    else nav(`/${u.role}`, { replace: true });
  };

  // 🔹 Context value
  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      register,
      login,
      loginWithGoogleIdToken,
      loginWithWhatsApp,
      setRole,
      logout,
      setAvailability,
      redirectAfterAuth,
      isAuthenticated: !!token,
      isAdmin: user?.role === "admin",
      saveSession,
    }),
    [user, token, loading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
