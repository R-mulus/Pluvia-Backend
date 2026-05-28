import { supabase } from "../../../config/supabase.js";

export class TelemetriaRepository {
  async getDashboard() {
    return await supabase
      .from("vw_dashboard_pivos")
      .select("*")
      .order("nome_pivo", { ascending: true });
  }
}
