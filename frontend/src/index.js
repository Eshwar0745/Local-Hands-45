import React from "react";
import { ThemeProvider } from 'next-themes';
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AppWithSocket } from "./App";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <BrowserRouter>
        <AuthProvider>
          <AppWithSocket />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
