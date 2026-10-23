# 🛡️ Guia de Contingência Offline para o Dia da Banca

Se a rede Wi-Fi da instituição apresentar oscilação ou falha durante a apresentação:

1. **Plano A (Normal)**:
   - Celular e Computador conectados no mesmo Wi-Fi.
   - App aponta para o IP local da máquina (`http://192.168.x.x:8080`).

2. **Plano B (Rede Local Ad-Hoc / Ponto de Acesso Celular)**:
   - Roteie a internet 4G do seu próprio celular para o notebook.
   - O IP não muda e não há firewall de rede universitária bloqueando portas.

3. **Plano C (100% Local no Emulador ou Navegador)**:
   - Execute o app no navegador através de:
     ```bash
     npx expo start --web
     ```
   - O aplicativo acessa diretamente `http://localhost:8080` sem passar por roteadores de rede!
   - Utilize a massa de dados do script `reset-banca-seed.sh`.
