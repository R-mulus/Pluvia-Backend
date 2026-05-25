import { CronogramaRepository } from '../repositories/CronogramaRepository.js';
import { LogsRepository } from '../repositories/LogsRepository.js';
import { AppError } from '../../../shared/errors/AppError.js';
import type { CriarCronogramaDTO } from '../schemas/cronograma.schema.js';

export class CronogramaService {
  constructor(
    private cronogramaRepository: CronogramaRepository,
    private logsRepository: LogsRepository
  ) {}

  async listarPorPivo(pivoId: string) {
    try {
      return await this.cronogramaRepository.listarPorPivo(pivoId);
    } catch (error: any) {
      throw new AppError(error.message);
    }
  }

  async agendar(dados: CriarCronogramaDTO) {
    try {
      const novoAgendamento = await this.cronogramaRepository.criarComPassos(dados);

      // Auditoria
      await this.logsRepository.createEventLog({
        // Removemos o cronograma_id que não existe mais na tipagem
        pivo_id: dados.pivo_id,
        operador_id: dados.criado_por,
        tipo_evento: 'AGENDAMENTO',
        // Injetamos o ID do agrupador no campo 'codigo' para rastreabilidade textual
        codigo: `CRONOGRAMA_CRIADO:${novoAgendamento.id}`
      });

      return novoAgendamento;
    } catch (error: any) {
      throw new AppError(error.message);
    }
  }

  async deletar(id: string) {
    try {
      // Como a tabela log_events tem cronograma_id, deletar aqui pode engatilhar CASCADE 
      // ou ser bloqueado. O ideal é que o ON DELETE CASCADE cuide disso no banco.
      await this.cronogramaRepository.deletar(id);
    } catch (error: any) {
      throw new AppError(error.message);
    }
  }

  async ativar(id: string, pivo_id: string) {
    try {
      const ativado = await this.cronogramaRepository.ativar(id, pivo_id);
      
      // Opcional: Registrar no log que o cronograma foi ativado
      await this.logsRepository.createEventLog({
        pivo_id: pivo_id,
        operador_id: ativado.criado_por,
        tipo_evento: 'EDICAO',
        codigo: `CRONOGRAMA_ATIVADO:${id}`
      });

      return ativado;
    } catch (error: any) {
      throw new AppError(error.message);
    }
  }

  // Adicione dentro da classe CronogramaService
  async controlar(id: string, acao: 'iniciar' | 'pausar' | 'continuar') {
    try {
      let novoStatus = 'aguardando';
      
      if (acao === 'iniciar' || acao === 'continuar') {
        novoStatus = 'executando';
      } else if (acao === 'pausar') {
        novoStatus = 'interrompido';
      }

      return await this.cronogramaRepository.controlar(id, novoStatus);
    } catch (error: any) {
      throw new AppError(error.message);
    }
  }
}