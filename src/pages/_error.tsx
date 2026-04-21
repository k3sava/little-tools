function Error({ statusCode }: { statusCode?: number }) {
  return (
    <div style={{ textAlign: "center", padding: "100px 20px" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>
        {statusCode || "Error"}
      </h1>
      <p style={{ color: "#6b7280", marginTop: "8px" }}>
        {statusCode === 404
          ? "Page not found"
          : "An error occurred"}
      </p>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: { res?: { statusCode: number }; err?: { statusCode: number } }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
