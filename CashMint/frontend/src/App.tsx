import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "./components/Navbar.js";
import { Dashboard } from "./pages/Dashboard.js";
import { Mint } from "./pages/Mint.js";
import { Tokens } from "./pages/Tokens.js";
import { TokenDetail } from "./pages/TokenDetail.js";
import { WalletExplorer } from "./pages/WalletExplorer.js";
import "./styles/globals.css";
import "./styles/dark-theme.css";

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/mint" element={<Mint />} />
          <Route path="/tokens" element={<Tokens />} />
          <Route path="/tokens/:id" element={<TokenDetail />} />
          <Route path="/wallet" element={<WalletExplorer />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
