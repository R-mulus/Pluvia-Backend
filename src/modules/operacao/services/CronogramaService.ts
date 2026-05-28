import { CronogramaRepository } from "../repositories/CronogramaRepository.js";
import { LogsService } from "../../telemetria/services/LogsService.js";
import { AppError } from "../../../shared/errors/AppError.js";
import type { CriarCronogramaDTO } from "../schemas/cronograma.schema.js";

export class CronogramaService {
  constructor(
    private cronogramaRepository: CronogramaRepository,
    private logsService: LogsService, 
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

      await this.logsService.registrarEvento({
        pivo_id: dados.pivo_id,
        operador_id: dados.criado_por,
        tipo_evento: "agendamento", // Minúsculo
        cronograma_id: novoAgendamento.id,
        codigo: `CRONOGRAMA_CRIADO`,
      });

      return novoAgendamento;
    } catch (error: any) {
      throw new AppError(error.message);
    }
  }

  async deletar(id: string, operador_id: string) {
    try {
      const cronograma = await this.cronogramaRepository.buscarPorId(id);
      
      await this.cronogramaRepository.deletar(id);

      await this.logsService.registrarEvento({
        pivo_id: cronograma.pivo_id,
        operador_id: operador_id,
        tipo_evento: "exclusao", // Minúsculo
        codigo: `CRONOGRAMA_EXCLUIDO:${cronograma.nome}`,
      });
    } catch (error: any) {
      throw new AppError(error.message);
    }
  }

  async ativar(id: string, pivo_id: string, operador_id: string) {
    try {
      const ativado = await this.cronogramaRepository.ativar(id, pivo_id);

      await this.logsService.registrarEvento({
        pivo_id: pivo_id,
        operador_id: operador_id,
        tipo_evento: "edicao", // Minúsculo
        cronograma_id: id,
        codigo: `CRONOGRAMA_ATIVADO`,
      });

      return ativado;
    } catch (error: any) {
      throw new AppError(error.message);
    }
  }

  async controlar(id: string, acao: "iniciar" | "pausar" | "continuar", operador_id: string) {
    try {
      let novoStatus = "aguardando";
      let statusPasso = "aguardando";
      let forcarHorarioAgora = false; 

      if (acao === "iniciar" || acao === "continuar") {
        novoStatus = "executando";
        statusPasso = "executando";
        forcarHorarioAgora = true; 
      } else if (acao === "pausar") {
        novoStatus = "interrompido";
        statusPasso = "interrompido";
      }

      const cronograma = await this.cronogramaRepository.buscarPorId(id);
      const atualizado = await this.cronogramaRepository.controlar(id, novoStatus);
      
      await this.cronogramaRepository.atualizarStatusPrimeiroPasso(id, statusPasso, forcarHorarioAgora);

      await this.logsService.registrarEvento({
        pivo_id: cronograma.pivo_id,
        operador_id: operador_id,
        tipo_evento: acao === 'pausar' ? 'edicao' : 'acionamento_manual', // Minúsculo
        cronograma_id: id,
        codigo: `COMANDO_${acao.toUpperCase()}`,
      });

      return atualizado;
    } catch (error: any) {
      throw new AppError(error.message);
    }
  }
}