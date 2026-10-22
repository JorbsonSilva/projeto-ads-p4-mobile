# Orienta — Aplicativo Mobile & Web (Período 4)

Aplicativo cross-platform em **React Native / Expo SDK 54, TypeScript e Expo Router** para a plataforma educacional **Orienta**.

Renderiza nativamente em **Android e iOS** (via Expo Go ou build nativo) e também como **Web Application** para navegador.

---

## 🚀 Como Executar

### 1. Pré-requisitos
* **Node.js (versão 20+)**
* Gerenciador de pacotes **npm** ou **yarn**
* Aplicativo **Expo Go** instalado no celular (opcional, para testar no dispositivo físico)

---

### 2. Instalação das Dependências
Na raiz deste repositório, execute:

```bash
npm install
```

---

### 3. Configuração de Ambiente (`.env`)
Copie o arquivo de exemplo:
```bash
cp .env.example .env
```

* **Para rodar no Navegador (Web) ou Emulador:** Mantenha `EXPO_PUBLIC_API_URL=http://localhost:8080`
* **Para rodar no Celular Físico via Expo Go:** Coloque o IP da sua máquina na rede local Wi-Fi: `EXPO_PUBLIC_API_URL=http://SEU_IP_AQUI:8080`

---

### 4. Executando o Projeto

#### No Navegador Web (Mais rápido para demonstração):
```bash
npm run web
```
Acesse [http://localhost:8081](http://localhost:8081) no navegador.

#### No Celular com Expo Go:
```bash
npm start
```
Escaneie o QR Code exibido no terminal com o app Expo Go (Android) ou Câmera (iOS).
