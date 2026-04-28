import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { supabase } from './lib/supabase.js';
import { ComandoCronogramaSchema } from './schemas/comando.schema.js';
const app = express();
// Por enquanto, deixando aberto para qualquer origem para facilitar os testes
app.use(cors());
// NOTA: Adiciona headers de segurança
app.use(helmet());
// TESTE DE CONEXÃO
const testarConexao = async () => {
    const { data, error } = await supabase.from('pivos').select('count').limit(1);
    if (error) {
        console.error('[CONNECT] Erro crítico de conexão com Supabase:', error.message);
    }
    else {
        console.log('[CONNECT] Conexão com Supabase estabelecida com sucesso');
    }
};
testarConexao();
// ESSA LINHA É OBRIGATÓRIA para o Postman e o App funcionarem:
app.use(express.json());
app.post('/comando/agendar', async (req, res) => {
    try {
        const dados = ComandoCronogramaSchema.parse(req.body);
        // INSERÇÃO DE CRONOGRAMA
        const { data: cronograma, error: errCron } = await supabase
            .from('cronograma')
            .insert([{
                pivo_id: dados.pivoId,
                criado_por: dados.criadoPor,
                comando: dados.comando,
                horario: dados.horario,
                status_final: 'aguardando'
            }])
            .select()
            .single();
        if (errCron)
            throw errCron;
        // INSERÇÃO DE EVENT_LOGS
        const { error: errLog } = await supabase
            .from('event_logs')
            .insert([{
                cronograma_id: cronograma.id,
                pivo_id: dados.pivoId,
                operador_id: dados.criadoPor,
                tipo_evento: 'comando',
                codigo: 'CMD_RECEBIDO'
            }]);
        if (errLog)
            throw errLog;
        res.status(201).json({ message: "Sucesso!", id: cronograma.id });
    }
    catch (error) {
        console.error("[ERROR]", error);
        res.status(400).json({
            error: "Falha na operação",
            detalhes: error.issues || error.message
        });
    }
});
app.listen(3000, () => console.log("Backend Pluvia Ativo na porta 3000"));
//# sourceMappingURL=server.js.map