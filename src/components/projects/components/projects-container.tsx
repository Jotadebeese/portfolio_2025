export default function ProjectsContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid w-full grid-cols-1 gap-4 py-10 md:grid-cols-2">
      {children}
    </div>
  );
}
