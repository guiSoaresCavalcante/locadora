import "./styles.css"
import {api} from "../../services/api"
import {useForm} from "react-hook-form";
import {useMutation, useQuery} from "@tanstack/react-query"

import { yupResolver } from "@hookform/resolvers/yup"
import * as yup from "yup"

import Container from "../../templates/container"
import type LocacaoResponse from "./types";
import type ClienteResponse from "../clientes/types";
import type FilmeResponse from "../filmes/types";
import { useState } from "react";

import Modal from "../../components/modal";
import {toastError, toastSucess} from "../../utils/toast"

interface FormLocacao{
  "clienteId": number,
  "filmeId": number,
  "dias": number
}

const REQUIRED_FIELD = "Campo obrigatório";

const schemaValidation = yup.object({
  "clienteId": yup.number().typeError(REQUIRED_FIELD).required(REQUIRED_FIELD),
  "filmeId": yup.number().typeError(REQUIRED_FIELD).required(REQUIRED_FIELD),
  "dias": yup.number().typeError("Dias inválido").integer("Dias inválido").moreThan(0, "Dias deve ser maior que 0").required(REQUIRED_FIELD)
})

export default function Locacoes() {

  const {register, handleSubmit, reset, formState:{errors}} = useForm({resolver:yupResolver(schemaValidation)});

  const [isVisibleModalForm, setIsVisibleModalForm] = useState(false)

  const mutate = useMutation({mutationFn:postLocacao, onSuccess:()=>{
    setIsVisibleModalForm(false);
    query.refetch();
    queryFilmes.refetch();
    reset()
    toastSucess("Locação cadastrada!")
  }, onError:()=>{
    toastError("Erro ao cadastrar a locação! Verifique se o filme está disponível.")
  }})

  const devolucaoMutation = useMutation({mutationFn:postDevolucao, onSuccess:()=>{
    query.refetch()
    queryFilmes.refetch()
    toastSucess("Filme devolvido!")
  }, onError:()=>{
    toastError("Erro ao devolver o filme!")
  }})

  async function postLocacao(values:FormLocacao){
    return await api.post("/locacoes", values)
  }

  async function postDevolucao(id:number){
    return await api.post(`/locacoes/${id}/devolucao`)
  }

  async function saveLocacao(values:FormLocacao){
    mutate.mutate(values)
  }

  async function getLocacoes() {
    return await api.get<LocacaoResponse[]>("/locacoes");
  }

  async function getClientes() {
    return await api.get<ClienteResponse[]>("/clientes");
  }

  async function getFilmes() {
    return await api.get<FilmeResponse[]>("/filmes");
  }

  const query = useQuery({ queryKey: ['locacoes'], queryFn: getLocacoes, retry:false })
  const queryClientes = useQuery({ queryKey: ['clientes'], queryFn: getClientes, retry:false })
  const queryFilmes = useQuery({ queryKey: ['filmes'], queryFn: getFilmes, retry:false })

  return (
    <div>
      <Container>

        <h1>Locações</h1>

        <button onClick={()=>setIsVisibleModalForm(true)} className="botao-novo">Nova locação</button>

        {query.isFetching ? <p>Carregando...</p>: (
          <table className="tabela">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Filme</th>
                <th>Data</th>
                <th>Dias</th>
                <th>Valor total</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {query.data?.data.map((locacao)=>(
                <tr key={locacao.id}>
                  <td>{locacao.clienteNome}</td>
                  <td>{locacao.filmeTitulo}</td>
                  <td>{new Date(locacao.dataLocacao).toLocaleDateString("pt-BR")}</td>
                  <td>{locacao.dias}</td>
                  <td>{locacao.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                  <td>{locacao.status}</td>
                  <td>
                    {locacao.status === "ativa" && (
                      <button onClick={()=>devolucaoMutation.mutate(locacao.id)} disabled={devolucaoMutation.isPending}>Devolver</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <Modal closeModal={()=>setIsVisibleModalForm(false)} isModalOpen={isVisibleModalForm}>
          <form>
              <select {...register("clienteId")} defaultValue="">
                <option value="">Selecione o cliente</option>
                {queryClientes.data?.data.map((cliente)=><option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}
              </select><br/>
              <span>{errors.clienteId?.message}</span><br/><br/>
              <select {...register("filmeId")} defaultValue="">
                <option value="">Selecione o filme</option>
                {queryFilmes.data?.data.filter((filme)=>filme.disponivel).map((filme)=><option key={filme.id} value={filme.id}>{filme.titulo}</option>)}
              </select><br/>
              <span>{errors.filmeId?.message}</span><br/><br/>
              <input {...register("dias")} placeholder="Dias"/><br/>
              <span>{errors.dias?.message}</span><br/><br/>
              {mutate.isPending ? <span>Salvando...</span>:<button type="button" onClick={handleSubmit(saveLocacao)}>Salvar</button>}

          </form>
        </Modal>
      </Container>
    </div>
  )
}
