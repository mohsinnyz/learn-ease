export default function AuthLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <section className="min-h-screen flex flex-col justify-center items-center bg-gray-100 dark:bg-gray-900">
        {/*   */}
        {children}
      </section>
    );
  }