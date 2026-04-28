import { supabase } from './lib/supabase.js';
// Função que será executada a cada ciclo
async function verificarCronograma() {
    const agora = new Date().toISOString();
    console.log(`[Worker] Verificando comandos agendados em: ${agora}`);
    try {
        // 1. Busca comandos com status 'aguardando' onde o horário já passou (ou é agora)
        const { data: comandosPendentes, error } = await supabase
            .from('cronograma')
            .select('*')
            .eq('status_final', 'aguardando')
            .lte('horario', agora); // lte = "Less Than or Equal" (Menor ou igual a agora)
        if (error)
            throw error;
        if (!comandosPendentes || comandosPendentes.length === 0) {
            return; // Nada para processar
        }
        console.log(`[Worker] Encontrados ${comandosPendentes.length} comandos para executar.`);
        // 2. Processa cada comando encontrado
        for (const comando of comandosPendentes) {
            // MUDANÇA DE ESTADO: 'aguardando' -> 'executando'
            const { error: updateError } = await supabase
                .from('cronograma')
                .update({ status_final: 'executando' })
                .eq('id', comando.id);
            if (updateError) {
                console.error(`[Worker] Erro ao atualizar status do comando ${comando.id}:`, updateError.message);
                continue;
            }
            // 3. REGISTRO DE LOG: Log de início de execução
            await supabase.from('event_logs').insert([{
                    cronograma_id: comando.id,
                    pivo_id: comando.pivo_id,
                    tipo_evento: 'comando',
                    codigo: 'EXEC_INICIADA'
                }]);
            console.log(`[Worker] Comando ${comando.id} movido para 'executando'.`);
            // OBS: Aqui futuramente entrará a chamada para o Modbus (CLP Delta)
            // executarComandoModbus(comando);
        }
    }
    catch (error) {
        console.error('[Worker] Erro no ciclo de monitoramento:', error.message);
    }
}
// 4. Configura o intervalo (ex: a cada 10 segundos)
const INTERVALO = 10000; // 10 segundos
setInterval(verificarCronograma, INTERVALO);
console.log('🚀 Worker de Monitoramento Pluvia iniciado!');
//# sourceMappingURL=worker.js.map