import { supabase } from "../../../config/supabase.js";
import type { CriarPresetDTO } from "../schemas/preset.schema.js";

export class PresetRepository {
  async criar(dados: CriarPresetDTO) {
    const { data, error } = await supabase
      .from("presets")
      .insert([dados])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async listarPorPivo(pivo_id: string) {
    const { data, error } = await supabase
      .from("presets")
      .select(`*, usuarios!presets_criado_por_fkey (nome)`)
      .eq("pivo_id", pivo_id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return data.map((item) => {
      const usuario = Array.isArray(item.usuarios)
        ? item.usuarios[0]
        : item.usuarios;
      return { ...item, nome_criador: usuario?.nome || "Desconhecido" };
    });
  }

  async deletar(id: string) {
    const { error } = await supabase.from("presets").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  }
}
