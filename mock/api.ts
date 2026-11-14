import { createHmac, timingSafeEqual } from 'node:crypto'
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'

interface Usuario {
  id: number
  nome: string
  email: string
  senha: string
}

interface Filme {
  id: number
  titulo: string
  genero: string
  diretor: string
  ano: number
  valorDiaria: number
  sinopse: string
  imagem: string
  disponivel: boolean
}

interface Cliente {
  id: number
  nome: string
  cpf: string
  email: string
  telefone: string
}

interface Locacao {
  id: number
  clienteId: number
  filmeId: number
  clienteNome: string
  filmeTitulo: string
  dias: number
  valorTotal: number
  dataLocacao: string
  dataDevolucao: string | null
  status: 'ativa' | 'devolvida'
}

interface Db {
  usuarios: Usuario[]
  filmes: Filme[]
  clientes: Cliente[]
  locacoes: Locacao[]
}

interface JwtPayload {
  sub: number
  email: string
  nome: string
  iat: number
}

const SEED_PATH = fileURLToPath(new URL('./seed.json', import.meta.url))
const DB_PATH = fileURLToPath(new URL('./db.json', import.meta.url))

const JWT_SECRET = 'locadora-segredo-do-mock'
const ATRASO_MS = 300
const PORTA = Number(process.env.PORT ?? 3001)

function lerDb(): Db {
  if (!existsSync(DB_PATH)) copyFileSync(SEED_PATH, DB_PATH)
  return JSON.parse(readFileSync(DB_PATH, 'utf8'))
}

function salvarDb(db: Db) {
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2) + '\n')
}

function proximoId(lista: { id: number }[]) {
  return lista.reduce((maior, item) => Math.max(maior, item.id), 0) + 1
}

function semSenha(usuario: Usuario): Omit<Usuario, 'senha'> {
  return { id: usuario.id, nome: usuario.nome, email: usuario.email }
}

function base64url(dado: string | Buffer) {
  return Buffer.from(dado).toString('base64url')
}

function assinar(conteudo: string) {
  return createHmac('sha256', JWT_SECRET).update(conteudo).digest('base64url')
}

function gerarToken(usuario: Usuario) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload: JwtPayload = {
    sub: usuario.id,
    email: usuario.email,
    nome: usuario.nome,
    iat: Math.floor(Date.now() / 1000),
  }
  const corpo = `${header}.${base64url(JSON.stringify(payload))}`
  return `${corpo}.${assinar(corpo)}`
}

function verificarToken(token: string): JwtPayload | null {
  const [header, payload, assinatura] = token.split('.')
  if (!header || !payload || !assinatura) return null

  const esperada = Buffer.from(assinar(`${header}.${payload}`))
  const recebida = Buffer.from(assinatura)
  if (esperada.length !== recebida.length || !timingSafeEqual(esperada, recebida)) return null

  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

class HttpError extends Error {
  status: number

  constructor(status: number, mensagem: string) {
    super(mensagem)
    this.status = status
  }
}

function enviar(res: ServerResponse, status: number, corpo?: unknown) {
  res.statusCode = status
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (corpo === undefined) return res.end()
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(corpo))
}

async function lerCorpo(req: IncomingMessage): Promise<Record<string, unknown>> {
  const partes: Buffer[] = []
  for await (const parte of req) partes.push(parte as Buffer)
  const texto = Buffer.concat(partes).toString('utf8')
  if (!texto) return {}
  try {
    return JSON.parse(texto)
  } catch {
    throw new HttpError(400, 'JSON inválido')
  }
}

function autenticar(req: IncomingMessage, db: Db) {
  const [tipo, token] = (req.headers.authorization ?? '').split(' ')
  if (tipo !== 'Bearer' || !token) throw new HttpError(401, 'Token não informado')

  const payload = verificarToken(token)
  const usuario = payload && db.usuarios.find((u) => u.id === payload.sub)
  if (!usuario) throw new HttpError(401, 'Token inválido')
  return usuario
}

const CAMPOS_TEXTO_FILME = ['titulo', 'genero', 'diretor', 'sinopse', 'imagem'] as const
const CAMPOS_NUMERO_FILME = ['ano', 'valorDiaria'] as const
const CAMPOS_TEXTO_CLIENTE = ['nome', 'cpf', 'email', 'telefone'] as const

function validarFilme(dados: Record<string, unknown>) {
  const filme: Partial<Omit<Filme, 'id' | 'disponivel'>> = {}

  for (const campo of CAMPOS_TEXTO_FILME) {
    const valor = dados[campo]
    if (typeof valor !== 'string' || !valor.trim()) {
      throw new HttpError(400, `Campo "${campo}" é obrigatório e deve ser texto`)
    }
    filme[campo] = valor.trim()
  }

  for (const campo of CAMPOS_NUMERO_FILME) {
    const numero = Number(dados[campo])
    if (dados[campo] === '' || dados[campo] === null || Number.isNaN(numero) || numero < 0) {
      throw new HttpError(400, `Campo "${campo}" é obrigatório e deve ser um número >= 0`)
    }
    filme[campo] = numero
  }

  return filme
}

function validarCliente(dados: Record<string, unknown>) {
  const cliente: Partial<Omit<Cliente, 'id'>> = {}

  for (const campo of CAMPOS_TEXTO_CLIENTE) {
    const valor = dados[campo]
    if (typeof valor !== 'string' || !valor.trim()) {
      throw new HttpError(400, `Campo "${campo}" é obrigatório e deve ser texto`)
    }
    cliente[campo] = valor.trim()
  }

  if (!/^\S+@\S+\.\S+$/.test(cliente.email!)) throw new HttpError(400, 'E-mail inválido')

  return cliente
}

async function rotasAuth(req: IncomingMessage, res: ServerResponse, caminho: string[], db: Db) {
  const [acao] = caminho

  if (acao === 'register' && req.method === 'POST') {
    const { nome, email, senha } = await lerCorpo(req)
    if (typeof nome !== 'string' || !nome.trim()) throw new HttpError(400, 'Nome é obrigatório')
    if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, 'E-mail inválido')
    if (typeof senha !== 'string' || senha.length < 6) throw new HttpError(400, 'A senha deve ter no mínimo 6 caracteres')

    const emailNormalizado = email.trim().toLowerCase()
    if (db.usuarios.some((u) => u.email === emailNormalizado)) throw new HttpError(409, 'E-mail já cadastrado')

    const usuario: Usuario = { id: proximoId(db.usuarios), nome: nome.trim(), email: emailNormalizado, senha }
    db.usuarios.push(usuario)
    salvarDb(db)
    return enviar(res, 201, { token: gerarToken(usuario), usuario: semSenha(usuario) })
  }

  if (acao === 'login' && req.method === 'POST') {
    const { email, senha } = await lerCorpo(req)
    const usuario = db.usuarios.find(
      (u) => u.email === String(email ?? '').trim().toLowerCase() && u.senha === senha,
    )
    if (!usuario) throw new HttpError(401, 'E-mail ou senha incorretos')
    return enviar(res, 200, { token: gerarToken(usuario), usuario: semSenha(usuario) })
  }

  throw new HttpError(404, 'Rota não encontrada')
}

async function rotasFilmes(
  req: IncomingMessage,
  res: ServerResponse,
  caminho: string[],
  query: URLSearchParams,
  db: Db,
) {
  const [idTexto, extra] = caminho
  if (extra !== undefined) throw new HttpError(404, 'Rota não encontrada')

  if (idTexto === undefined) {
    if (req.method === 'GET') {
      const busca = query.get('q')?.toLowerCase()
      const filmes = db.filmes.filter((f) => !busca || f.titulo.toLowerCase().includes(busca))
      return enviar(res, 200, filmes)
    }

    if (req.method === 'POST') {
      const dados = validarFilme(await lerCorpo(req)) as Omit<Filme, 'id' | 'disponivel'>
      const filme: Filme = { id: proximoId(db.filmes), ...dados, disponivel: true }
      db.filmes.push(filme)
      salvarDb(db)
      return enviar(res, 201, filme)
    }

    throw new HttpError(405, 'Método não permitido')
  }

  const id = Number(idTexto)
  const indice = db.filmes.findIndex((f) => f.id === id)
  if (indice === -1) throw new HttpError(404, 'Filme não encontrado')

  switch (req.method) {
    case 'GET':
      return enviar(res, 200, db.filmes[indice])

    case 'DELETE':
      if (!db.filmes[indice].disponivel) throw new HttpError(409, 'Filme está alugado')
      db.filmes.splice(indice, 1)
      salvarDb(db)
      return enviar(res, 204)

    default:
      throw new HttpError(405, 'Método não permitido')
  }
}

async function rotasClientes(req: IncomingMessage, res: ServerResponse, caminho: string[], db: Db) {
  const [idTexto, extra] = caminho
  if (extra !== undefined) throw new HttpError(404, 'Rota não encontrada')

  if (idTexto === undefined) {
    if (req.method === 'GET') return enviar(res, 200, db.clientes)

    if (req.method === 'POST') {
      const dados = validarCliente(await lerCorpo(req)) as Omit<Cliente, 'id'>
      if (db.clientes.some((c) => c.cpf === dados.cpf)) throw new HttpError(409, 'CPF já cadastrado')

      const cliente: Cliente = { id: proximoId(db.clientes), ...dados }
      db.clientes.push(cliente)
      salvarDb(db)
      return enviar(res, 201, cliente)
    }

    throw new HttpError(405, 'Método não permitido')
  }

  const id = Number(idTexto)
  const indice = db.clientes.findIndex((c) => c.id === id)
  if (indice === -1) throw new HttpError(404, 'Cliente não encontrado')

  switch (req.method) {
    case 'DELETE':
      if (db.locacoes.some((l) => l.clienteId === id && l.status === 'ativa')) {
        throw new HttpError(409, 'Cliente possui locação ativa')
      }
      db.clientes.splice(indice, 1)
      salvarDb(db)
      return enviar(res, 204)

    default:
      throw new HttpError(405, 'Método não permitido')
  }
}

async function rotasLocacoes(req: IncomingMessage, res: ServerResponse, caminho: string[], db: Db) {
  const [idTexto, acao, extra] = caminho
  if (extra !== undefined) throw new HttpError(404, 'Rota não encontrada')

  if (idTexto === undefined) {
    if (req.method === 'GET') {
      return enviar(res, 200, [...db.locacoes].reverse())
    }

    if (req.method === 'POST') {
      const { clienteId, filmeId, dias } = await lerCorpo(req)
      const diasNumero = Number(dias)
      if (dias === '' || dias === null || !Number.isInteger(diasNumero) || diasNumero <= 0) {
        throw new HttpError(400, 'Campo "dias" deve ser um número inteiro maior que 0')
      }

      const cliente = db.clientes.find((c) => c.id === Number(clienteId))
      if (!cliente) throw new HttpError(404, 'Cliente não encontrado')

      const filme = db.filmes.find((f) => f.id === Number(filmeId))
      if (!filme) throw new HttpError(404, 'Filme não encontrado')
      if (!filme.disponivel) throw new HttpError(409, 'Filme indisponível')

      const locacao: Locacao = {
        id: proximoId(db.locacoes),
        clienteId: cliente.id,
        filmeId: filme.id,
        clienteNome: cliente.nome,
        filmeTitulo: filme.titulo,
        dias: diasNumero,
        valorTotal: filme.valorDiaria * diasNumero,
        dataLocacao: new Date().toISOString(),
        dataDevolucao: null,
        status: 'ativa',
      }
      filme.disponivel = false
      db.locacoes.push(locacao)
      salvarDb(db)
      return enviar(res, 201, locacao)
    }

    throw new HttpError(405, 'Método não permitido')
  }

  const locacao = db.locacoes.find((l) => l.id === Number(idTexto))
  if (!locacao) throw new HttpError(404, 'Locação não encontrada')

  if (acao === 'devolucao' && req.method === 'POST') {
    if (locacao.status === 'devolvida') throw new HttpError(409, 'Locação já devolvida')

    locacao.dataDevolucao = new Date().toISOString()
    locacao.status = 'devolvida'
    const filme = db.filmes.find((f) => f.id === locacao.filmeId)
    if (filme) filme.disponivel = true
    salvarDb(db)
    return enviar(res, 200, locacao)
  }

  throw new HttpError(404, 'Rota não encontrada')
}

async function tratarRequisicao(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const [grupo, ...caminho] = url.pathname.split('/').filter(Boolean)
  if (req.method === 'OPTIONS') return enviar(res, 204)

  const db = lerDb()

  switch (grupo) {
    case 'auth':
      return rotasAuth(req, res, caminho, db)

    case 'filmes':
      autenticar(req, db)
      return rotasFilmes(req, res, caminho, url.searchParams, db)

    case 'clientes':
      autenticar(req, db)
      return rotasClientes(req, res, caminho, db)

    case 'locacoes':
      autenticar(req, db)
      return rotasLocacoes(req, res, caminho, db)
  }

  throw new HttpError(404, 'Rota não encontrada')
}

createServer((req, res) => {
  setTimeout(() => {
    tratarRequisicao(req, res).catch((erro: unknown) => {
      if (erro instanceof HttpError) return enviar(res, erro.status, { erro: erro.message })
      console.error(erro)
      enviar(res, 500, { erro: 'Erro interno no mock' })
    })
  }, ATRASO_MS)
}).listen(PORTA, () => {
  console.log(`API mock rodando em http://localhost:${PORTA}`)
})
