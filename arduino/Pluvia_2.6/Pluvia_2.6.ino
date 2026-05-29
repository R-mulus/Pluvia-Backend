#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Servo.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

Servo pivoServo;


// LOGO PLUVIA (BITMAP 100x32)
const unsigned char image_logo_branca_bits[] PROGMEM = {
  0x07, 0xFF, 0xF0, 0x60, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x1F, 0xFF, 0xF8, 0xE0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x3F, 0xFF, 0xF8, 0xE0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x7C, 0x01, 0xF8, 0xE0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x70, 0x03, 0xF8, 0xE0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0xF0, 0x07, 0xB8, 0xE0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0xE0, 0x0F, 0x38, 0xE0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0xE0, 0x1E, 0x38, 0xE0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0xE0, 0x3C, 0x38, 0xE0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0xE0, 0x78, 0x38, 0xE0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0C, 0x00, 0x00, 0x00,
  0xE0, 0xF0, 0x38, 0xE0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0C, 0x00, 0x00, 0x00,
  0xE1, 0xE0, 0x38, 0xE0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1E, 0x00, 0x00, 0x00,
  0xE3, 0xC0, 0x78, 0xE0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1E, 0x00, 0x00, 0x00,
  0xE7, 0x80, 0x70, 0xE0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00,
  0xEF, 0x00, 0x70, 0xE0, 0x20, 0x01, 0x01, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00,
  0xFE, 0x00, 0xF0, 0xE0, 0x60, 0x03, 0x83, 0x80, 0x1C, 0x0C, 0x01, 0xFF, 0x80,
  0xFC, 0x01, 0xE0, 0xE0, 0x70, 0x03, 0x83, 0x80, 0x1C, 0x0E, 0x03, 0xFF, 0xE0,
  0xFF, 0xFF, 0xC0, 0xE0, 0x70, 0x03, 0x83, 0x80, 0x1C, 0x0E, 0x07, 0xFF, 0xE0,
  0xFF, 0xFF, 0x80, 0xE0, 0x70, 0x03, 0x83, 0x80, 0x1C, 0x0E, 0x0F, 0x00, 0xF0,
  0xFF, 0xFE, 0x00, 0xE0, 0x70, 0x03, 0x83, 0x80, 0x1C, 0x0E, 0x0E, 0x00, 0x70,
  0xE0, 0x00, 0x00, 0xE0, 0x70, 0x03, 0x83, 0x80, 0x1C, 0x0E, 0x0E, 0x00, 0x70,
  0xE0, 0x00, 0x00, 0xE0, 0x70, 0x03, 0x83, 0x80, 0x1C, 0x0E, 0x0E, 0x00, 0x70,
  0xE0, 0x00, 0x00, 0xE0, 0x70, 0x03, 0x83, 0x80, 0x1C, 0x0E, 0x0E, 0x00, 0x70,
  0xE0, 0x00, 0x00, 0xE0, 0x70, 0x03, 0x83, 0xC0, 0x3C, 0x0E, 0x0F, 0xFF, 0xF0,
  0xE0, 0x00, 0x00, 0xE0, 0x70, 0x03, 0x81, 0xE0, 0x3C, 0x0E, 0x0F, 0xFF, 0xF0,
  0xE0, 0x00, 0x00, 0xE0, 0x70, 0x03, 0x80, 0xF0, 0x78, 0x0E, 0x0F, 0xFF, 0xF0,
  0xE0, 0x00, 0x00, 0xE0, 0x70, 0x03, 0x80, 0x78, 0xF0, 0x0E, 0x0E, 0x00, 0x70,
  0xE0, 0x00, 0x00, 0xE0, 0x70, 0x07, 0x80, 0x3D, 0xE0, 0x0E, 0x0E, 0x00, 0x70,
  0xE0, 0x00, 0x00, 0xE0, 0x78, 0x0F, 0x00, 0x1F, 0xC0, 0x0E, 0x0E, 0x00, 0x70,
  0xE0, 0x00, 0x00, 0xE0, 0x3F, 0xFF, 0x00, 0x1F, 0x80, 0x0E, 0x0E, 0x00, 0x70,
  0xE0, 0x00, 0x00, 0xE0, 0x1F, 0xFE, 0x00, 0x0F, 0x00, 0x0E, 0x0E, 0x00, 0x70,
  0xC0, 0x00, 0x00, 0x60, 0x0F, 0xF8, 0x00, 0x06, 0x00, 0x0C, 0x0E, 0x00, 0x30
};


// MAPEAMENTO DE PINOS
const int PIN_SERVO   = 9;

// LEDs de Estado
const int LED_AGUA    = 10; // Azul: Irrigação ativa
const int LED_ROTACAO = 11; // Verde: Rotação ativa
const int LED_MOTOR   = 12; // Amarelo: Motor ativo

// LED RGB de Alertas (Pinos PWM: 3=R, 5=G, 6=B)
const int LED_RGB_R   = 3;
const int LED_RGB_G   = 5;
const int LED_RGB_B   = 6;


// VARIÁVEIS DE CONTROLE ESTÁTICAS
unsigned long tempoInicio = 0;
unsigned long duracaoAlvoMs = 0;
bool emMovimento = false;
bool isJogMode = false; 
bool oledAtivo = false; 
bool abortarComando = false;
bool coreografiaAtiva = false; 

// Flag anti-reentrância para quebrar laços antigos quando um novo comando chegar
volatile bool interromperLacos = false;

// Monitor de Conexão da Bridge (Heartbeat)
unsigned long ultimoHeartbeatBridge = 0;
bool bridgeConectado = false;

// Estado do Pivô
int anguloAtual = 0;
int anguloAlvo = 0;
int dirAtual = 0; // 0 = Horário (Aumenta), 1 = Reverso (Diminui)
int velAtual = 100;
bool usarAgua = false;

// Estado anterior de escuta para evitar spam no monitor serial
bool escutandoLogsExibido = false;

// Modos de Operação
#define MODO_STANDBY 0
#define MODO_ALIGN   1
#define MODO_INIT    2
int modoAtual = MODO_STANDBY;

// Buffer estático de leitura serial
char bufferSerial[64];
int bufferIndex = 0;


void lerSerial();
void processarComando(char* pacote);
void coreografiaAlinhamento();
void coreografiaIrrigacao();
void desligamentoSuave();
void iniciarMovimento();
void pararMotor();
void atualizarOLED(const char* statusMsg, int anguloExibido);
void apagarTodosLeds();
void setCorRGB(int r, int g, int b);
void piscarRGB(int r, int g, int b, int vezes);
bool esperaSegura(unsigned long ms);


// SETUP
void setup() {
  Serial.begin(115200);
  Wire.begin();
  
  pinMode(LED_AGUA, OUTPUT);
  pinMode(LED_ROTACAO, OUTPUT);
  pinMode(LED_MOTOR, OUTPUT);
  pinMode(LED_RGB_R, OUTPUT);
  pinMode(LED_RGB_G, OUTPUT);
  pinMode(LED_RGB_B, OUTPUT);
  
  apagarTodosLeds();
  coreografiaAtiva = false;
  interromperLacos = false;

  setCorRGB(255, 0, 255); 
  delay(300); 
  setCorRGB(0, 0, 0);

  Serial.println(F("[SYS] Inicializando controlador..."));

  if(display.begin(SSD1306_SWITCHCAPVCC, 0x3C, false, false)) {
    oledAtivo = true;
    
    // TELA DE INICIALIZAÇÃO (Logo do Pluvia)
    display.clearDisplay();
    display.drawBitmap(14, 16, image_logo_branca_bits, 100, 32, WHITE);
    display.display();
    
    delay(2500);
    
    atualizarOLED("Standby", anguloAtual);
    Serial.println(F("STANDBY"));
  } else {
    Serial.println(F("[ERRO] OLED indisponivel."));
    Serial.println(F("STANDBY"));
  }

  pivoServo.attach(PIN_SERVO);
  pararMotor();
}


// LOOP PRINCIPAL ----------------------------------------------------------
void loop() {
  lerSerial();

  bridgeConectado = (millis() - ultimoHeartbeatBridge < 6000);

  // Controle do RGB em Repouso
  if (!emMovimento && !coreografiaAtiva) {
    if (bridgeConectado) {
      setCorRGB(0, 0, 255); // Azul Constante (Ok / Conectado)
    } else {
      static unsigned long ultimoPiscaDesconectado = 0;
      static bool estadoPiscaDesconectado = false;
      if (millis() - ultimoPiscaDesconectado >= 500) {
        ultimoPiscaDesconectado = millis();
        estadoPiscaDesconectado = !estadoPiscaDesconectado;
        setCorRGB(estadoPiscaDesconectado ? 255 : 0, 0, 0); // Pisca Vermelho
      }
    }

    // Status de Escuta
    if (!escutandoLogsExibido) {
      Serial.println(F("[ARDUINO] Ocioso. Aguardando novos comandos..."));
      escutandoLogsExibido = true;
    }
  }

  // Controle do RGB em Movimento
  if (emMovimento) {
    static unsigned long ultimoPiscaMov = 0;
    static bool estadoPiscaMov = false;

    if (modoAtual == MODO_ALIGN) {
      if (millis() - ultimoPiscaMov >= 250) {
        ultimoPiscaMov = millis();
        estadoPiscaMov = !estadoPiscaMov;
        setCorRGB(0, estadoPiscaMov ? 255 : 0, 0); // Pisca Azul
      }
    } else if (modoAtual == MODO_INIT) {
      if (millis() - ultimoPiscaMov >= 250) {
        ultimoPiscaMov = millis();
        estadoPiscaMov = !estadoPiscaMov;
        setCorRGB(0, estadoPiscaMov ? 255 : 0, 0); // Pisca Verde
      }
    }

    // Fim do tempo do movimento
    if (millis() - tempoInicio >= duracaoAlvoMs) {
      pararMotor();
      emMovimento = false;
      digitalWrite(LED_ROTACAO, LOW);

      if (modoAtual == MODO_INIT && !abortarComando) {
        desligamentoSuave();
      } else {
        digitalWrite(LED_MOTOR, LOW);
        atualizarOLED("Standby", anguloAlvo);
        Serial.println(F("STANDBY"));
      }
      modoAtual = MODO_STANDBY;
    }
  }
}


// COMUNICAÇÃO SERIAL E PARSER
void lerSerial() {
  while (Serial.available() > 0) {
    char c = Serial.read();
    
    if (c == '<') {
      bufferIndex = 0;
    } 
    else if (c == '\n' || c == '\r' || c == '>') {
      if (bufferIndex > 0) {
        bufferSerial[bufferIndex] = '\0';
        
        char pacoteTemp[64];
        strncpy(pacoteTemp, bufferSerial, 63);
        pacoteTemp[63] = '\0';
        
        bufferIndex = 0; // Liberação imediata do buffer contra re-entradas
        char* pacote = pacoteTemp;

        while (*pacote == ' ' || *pacote == '\t') {
          pacote++;
        }

        int len = strlen(pacote);
        while (len > 0 && (pacote[len - 1] == ' ' || pacote[len - 1] == '\t' || pacote[len - 1] == '\r' || pacote[len - 1] == '\n' || pacote[len - 1] == '>')) {
          pacote[len - 1] = '\0';
          len--;
        }

        if (strlen(pacote) > 0) {
          if (strncmp(pacote, "HB", 2) != 0) {
            Serial.print(F("[REC] <"));
            Serial.print(pacote);
            Serial.println(F(">"));
          }
          processarComando(pacote);
        }
      }
    } 
    else {
      if (bufferIndex < 63) {
        bufferSerial[bufferIndex++] = c;
      }
    }
  }
}

void processarComando(char* pacote) {
  if (strncmp(pacote, "HB", 2) == 0) {
    int status = 0;
    if (sscanf(pacote, "HB,%d", &status) == 1) {
      if (status == 1) {
        ultimoHeartbeatBridge = millis();
      }
    }
    return;
  }

  // Se houver uma coreografia física ativa, ignora, exceto o comando absoluto FREE/STOP
  if (coreografiaAtiva && strcmp(pacote, "FREE") != 0) {
    Serial.println(F("[SYS] Ignorando - Coreografia em andamento."));
    return;
  }

  // SINALIZA INTERRUPÇÃO: Qualquer novo comando interrompe laços e esperas anteriores (como desligamentoSuave)
  interromperLacos = true;
  abortarComando = false;
  escutandoLogsExibido = false; 

  // FREE / STOP
  if (strncmp(pacote, "FREE", 4) == 0) {
    piscarRGB(0, 0, 255, 3); 

    if (pacote[4] == ',') {
      int vel = 0, tempo = 0, dir = 0;
      int parsed = sscanf(pacote, "FREE,%d,%d,%d", &vel, &tempo, &dir);
      
      if (parsed == 3) {
        velAtual = vel;
        duracaoAlvoMs = tempo;
        dirAtual = dir;

        isJogMode = true;
        modoAtual = MODO_ALIGN; 
        usarAgua = false;       

        digitalWrite(LED_MOTOR, HIGH);
        digitalWrite(LED_ROTACAO, HIGH);
        atualizarOLED("Manual Jog", anguloAlvo);
        
        iniciarMovimento();
      }
    } 
    else {
      abortarComando = true;
      coreografiaAtiva = false; 
      pararMotor();
      apagarTodosLeds();
      emMovimento = false;
      modoAtual = MODO_STANDBY;
      atualizarOLED("Livre", anguloAlvo);
      Serial.println(F("LIVRE"));
    }
    return;
  }

  // SET_POS
  if (strncmp(pacote, "SET_POS", 7) == 0) {
    piscarRGB(0, 0, 255, 3);
    int ang = 0;
    if (sscanf(pacote, "SET_POS,%d", &ang) == 1) {
      anguloAtual = ang;
      anguloAlvo = anguloAtual;
      atualizarOLED("Calibrado", anguloAtual);
      piscarRGB(0, 255, 0, 2);
      Serial.println(F("STANDBY"));
    }
    return;
  }

  // ALIGN
  if (strncmp(pacote, "ALIGN", 5) == 0) {
    piscarRGB(0, 0, 255, 3);
    int ang = 0, vel = 0, dir = 0;
    long tempo = 0;
    
    if (sscanf(pacote, "ALIGN,%d,%d,%d,%ld", &ang, &vel, &dir, &tempo) == 4) {
        anguloAlvo = ang;
        velAtual = vel;
        dirAtual = dir;
        duracaoAlvoMs = tempo;
        usarAgua = false;
        
        modoAtual = MODO_ALIGN;
        coreografiaAlinhamento();
    }
    return;
  }

  // AUTO / INIT
  if (strncmp(pacote, "AUTO", 4) == 0 || strncmp(pacote, "INIT", 4) == 0) {
    piscarRGB(0, 255, 0, 3);
    int ang = 0, vel = 0, dir = 0, agua = 1;
    long tempo = 0;
    
    int parsed = sscanf(pacote, "%*[^,],%d,%d,%d,%ld,%d", &ang, &vel, &dir, &tempo, &agua);
    
    if (parsed < 4) {
      parsed = sscanf(pacote, "%*[^,],%d,%d,%d,%ld", &ang, &vel, &dir, &tempo);
      agua = 1; 
    }

    if (parsed < 4) {
      Serial.println(F("[ERRO] Comando Serial malformado."));
      return;
    }

    anguloAlvo = ang;
    velAtual = vel;
    dirAtual = dir;
    duracaoAlvoMs = tempo;
    usarAgua = (agua > 0);

    isJogMode = false;
    modoAtual = MODO_INIT;
    
    coreografiaIrrigacao();
    return;
  }
}


// ETAPAS DOS PROCESSOS
void coreografiaAlinhamento() {
  interromperLacos = false;
  coreografiaAtiva = true; 
  Serial.println(F("[SYS] Alinhando pivo..."));
  
  apagarTodosLeds();
  atualizarOLED("Alinhando", anguloAlvo);

  digitalWrite(LED_MOTOR, HIGH);
  if(!esperaSegura(600)) { coreografiaAtiva = false; return; }

  digitalWrite(LED_ROTACAO, HIGH);
  if(!esperaSegura(600)) { coreografiaAtiva = false; return; }

  iniciarMovimento(); 
  coreografiaAtiva = false; 
}

void coreografiaIrrigacao() {
  interromperLacos = false;
  coreografiaAtiva = true; 
  Serial.println(F("[SYS] Executando irrigacao..."));
  
  apagarTodosLeds();
  atualizarOLED("Preparando", anguloAlvo);

  if (usarAgua) {
    digitalWrite(LED_AGUA, HIGH);
    if(!esperaSegura(600)) { coreografiaAtiva = false; return; }
  }

  digitalWrite(LED_MOTOR, HIGH);
  if(!esperaSegura(600)) { coreografiaAtiva = false; return; }

  digitalWrite(LED_ROTACAO, HIGH);
  if(!esperaSegura(600)) { coreografiaAtiva = false; return; }
  
  iniciarMovimento(); 
  coreografiaAtiva = false; 
}

void desligamentoSuave() {
  interromperLacos = false;
  coreografiaAtiva = true;
  atualizarOLED("Desligando", anguloAlvo);
  Serial.println(F("[SYS] Desligamento programado."));
  
  digitalWrite(LED_ROTACAO, LOW);
  if (!esperaSegura(1000)) { coreografiaAtiva = false; return; }
  
  digitalWrite(LED_AGUA, LOW);
  if (!esperaSegura(1000)) { coreografiaAtiva = false; return; }
  
  digitalWrite(LED_MOTOR, LOW);
  
  atualizarOLED("Standby", anguloAlvo);
  anguloAtual = anguloAlvo;
  coreografiaAtiva = false;
  Serial.println(F("STANDBY"));
}


// SERVO E AUXILIARES
void iniciarMovimento() {
  if (abortarComando) return;
  
  emMovimento = true;
  tempoInicio = millis();
  
  int pwmValue = 1500;
  if (dirAtual == 0) { 
    pwmValue = map(velAtual, 0, 100, 1500, 1000); // Horário
  } else {             
    pwmValue = map(velAtual, 0, 100, 1500, 2000); // Reverso
  }

  pivoServo.writeMicroseconds(pwmValue);
}

void pararMotor() {
  pivoServo.writeMicroseconds(1500);
}

// LAYOUT DO DISPLAY OLED
void atualizarOLED(const char* statusMsg, int anguloExibido) {
  if (!oledAtivo) return;
  display.clearDisplay();

  // Estado do Sistema
  display.setTextSize(1);
  display.setTextColor(WHITE);
  display.setCursor(0, 2);
  display.print(F("Estado: "));
  display.print(statusMsg);

  // Ângulo Atual
  display.setTextSize(3);
  display.setTextColor(WHITE);
  display.setCursor(8, 15); 
  display.print(anguloExibido);
  display.print((char)247); 

  // Telemetria
  display.setTextSize(1);
  display.setTextColor(WHITE);
  
  // Sentido da Rotação
  display.setCursor(4, 46);
  display.print(F("Dir:   "));
  if (dirAtual == 0) {
    display.print(F("Horario"));
  } else {
    display.print(F("Reverso"));
  }

  // Estado da Bomba
  display.setCursor(4, 55);
  display.print(F("Irrig: "));
  if (usarAgua) {
    display.print(F("Sim"));
  } else {
    display.print(F("Nao"));
  }

  display.display();
}

void apagarTodosLeds() {
  digitalWrite(LED_AGUA, LOW);
  digitalWrite(LED_ROTACAO, LOW);
  digitalWrite(LED_MOTOR, LOW);
  setCorRGB(0, 0, 0);
}

void setCorRGB(int r, int g, int b) {
  analogWrite(LED_RGB_R, r);
  analogWrite(LED_RGB_G, g);
  analogWrite(LED_RGB_B, b);
}

void piscarRGB(int r, int g, int b, int vezes) {
  interromperLacos = false;
  for(int i = 0; i < vezes; i++) {
    if(abortarComando) return;
    setCorRGB(r, g, b);
    if(!esperaSegura(200)) return;
    setCorRGB(0, 0, 0);
    if(!esperaSegura(200)) return;
  }
}

bool esperaSegura(unsigned long ms) {
  unsigned long inicio = millis();
  while (millis() - inicio < ms) {
    lerSerial(); 
    if (abortarComando || interromperLacos) { // Quebra a espera se houver novo comando serial ou emergência
      return false; 
    }
  }
  return true;
}