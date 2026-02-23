import { Link, NavLink } from "react-router-dom";

export function Navbar() {
  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    color: isActive ? "var(--accent)" : "var(--text-secondary)",
    fontWeight: isActive ? 600 : 400,
  });

  return (
    <nav
      style={{
        background: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border-color)",
        padding: "0 2rem",
        display: "flex",
        alignItems: "center",
        height: "60px",
        gap: "2rem",
      }}
    >
      <Link to="/" style={{ fontWeight: 700, fontSize: "1.25rem", color: "var(--accent)" }}>
        💰 CashMint
      </Link>
      <NavLink to="/" end style={linkStyle}>Dashboard</NavLink>
      <NavLink to="/mint" style={linkStyle}>Mint</NavLink>
      <NavLink to="/tokens" style={linkStyle}>Tokens</NavLink>
      <NavLink to="/wallet" style={linkStyle}>Wallet</NavLink>
    </nav>
  );
}
