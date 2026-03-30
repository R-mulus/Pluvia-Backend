import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Carrega as variáveis de ambiente (senhas, IPs) de um futuro arquivo .env
dotenv.config();

// Inicializa o motor do servidor
const app = express();

// O CORS é o "segurança da porta". Ele permite que o seu aplicativo
// React Native consiga conversar com este servidor sem ser bloqueado.
app.use(cors());

// Ensina o servidor a entender dados no formato JSON (que o app vai enviar)
app.use(express.json());

// ==========================================
// ROTA DE TESTE (Para ver se está vivo)
// ==========================================
app.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    mensagem: 'Servidor Pluvia operando normalmente!',
    data_hora: new Date().toISOString()
  });
});

// ==========================================
// LIGANDO O SERVIDOR
// ==========================================
// Define a porta (usa a do sistema ou a 3000 como padrão)
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend rodando na porta ${PORT}`);
  console.log(`Acesse: http://localhost:${PORT}`);
});