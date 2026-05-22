import { supabase } from "../../../config/supabase.js";

export class PresetRepository {
  async criar(pivo_id: string, criado_por: string, nome: string, comando: any) {
    return await supabase
      .from("presets_pivo")
      .insert([{ pivo_id, criado_por, nome, comando }])
      .select()
      .single();
  }

  async listarPorPivo(pivo_id: string) {
    return await supabase
      .from("presets_pivo")
      .select("*")
      .eq("pivo_id", pivo_id)
      .order("created_at", { ascending: false });
  }

  async deletar(id: string) {
    return await supabase.from("presets_pivo").delete().eq("id", id);
  }
}