import "./styles.css"
import {api} from "../../services/api"
import {useForm} from "react-hook-form";
import {useMutation, useQuery} from "@tanstack/react-query"

import { yupResolver } from "@hookform/resolvers/yup"
import * as yup from "yup"

import Container from "../../templates/container"
import type ClienteResponse from "./types";
import { useState } from "react";
import { FiTrash } from "react-icons/fi";

import Modal from "../../components/modal";
import {toastError, toastSucess} from "../../utils/toast"

interface FormCliente{
  "nome": string,
  "cpf": string,
  "email": string,
  "telefone": string
}

const REQUIRED_FIELD = "Campo obrigatório";

const schemaValidation = yup.object({
  "nome": yup.string().required(REQUIRED_FIELD),
  "cpf": yup.string().required(REQUIRED_FIELD),
  "email": yup.string().email("E-mail inválido").required(REQUIRED_FIELD),
  "telefone": yup.string().required(REQUIRED_FIELD)
})

export default function Clientes() {

  const {register, handleSubmit, reset, formState:{errors}} = useForm({resolver:yupResolver(schemaValidation)});

  const [isVisibleModalForm, setIsVisibleModalForm] = useState(false)
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteResponse | null>(null)

  const mutate = useMutation({mutationFn:postCliente, onSuccess:()=>{
    setIsVisibleModalForm(false);
    query.refetch();
    reset()
    toastSucess("Cliente cadastrado!")
  }, onError:()=>{
    toastError("Erro ao cadastrar o cliente! Verifique se o CPF já está cadastrado.")
  }})

  const deleteMutation = useMutation({mutationFn:deleteCliente, onSuccess:()=>{
    setClienteSelecionado(null)
    query.refetch()
    toastSucess("Cliente removido com sucesso!")
  }, onError:()=>{
    setClienteSelecionado(null)
    toastError("Erro ao tentar remover o cliente!")
  }})

  async function postCliente(values:FormCliente){
    return await api.post("/clientes", values)
  }

  async function deleteCliente(id:number){
    return await api.delete(`/clientes/${id}`)
  }

  async function saveCliente(values:FormCliente){
    mutate.mutate(values)
  }

  async function getClientes() {
    return await api.get<ClienteResponse[]>("/clientes");
  }

  const query = useQuery({ queryKey: ['clientes'], queryFn: getClientes, retry:false })

  function handleDelete(){
    if(clienteSelecionado){
      deleteMutation.mutate(clienteSelecionado.id)
    }
  }

  return (
    <div>
      <Container>

        <h1>Clientes</h1>

        <button onClick={()=>setIsVisibleModalForm(true)} className="botao-novo">Novo cliente</button>

        {query.isFetching ? <p>Carregando...</p>: (
          <table className="tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>CPF</th>
                <th>E-mail</th>
                <th>Telefone</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {query.data?.data.map((cliente)=>(
                <tr key={cliente.id}>
                  <td>{cliente.nome}</td>
                  <td>{cliente.cpf}</td>
                  <td>{cliente.email}</td>
                  <td>{cliente.telefone}</td>
                  <td><FiTrash className="icon-delete" onClick={()=>setClienteSelecionado(cliente)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <Modal closeModal={()=>setIsVisibleModalForm(false)} isModalOpen={isVisibleModalForm}>
          <form>
              <input {...register("nome")} placeholder="Nome"/><br/>
              <span>{errors.nome?.message}</span><br/><br/>
              <input {...register("cpf")} placeholder="CPF"/><br/>
              <span>{errors.cpf?.message}</span><br/><br/>
              <input {...register("email")} placeholder="E-mail"/><br/>
              <span>{errors.email?.message}</span><br/><br/>
              <input {...register("telefone")} placeholder="Telefone"/><br/>
              <span>{errors.telefone?.message}</span><br/><br/>
              {mutate.isPending ? <span>Salvando...</span>:<button type="button" onClick={handleSubmit(saveCliente)}>Salvar</button>}

          </form>
        </Modal>

        <Modal closeModal={()=>setClienteSelecionado(null)} isModalOpen={clienteSelecionado !== null}>
          <h3>Tem certeza que deseja excluir o cliente {clienteSelecionado?.nome}?</h3>

          <div style={{ display: "flex", justifyContent: "space-evenly", marginTop: 30 }}>
            {deleteMutation.isPending ? <p>Apagando...</p> : <button onClick={handleDelete}>Sim</button>}
            <button onClick={()=>setClienteSelecionado(null)}>Não</button>
          </div>
        </Modal>
      </Container>
    </div>
  )
}
