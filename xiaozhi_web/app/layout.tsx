// app/layout.tsx
export const metadata = {
  title: '服务器测试页面',
  description: 'Next.js 版本',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
