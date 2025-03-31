export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="w-full sm:px-5 sm:pt-5">{children}</div>;
}
