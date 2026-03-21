import { LoaderFunctionArgs, json } from "@remix-run/node";
import { createClient } from "@supabase/supabase-js";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const adminSupabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await adminSupabase
      .from("orders")
      .select(`
        *,
        order_items (
          id,
          menu_id,
          quantity,
          unit_price,
          total_price,
          notes,
          menu:menus (id, name, price)
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("❌ api.get-orders error:", error);
      return json({ success: false, error: error.message }, { status: 500 });
    }

    return json({ success: true, data: data || [] });
  } catch (err: any) {
    console.error("❌ api.get-orders exception:", err);
    return json({ success: false, error: err.message }, { status: 500 });
  }
}
