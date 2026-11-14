export default interface LocacaoResponse {
  "id": number,
  "clienteId": number,
  "filmeId": number,
  "clienteNome": string,
  "filmeTitulo": string,
  "dias": number,
  "valorTotal": number,
  "dataLocacao": string,
  "dataDevolucao": string | null,
  "status": "ativa" | "devolvida"
}
