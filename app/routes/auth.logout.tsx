import { redirect, type ActionFunctionArgs } from "@remix-run/node";
import { supabase } from "~/lib/supabase";

export async function action({ request }: ActionFunctionArgs) {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Logout error:', error);
  }
  
  return redirect('/');
} 