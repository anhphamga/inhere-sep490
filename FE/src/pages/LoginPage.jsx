import { Link } from "react-router-dom";

export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "#faf6ef",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#fff",
          border: "1px solid #ededed",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 16px 38px rgba(20,20,20,.08)",
        }}
      >
        <h1 style={{ margin: "0 0 8px", fontSize: "28px" }}>Dang nhap</h1>
        <p style={{ margin: "0 0 16px", color: "#6b6b6b" }}>
          Tinh nang dang nhap se duoc cap nhat tiep.
        </p>
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "40px",
            padding: "0 16px",
            borderRadius: "999px",
            border: "1px solid #b08d57",
            background: "#b08d57",
            color: "#fff",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Ve trang chu
        </Link>
      </section>
    </main>
  );
}
