import { supabase } from './config/supabase.js';

const CHECK_INTERVAL = 15000; // 15 segundos

async function runWorker() {
  console.log(`[WORKER] Verificação iniciada às ${new Date().toLocaleTimeString()}`);
  
  try {
    const { data: comandos, error } = await supabase
      .from('cronograma')
      .select('id, status_final')
      .eq('status_final', 'aguardando');

    if (error) throw error;

    if (comandos && comandos.length > 0) {
      console.log(`[WORKER] ${comandos.length} comandos pendentes detetados.`);
      // Lógica de execução seria vai ser implementada aqui
    }
  } catch (err) {
    console.error('[WORKER ERRO]:', err);
  }
}

// Loop de execução
setInterval(runWorker, CHECK_INTERVAL);
console.log('[STATUS] Worker Pluvia ativo e a monitorizar o banco de dados.');