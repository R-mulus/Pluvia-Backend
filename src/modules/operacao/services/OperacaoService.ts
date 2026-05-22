import { CronogramaRepository } from '../repositories/CronogramaRepository.js';
import { LogsRepository } from '../repositories/LogsRepository.js';
import { type CriarComandoDTO, type UpdateComandoDTO } from '../schemas/comando.schema.js';
import { AppError } from '../../../shared/errors/AppError.js';

export class OperacaoService {
  private statusBloqueados = ['executando', 'concluido', 'falha', 'cancelado', 'interrompido'];

  // Injeção de dependências acopladas do mesmo módulo
  constructor(
    private cronogramaRepository: CronogramaRepository,
    private logsRepository: LogsRepository
  ) {}

  // --- REGRAS DO CRONOGRAMA ---

  async listar() {
    const { data, error } = await this.cronogramaRepository.list();
    if (error) throw new AppError(error.message);
    return data;
  }

  async agendar(dados: CriarComandoDTO) {
    const { data, error } = await this.cronogramaRepository.create({
      ...dados,
      status_final: 'aguardando' as any
    });

    if (error) throw new AppError(error.message);

    // RN02: Registro Automático de Auditoria de Agendamento
    await this.logsRepository.createEventLog({
      cronograma_id: data.id,
      pivo_id: data.pivo_id,
      operador_id: data.criado_por,
      tipo_evento: 'AGENDAMENTO'
    });

    return data;
  }

  async atualizar(id: string, dados: UpdateComandoDTO) {
    const { data: cmd, error: errorBusca } = await this.cronogramaRepository.getById(id);
    if (errorBusca || !cmd) throw new AppError("Comando não encontrado", 404);

    if (cmd.status_final !== 'aguardando') {
      throw new AppError(`Edição proibida: Comando está com status '${cmd.status_final}'`, 400);
    }

    const { data, error } = await this.cronogramaRepository.update(id, dados);
    if (error) throw new AppError(error.message);

    // RN02: Registro Automático de Auditoria de Edição
    await this.logsRepository.createEventLog({
      cronograma_id: data.id,
      pivo_id: data.pivo_id,
      operador_id: data.criado_por,
      tipo_evento: 'EDICAO'
    });

    return data;
  }

  async deletar(id: string) {
    const { data: cmd, error: errorBusca } = await this.cronogramaRepository.getById(id);
    if (errorBusca || !cmd) throw new AppError("Comando não encontrado", 404);

    if (this.statusBloqueados.includes(cmd.status_final)) {
      throw new AppError(`Exclusão proibida: Comandos em estado '${cmd.status_final}' não podem ser removidos.`, 400);
    }

    const { error } = await this.cronogramaRepository.delete(id);
    if (error) throw new AppError(error.message);

    // RN02: Registro Automático de Auditoria de Exclusão
    await this.logsRepository.createEventLog({
      pivo_id: cmd.pivo_id,
      operador_id: cmd.criado_por,
      tipo_evento: 'EXCLUSAO'
    });
  }

  // --- REGRAS DE LOGS (Novos Métodos Incorporados) ---

  async listarLogsEventos(pivoId: string, limit: number) {
    const { data, error } = await this.logsRepository.listEventLogs(pivoId, limit);
    if (error) throw new AppError(error.message);
    return data;
  }

  async listarLogsConexao(pivoId: string, limit: number) {
    const { data, error } = await this.logsRepository.listConectLogs(pivoId, limit);
    if (error) throw new AppError(error.message);
    return data;
  }
}