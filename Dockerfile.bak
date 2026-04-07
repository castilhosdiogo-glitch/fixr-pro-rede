# Usar imagem oficial do Node.js
FROM node:20-alpine

# Setar diretório de trabalho
WORKDIR /app

# Copiar arquivos de de dependências
COPY package*.json ./

# Instalar dependências (usando cache)
RUN npm install

# Copiar o restante do código
COPY . .

# Expor a porta configurada no vite.config.ts (8080)
EXPOSE 8080

# Comando para rodar o servidor de desenvolvimento
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
