#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <ESP32Servo.h>
#include <EEPROM.h>
#include <WiFi.h>
#include <WebServer.h>

LiquidCrystal_I2C lcd(0x27, 16,2);
Servo servin;
Servo servin2;

#define sensorCD  35

const int UV_PIN = 33;
const int sensor = 34;
const int rele = 14;
const int trig = 25;
const int echo = 26;
const int Vseco = 3500;
const int Vmolhado = 1500;
const char* ssid = "IFCE_VISITANTE";
const char* password = "A3v08Lkf";

WebServer server(80);


int limiteU = 30;
int servoP = 18;
int servoP2 = 19;
int VR = 0;
int limiteLiga = 30;
int limiteDesliga = 40;

float alturaRecipiente = 11;
float distancia;

long tempo;

bool bombaLigada = false;
unsigned long tempoLigou = 0;

void setup()
{
  Serial.begin(115200);
  delay(100);
  EEPROM.begin(512);
  Wire.begin(21,22);
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0,0);
  lcd.print("iniciando...");
  WiFi.begin(ssid, password);

  Serial.print("Conectando");

  unsigned long tempoInicio = millis();

  while (WiFi.status() != WL_CONNECTED && millis() - tempoInicio < 10000) {
  delay(500);
  Serial.print(".");
}

if (WiFi.status() == WL_CONNECTED) {
  Serial.println("\nConectado!");
  Serial.println(WiFi.localIP());
} else {
  Serial.println("\nFalha no WiFi (modo offline)");
}

  pinMode(rele,OUTPUT);
  digitalWrite(rele,HIGH);
  
  
  Serial.println("sistema de irrigação iniciado");
  delay(100);

  if (WiFi.status() == WL_CONNECTED) {
  Serial.println("\nConectado!");
  Serial.println(WiFi.localIP());
} else {
  Serial.println("\nFalha no WiFi (modo offline)");
}

  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);
  servin.setPeriodHertz(50); 
  servin2.setPeriodHertz(50);

  
  pinMode(trig, OUTPUT);
  pinMode(echo, INPUT);
  pinMode(sensorCD, INPUT);
  pinMode(UV_PIN, INPUT);

  servin.attach(servoP);
  servin2.attach(servoP2);

  
  server.on("/dados", []() {
  int SC = digitalRead(sensorCD);
  int V = analogRead(UV_PIN);
  int leituraA = analogRead(sensor);

  int umidade = map(leituraA, Vseco, Vmolhado, 0, 100);
  umidade = constrain(umidade, 0, 100);

  float nivel = ((alturaRecipiente - distancia)/alturaRecipiente) * 100;
  nivel = constrain(nivel, 0, 100);

  int UVINDEX = 0;
  if (V < 40) UVINDEX = 0;
  else if (V < 184) UVINDEX = 1;
  else if (V < 260) UVINDEX = 2;
  else if (V < 332) UVINDEX = 3;
  else if (V < 412) UVINDEX = 4;
  else if (V < 496) UVINDEX = 5;
  else if (V < 568) UVINDEX = 6;
  else if (V < 648) UVINDEX = 7;
  else if (V < 720) UVINDEX = 8;
  else if (V < 800) UVINDEX = 9;
  else if (V < 894) UVINDEX = 10;
  else UVINDEX = 11;

  String json = "{";
  json += "\"umidade\":" + String(umidade) + ",";
  json += "\"agua\":" + String(nivel) + ",";
  json += "\"uv\":" + String(UVINDEX) + ",";
  json += "\"chuva\":\"" + String(SC == HIGH ? "Nao" : "Sim") + "\",";
  json += "\"bomba\":\"" + String(bombaLigada ? "Ligada" : "Desligada") + "\",";
  json += "\"reservatorio\":\"" + String(SC == HIGH ? "Fechado" : "Aberto") + "\",";
  json += "\"regas\":" + String(VR);
  json += "}";
  server.send(200, "application/json", json);
});

// Rota para a página HTML
server.on("/", []() {
  String html = R"rawliteral(
<!DOCTYPE html>
<html lang="pt-br">
<head>
<meta charset="UTF-8">
<title>SIA Dashboard</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<style>
body {
  margin:0;
  font-family:Arial;
  background:#eef2f7;
  display:flex;
}

/* SIDEBAR */
.sidebar {
  width:200px;
  background:linear-gradient(#00c6ff, #0072ff);
  padding:20px;
  color:white;
  height:100vh;
}

.sidebar h2 {
  text-align:center;
}

.menu {
  margin-top:30px;
}

.menu div {
  background:rgba(255,255,255,0.2);
  padding:10px;
  margin:10px 0;
  border-radius:10px;
}

/* MAIN */
.main {
  flex:1;
  padding:20px;
  display:grid;
  grid-template-columns: 2fr 1fr;
  gap:20px;
}

/* CARDS */
.card {
  background:white;
  padding:20px;
  border-radius:15px;
  box-shadow:0 5px 15px rgba(0,0,0,0.1);
}

/* CIRCLE */
.circle {
  width:500px;
  height:500px;
  border-radius:50%;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:30px;
  margin:auto;
  background: conic-gradient(#888 0%, #888 var(--value), #ddd var(--value));
  border: 1px solid gray;
}
</style>
</head>

<body>

<!-- MENU LATERAL -->
<div class="sidebar">
  <h2><abbr title='Sistema de Irrigação Automático'>SIA</abbr></h2>
</div>

<!-- CONTEÚDO -->
<div class="main">

  <!-- UMIDADE GRANDE -->
  <div class="card">
    <h3>🌱 Umidade do Solo</h3>
    <div class="circle" id="umidade">--%</div>
  </div>

  <!-- COLUNA DIREITA -->
  <div style="display:flex; flex-direction:column; gap:20px;">

    <div class="card">
      <h3>💧 Nível da Água</h3>
      <p id="agua">--%</p>
    </div>

    <div class="card">
      <h3>⚡ Bomba</h3>
      <p id="bomba">--</p>
    </div>

    <div class="card">
      <h3>☀️ Índice UV</h3>
      <p id="uv">--</p>
    </div>

    <div class="card">
      <h3>🌧️ Chuva</h3>
      <p id="chuva">--</p>
    </div>

    <div class="card">
    <h3>🪣 Reservatório</h3>
    <p id="reservatorio">--</p>
    </div>

    <div class="card">
    <h3>🌱 Q.Regas</h3>
    <p id="Q.regadas">--</p>
    </div>

  </div>

</div>

<script>
async function atualizar() {
  try {
    const res = await fetch("/dados");
    const d = await res.json();
    const reserv = document.getElementById("reservatorio");
    reserv.innerText = d.reservatorio;

    document.getElementById("umidade").innerText = d.umidade + "%";
    document.getElementById("agua").innerText = d.agua + "%";
    document.getElementById("uv").innerText = d.uv;
    document.getElementById("bomba").innerText = d.bomba;
    document.getElementById("chuva").innerText = d.chuva;
    document.getElementById("reservatorio").innerText = d.reservatorio;
    document.getElementById("Q.regadas").innerText = d.regas;
    if (d.reservatorio === "Aberto")
    {
    reserv.style.color = "green";
    } else {
    reserv.style.color = "red";
    }

  } catch (e) {
    console.log("erro", e);
  }
}

setInterval(atualizar, 300);
atualizar();
</script>

</body>
</html>
)rawliteral";
  server.send(200, "text/html", html);
});

server.begin();


}

float lerDistancia() {
  float soma = 0;
  int leiturasValidas = 0;

  for (int i = 0; i < 5; i++) {
    digitalWrite(trig, LOW);
    delayMicroseconds(2);

    digitalWrite(trig, HIGH);
    delayMicroseconds(10);
    digitalWrite(trig, LOW);

    long tempo = pulseIn(echo, HIGH, 30000);

    if (tempo == 0) continue;

    float d = tempo / 58.0;
    soma += d;
    leiturasValidas++;

    delay(50);
  }

  if (leiturasValidas == 0) return distancia; // mantém último valor

  return soma / leiturasValidas;

}

void loop()
{

  server.handleClient();

  int SC = digitalRead(sensorCD);
  int V = analogRead(UV_PIN);
  int UVINDEX = 0;
  int leituraA = analogRead(sensor);
  int porcentagemU = map(leituraA, Vseco, Vmolhado, 0, 100);
  

  porcentagemU = constrain(porcentagemU, 0, 100);
  
    digitalWrite(trig, LOW);
    delayMicroseconds(2);

    digitalWrite(trig, HIGH);
    delayMicroseconds(10);
    digitalWrite(trig, LOW);

  distancia = lerDistancia();
  float porcentagem = ((alturaRecipiente - distancia)/alturaRecipiente) * 100;

  Serial.print("Leitura Analogica: ");
  Serial.print(leituraA);
  Serial.print(" | umidade: ");
  Serial.print(porcentagemU);
  Serial.println("%");


  if (SC == HIGH || SC == LOW && porcentagem > 70)
  {
    Serial.println("reservatorio cheio");
    servin.write(0);
  }
  else
  {
    Serial.println(" | chovendo, abrindo reservatorio");
    servin.write(180);
  }

  if (!bombaLigada && porcentagemU < limiteLiga)
{
  digitalWrite(rele, HIGH);
  bombaLigada = true;

  VR++; 

  tempoLigou = millis();
  Serial.println("Bomba LIGOU");
}

if (bombaLigada && porcentagemU > limiteDesliga)
{
  digitalWrite(rele, LOW);
  bombaLigada = false;

  Serial.println("Bomba DESLIGOU");
}
  
    if(porcentagem <0) porcentagem = 0;
    if(porcentagem >100) porcentagem = 100; 

    if (V < 40) UVINDEX = 0;
    else if (V < 184) UVINDEX = 1;
    else if (V < 260) UVINDEX = 2;
    else if (V < 332) UVINDEX = 3;
    else if (V < 412) UVINDEX = 4;
    else if (V < 496) UVINDEX = 5;
    else if (V < 568) UVINDEX = 6;
    else if (V < 648) UVINDEX = 7;
    else if (V < 720) UVINDEX = 8;
    else if (V < 800) UVINDEX = 9;
    else if (V < 894) UVINDEX = 10;
    else UVINDEX = 11;

    Serial.print("| indice uv: ");
    Serial.println(UVINDEX);
    lcd.clear();
    lcd.setCursor(0,0);
    lcd.print("umidade:");
    lcd.print(porcentagemU);
    lcd.print("%");
    lcd.setCursor(0,1);
    lcd.print("nivel agua:");
    lcd.print(porcentagem);
    lcd.print("%");
    delay(300);

    lcd.clear();
    lcd.setCursor(0,0);
    lcd.print("chuva:");
    if (SC == HIGH)
    {
      lcd.print("nao");
    }
    else
    {
      lcd.print("sim");
    }
    lcd.setCursor(0,1);
    lcd.print("indice uv:");
    lcd.print(UVINDEX);
    delay(300);

    lcd.clear();
    lcd.setCursor(0,0);
    lcd.print("bomba: ");
    if(digitalRead(rele) == LOW)
    {
      lcd.print("ligada");
    }
    else
    {
      lcd.print("desligada");
    }
    lcd.setCursor(0,1);
    lcd.print("reserv:");
    if(SC == HIGH)
    {
      lcd.print("fechado");
    }
    else if (SC == HIGH && porcentagem > 70)
    {
      lcd.print("fechado");
    }
    else
    {
      lcd.print("aberto");
    }
    delay(300);

    lcd.clear();
    lcd.setCursor(0,0);
    lcd.print("Q.regadas: ");
    lcd.print(VR);
    lcd.setCursor(0,1);
    lcd.print("IP:");
    lcd.print(WiFi.localIP());
    delay(300);

    if(porcentagem < 4 && porcentagemU < limiteU)
    {
      Serial.print("pouca agua, nao sera posivel regar");
    }

    if (UVINDEX >= 6)
    {
      servin2.write(120);
    }
    else
    {
      servin2.write(0);
    }

    Serial.print("nivel agua: ");
    Serial.print(porcentagem);
    Serial.println("%");
    delay(300);
}