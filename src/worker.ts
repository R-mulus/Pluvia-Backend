import { supabase } from './lib/supabase.js';

const CONFIG = {
  INTERVALO_CHECK: 10000,      // 10 segundos
  DURACAO_SIMULADA_MS: 300000, // 5 minutos (300.000ms)
};

async function verificarCronograma() {
  const agora = new Date().toISOString();
  console.log(`[Worker] Ciclo iniciado: ${agora}`);

  try {
    // FINALIZAR COMANDOS EM EXECUÇÃO 
    // Simula o CLP retornando que o processo acabou após X minutos
    const { data: emExecucao } = await supabase
      .from('cronograma')
      .select('*')
      .eq('status_final', 'executando');

    if (emExecucao) {
      for (const comando of emExecucao) {
        const inicio = new Date(comando.updated_at || comando.horario).getTime();
        const tempoPassado = Date.now() - inicio;

        // Regra de 5 minutos (Simulando resposta do CLP)
        if (tempoPassado >= CONFIG.DURACAO_SIMULADA_MS) {
          await finalizarComando(comando);
        }
      }
    }

    // INICIAR NOVOS COMANDOS
    const { data: comandosPendentes } = await supabase
      .from('cronograma')
      .select('*')
      .eq('status_final', 'aguardando')
      .lte('horario', agora)
      .order('horario', { ascending: true });

    if (!comandosPendentes || comandosPendentes.length === 0) return;

    for (const comando of comandosPendentes) {
      // REGRA CRÍTICA: Verifica se o pivô já tem algo rodando
      const { data: pivoOcupado } = await supabase
        .from('cronograma')
        .select('id')
        .eq('pivo_id', comando.pivo_id)
        .eq('status_final', 'executando')
        .maybeSingle();

      if (pivoOcupado) {
        console.log(`[Worker] Pivô ${comando.pivo_id} ocupado. Comando ${comando.id} aguardando vez.`);
        continue; // Pula para o próximo comando da lista
      }

      await iniciarExecucao(comando);
    }

  } catch (error: any) {
    console.error('[Worker] Erro no ciclo:', error.message);
  }
}

async function iniciarExecucao(comando: any) {
  console.log(`[Worker] Tentando iniciar comando ${comando.id}...`);
  
  try {
    // 1. Tenta atualizar o status
    const { error: updateError } = await supabase
      .from('cronograma')
      .update({ 
        status_final: 'executando', 
        updated_at: new Date().toISOString() 
      })
      .eq('id', comando.id);

    if (updateError) {
      console.error(`[Erro Update] Comando ${comando.id}:`, updateError.message);
      return; // Interrompe para não gerar log de um início que falhou
    }

    // 2. Tenta inserir o log de evento
    const { error: logError } = await supabase
      .from('event_logs')
      .insert([{
        cronograma_id: comando.id,
        pivo_id: comando.pivo_id,
        tipo_evento: 'comando',
        codigo: 'EXEC_INICIADA'
      }]);

    if (logError) {
      console.error(`[Erro Log] Falha ao registrar log para ${comando.id}:`, logError.message);
      // NOTA: Adicionar uma reversão para o status 'aguardando' caso haja falha de log
    }

    console.log(`[Worker] Comando ${comando.id} atualizado com sucesso para 'EXECUTANDO'.`);

  } catch (err: any) {
    console.error(`[Worker] Erro crítico na função iniciarExecucao:`, err.message);
  }
}

async function finalizarComando(comando: any) {
  console.log(`[Worker] Finalizando comando ${comando.id} (Tempo esgotado/CLP Concluído)`);

  await supabase
    .from('cronograma')
    .update({ status_final: 'concluido', updated_at: new Date().toISOString() })
    .eq('id', comando.id);

  await supabase.from('event_logs').insert([{
    cronograma_id: comando.id,
    pivo_id: comando.pivo_id,
    tipo_evento: 'comando',
    codigo: 'EXEC_FINALIZADA'
  }]);
}

// Início do Loop
setInterval(verificarCronograma, CONFIG.INTERVALO_CHECK);
console.log('[Worker] Worker Pluvia ativo com regras de ocupação e tempo de execução.');