# CAPABILITIES.md

## O que o Ulf pode fazer com as tools de execução

Ulf tem acesso total ao sistema onde ele roda. Pode executar comandos, criar arquivos, gerenciar processos.

---

## Tecnologias Suportadas

### Backend
- **Python**: Flask, FastAPI, Django, Tornado
- **Node.js**: Express, Fastify, NestJS, Koa
- **Go**: Gin, Echo, Fiber
- **Rust**: Actix, Rocket, Axum
- **Ruby**: Rails, Sinatra
- **PHP**: Laravel, Symfony

### Frontend
- **React**: Create React App, Next.js, Vite
- **Vue**: Vue CLI, Nuxt.js
- **Angular**: Angular CLI
- **Svelte**: SvelteKit
- **HTML/CSS/JS**: Vanilla, Tailwind, Bootstrap

### Databases
- **SQL**: PostgreSQL, MySQL, SQLite
- **NoSQL**: MongoDB, Redis, CouchDB
- **ORMs**: SQLAlchemy, Prisma, TypeORM, Sequelize

### DevOps
- **Containers**: Docker, Docker Compose
- **Process managers**: PM2, Supervisor, systemd
- **Web servers**: Nginx, Apache
- **Proxies**: Caddy, Traefik

### Languages
- Python, JavaScript/TypeScript, Go, Rust, Ruby, PHP, Java, C/C++, Elixir, Clojure

---

## Exemplos de Uso

### Criar API Node.js + Express
```
User: @Ulf cria uma API REST em Node.js com Express

Ulf vai:
1. npm install express
2. Criar server.js com rotas
3. npm start em background
4. Responder com URL e endpoints
```

### Deploy de React App
```
User: @Ulf sobe um React app com Vite

Ulf vai:
1. npm create vite@latest meu-app -- --template react
2. cd meu-app && npm install
3. npm run dev em background
4. Responder com URL de dev
```

### API Go com Gin
```
User: @Ulf cria uma API em Go com Gin

Ulf vai:
1. go mod init api
2. go get github.com/gin-gonic/gin
3. Criar main.go com rotas
4. go run main.go em background
5. Responder com URL
```

### Setup PostgreSQL + Python
```
User: @Ulf configura PostgreSQL com SQLAlchemy

Ulf vai:
1. Instalar psycopg2, sqlalchemy
2. Criar database.py com engine
3. Criar models.py com tabelas
4. Inicializar DB
5. Mostrar conexão string
```

### Docker Container
```
User: @Ulf sobe um container Redis

Ulf vai:
1. docker pull redis
2. docker run redis em background
3. Verificar container rodando
4. Responder com host:port
```

### Static Site com Nginx
```
User: @Ulf serve este HTML com nginx

Ulf vai:
1. Instalar nginx
2. Configurar /etc/nginx/sites-available/
3. Copiar HTML para /var/www/
4. Iniciar nginx
5. Responder com URL
```

---

## Capacidades Gerais

### File Operations
- Criar/editar qualquer arquivo (código, config, HTML, JSON, etc)
- Ler arquivos existentes
- Listar diretórios
- Mover/copiar/deletar arquivos (via shell)

### Process Management
- Iniciar processos em background
- Verificar processos rodando
- Matar processos (via PID)
- Monitorar recursos (CPU, RAM)

### Package Management
- **Python**: pip, poetry, conda
- **Node.js**: npm, yarn, pnpm
- **Go**: go get, go mod
- **Rust**: cargo
- **System**: apt, yum, apk

### Network
- Curl/wget para APIs
- Verificar portas abertas
- Test de conectividade
- Proxy/tunneling

### Git Operations
- Clone repos
- Commit changes
- Push/pull
- Branch management

---

## Limitações

### Container do Render
- Filesystem é efêmero (restart perde arquivos não commitados)
- Portas: apenas uma porta pública (10000)
- Recursos: CPU/RAM limitados pelo plano
- Sem acesso root a alguns comandos (systemctl, iptables)

### Timeout
- Comandos limitados a 30 segundos
- Processos longos devem rodar em background

### Segurança
- Secrets são mascarados automaticamente
- Output é truncado se muito grande

---

## Boas Práticas

### Background Processes
Use `&` no final para rodar em background:
```bash
uvicorn main:app --port 8000 &
npm start &
go run main.go &
```

### Múltiplos Serviços
Cada serviço em porta diferente:
```
API Python: 8000
Frontend React: 3000
API Go: 8080
Redis: 6379
```

### Verificar Status
```
User: @Ulf mostra o que tá rodando

Ulf usa get_processes() e mostra todos os serviços ativos
```

### Logs
```
User: @Ulf mostra os logs do servidor

Ulf usa read_file() em logs ou tail -f
```

---

## Próximas Features (Futuro)

- [ ] Persistência de projetos (volume no Render)
- [ ] Deploy automatizado (GitHub → Render)
- [ ] Monitoramento contínuo
- [ ] Webhooks para notificações
- [ ] Scheduled tasks
- [ ] Multi-region deploy

---

**Ulf é um desenvolvedor full-stack com acesso ao terminal. Pode fazer praticamente qualquer coisa que você faria localmente.** ⚔️
