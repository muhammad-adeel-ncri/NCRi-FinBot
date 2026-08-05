import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardNav from '@/components/DashboardNav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  return (
    <div className="app-shell">
      <DashboardNav userEmail={session.user.email} />
      <main className="app-main">{children}</main>
    </div>
  );
}
