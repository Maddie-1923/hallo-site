import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Deleting an auth user needs the service-role key, which never reaches the
// browser, so this is the one server-only route. The libraries row goes with
// the user through the foreign key's on delete cascade.
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Not signed in", { status: 401 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return new NextResponse("Account deletion isn't configured on this server.", { status: 500 });

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return new NextResponse(error.message, { status: 500 });

  await supabase.auth.signOut();
  return new NextResponse(null, { status: 204 });
}
