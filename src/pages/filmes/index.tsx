import "./styles.css"
import {api} from "../../services/api"
import {useForm} from "react-hook-form";
import {useMutation} from "@tanstack/react-query"

import { yupResolver } from "@hookform/resolvers/yup"
import * as yup from "yup"

import Container from "../../templates/container"
import Filme from "../../components/filme"
import { useQuery } from "@tanstack/react-query";
import type FilmeResponse from "./types";
import { useState } from "react";

import Modal from "../../components/modal";
import {toastError, toastSucess} from "../../utils/toast"

interface FormFilme{
  "titulo": string,
  "genero": string,
  "diretor": string,
  "ano": number,
  "valorDiaria": number,
  "sinopse": string,
  "imagem": string
}

const REQUIRED_FIELD = "Campo obrigatório";

const schemaValidation = yup.object({
  "titulo": yup.string().required(REQUIRED_FIELD),
  "genero": yup.string().required(REQUIRED_FIELD),
  "diretor": yup.string().required(REQUIRED_FIELD),
  "ano": yup.number().typeError("Ano inválido").required(REQUIRED_FIELD),
  "valorDiaria": yup.number().typeError("Valor inválido").required(REQUIRED_FIELD),
  "sinopse": yup.string().required(REQUIRED_FIELD),
  "imagem": yup.string().required(REQUIRED_FIELD)
})

export default function Filmes() {

  const {register, handleSubmit, reset, formState:{errors}} = useForm({resolver:yupResolver(schemaValidation)});

  const [isVisibleModalForm, setIsVisibleModalForm] = useState(false)
  const [busca, setBusca] = useState("")

  const mutate = useMutation({mutationFn:postFilme, onSuccess:()=>{
    setIsVisibleModalForm(false);
    query.refetch();
    reset()
    toastSucess("Filme cadastrado!")
  }, onError:()=>{
    toastError("Erro ao cadastrar o filme!")
  }})

  async function postFilme(values:FormFilme){
    return await api.post("/filmes", values)
  }

  async function saveFilme(values:FormFilme){
    mutate.mutate(values)
  }

  async function getFilmes() {
    return await api.get<FilmeResponse[]>("/filmes");
  }

  const query = useQuery({ queryKey: ['filmes'], queryFn: getFilmes, retry:false })

  return (
    <div>
      <Container>

        <h1>Filmes</h1>

        <input className="input-busca" value={busca} onChange={(evento)=>setBusca(evento.target.value)} placeholder="Buscar filme pelo título"/>

        <div className="home-container-list">

         {query.isFetching ? <p>Carregando...</p>: <>{query.data?.data.filter((filme)=>filme.titulo.toLowerCase().includes(busca.toLowerCase())).map((filme)=><Filme key={filme.id} filme={filme}/>)}</>}

        </div>

        <button onClick={()=>setIsVisibleModalForm(true)} className="float-button">+</button>

        <Modal closeModal={()=>setIsVisibleModalForm(false)} isModalOpen={isVisibleModalForm}>
          <form>
              <input {...register("titulo")} placeholder="Título"/><br/>
              <span>{errors.titulo?.message}</span><br/><br/>
              <input {...register("genero")} placeholder="Gênero"/><br/>
              <span>{errors.genero?.message}</span><br/><br/>
              <input {...register("diretor")} placeholder="Diretor"/><br/>
              <span>{errors.diretor?.message}</span><br/><br/>
              <input {...register("ano")} placeholder="Ano"/><br/>
              <span>{errors.ano?.message}</span><br/><br/>
              <input {...register("valorDiaria")} placeholder="Valor da diária"/><br/>
              <span>{errors.valorDiaria?.message}</span><br/><br/>
              <textarea {...register("sinopse")} placeholder="Sinopse"></textarea><br/>
              <span>{errors.sinopse?.message}</span><br/><br/>
              <input {...register("imagem")} placeholder="URL da imagem"/><br/>
              <span>{errors.imagem?.message}</span><br/><br/>
              {mutate.isPending ? <span>Salvando...</span>:<button type="button" onClick={handleSubmit(saveFilme)}>Salvar</button>}

          </form>
        </Modal>
      </Container>
    </div>
  )
}
