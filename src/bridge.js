import ModbusRTU from "modbus-serial";
import { SerialPort } from "serialport";

const arduino = new SerialPort({ 
    path: 'COM5',
    baudRate: 9600 
});

const client = new ModbusRTU();

async function startBridge() {
    try {
        console.log("Conectando ao Simulador Delta (127.0.0.1:502)...");
        await client.connectTCP("127.0.0.1", { port: 10003 });
        client.setID(1);
        console.log("[MODBUS] Conectado ao Simulador!");

        setInterval(async () => {
            try {
                // Lê Y0.0 (Endereço Modbus 0)
                const res = await client.readCoils(0, 1);
                const statusY0 = res.data[0];

                if (statusY0) {
                    arduino.write('1'); 
                    console.log("Estado: [ LIGADO ]");
                } else {
                    arduino.write('0'); 
                    console.log("Estado: [ DESLIGADO ]");
                }
            } catch (err) {
                console.error("Erro na leitura:", err.message);
            }
        }, 200);

    } catch (e) {
        console.error("Erro de conexão:", e.message);
    }
}

startBridge();