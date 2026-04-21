"use client";

export function Footer() {
  return (
    <footer
      className="kami-footer text-center"
      style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: ".8rem",
        padding: "3rem 0 2rem",
      }}
    >
      Built by Claude &{" "}
      <a href="https://iamkesava.com">Kesava</a>
    </footer>
  );
}
