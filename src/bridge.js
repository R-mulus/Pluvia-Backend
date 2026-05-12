import ModbusRTU from "modbus-serial";
import { SerialPort } from "serialport";

const arduino = new SerialPort({ 
    path: 'COM5', // Porta Arduino
    baudRate: 9600 
});

const client = new ModbusRTU();

async function startBridge() {
    try {
        console.log("[BRIDGE] BRIDGE TELEMETRIA INICIADO");
        await client.connectTCP("127.0.0.1", { port: 10003 });
        client.setID(1);

        setInterval(async () => {
            try {
                const resCoils = await client.readCoils(0, 3);
                
                const resRegs = await client.readHoldingRegisters(200, 1);

                const running = resCoils.data[0] ? 1 : 0;
                const water = resCoils.data[1] ? 1 : 0;
                const dir = resCoils.data[2] ? 1 : 0;
                const angulo = resRegs.data[0];

                // Envia para o Arduino: <RUN,WATER,DIR,ANGLE>
                arduino.write(`<${running},${water},${dir},${angulo}>\n`);
                
                if (running) {
                    process.stdout.write(`\r📡 Ativo | Angulo Atual: ${angulo}°   `);
                }

            } catch (err) { }
        }, 500); 

    } catch (e) {
        console.error("Erro:", e.message);
    }
}

startBridge();