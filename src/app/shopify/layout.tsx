'use client';

export default function ShopifyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shopify-admin">
      <style jsx global>{`
        .shopify-admin {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .shopify-admin h1 {
          font-size: 24px;
          margin-bottom: 20px;
        }
        .shopify-admin h2 {
          font-size: 18px;
          margin-bottom: 15px;
        }
        .shopify-admin button {
          padding: 10px 20px;
          background: #008060;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        .shopify-admin button:hover {
          background: #006e50;
        }
        .shopify-admin input,
        .shopify-admin select {
          padding: 8px;
          border: 1px solid #d2d2d2;
          border-radius: 4px;
          font-size: 14px;
          width: 100%;
          max-width: 300px;
          margin-bottom: 10px;
        }
        .shopify-admin label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }
        .shopify-admin .card {
          background: white;
          border: 1px solid #e1e3e5;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .shopify-admin table {
          width: 100%;
          border-collapse: collapse;
        }
        .shopify-admin th,
        .shopify-admin td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e1e3e5;
        }
        .shopify-admin th {
          background: #f6f6f7;
          font-weight: 600;
        }
      `}</style>
      {children}
    </div>
  );
}
