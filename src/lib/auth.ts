import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createServiceClient } from './supabase';
import type { StaffUser } from './types';

export async function getAuthenticatedStaff(): Promise<{
  user: StaffUser;
  serviceClient: ReturnType<typeof createServiceClient>;
} | null> {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const serviceClient = createServiceClient();

  const { data: userData } = await serviceClient
    .from('users')
    .select('id, email, full_name, role')
    .eq('id', user.id)
    .single();

  if (!userData || (userData.role !== 'admin' && userData.role !== 'staff')) return null;

  return { user: userData as StaffUser, serviceClient };
}
