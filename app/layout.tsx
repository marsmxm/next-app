import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "会面预约系统",
  description: "一对一会面时间协调系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 text-center">
              会面预约系统
            </h1>
            <p className="text-gray-600 text-center mt-2">
              15分钟一对一会面
            </p>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
