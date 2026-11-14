import "./styles.css"
import Container from "../../templates/container"

import {toastError, toastSucess} from "../../utils/toast"

import { useMutation } from "@tanstack/react-query"

import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import type FilmeResponse from "../filmes/types";
import { FiTrash } from "react-icons/fi";

import Modal from "../../components/modal";
import { useState } from "react";
import { api } from "../../services/api"

import { useNavigate } from "react-router"

export default function DetalhesFilme() {

    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false)

    const params = useParams()

    function openModal() {
        setIsModalOpen(true)
    }

    function closeModal() {
        setIsModalOpen(false)
    }

    async function removeFilme() {
        return await api.delete(`/filmes/${params.id}`)
    }

    const deleteMutation = useMutation({
        mutationFn: removeFilme,
        onSuccess: () => {
            toastSucess("Filme removido com sucesso!")
            closeModal()
            navigate("/filmes")
        },
        onError: () => {
            toastError("Erro ao tentar remover o filme!")
            closeModal()
        },
    })

    async function getFilmeDetail() {

        return api.get<FilmeResponse>(`/filmes/${params.id}`)
    }

    const query = useQuery({ queryKey: ["filme", params.id], queryFn: getFilmeDetail, retry: false })

    function handleMutate(){
        deleteMutation.mutate()
    }

    return (
        <Container>

            <div>
                {query.isFetching ? <p>Carregando detalhes do filme</p> : (
                    <div>
                        <p>{query.data?.data.titulo}</p>

                        <div>
                            <FiTrash className="icon-delete" onClick={openModal} />
                        </div>

                        <img src={query.data?.data.imagem} />
                        <p>{query.data?.data.genero}</p>
                        <p>Diretor: {query.data?.data.diretor}</p>
                        <p>Ano: {query.data?.data.ano}</p>
                        <p>{query.data?.data.sinopse}</p>
                        <p>Valor da diária: R$ {query.data?.data.valorDiaria}</p>
                        <p>{query.data?.data.disponivel ? "Disponível" : "Alugado"}</p>
                    </div>
                )}
            </div>

            <Modal closeModal={closeModal} isModalOpen={isModalOpen}>
                <h3>Tem certeza que deseja excluir esse filme?</h3>

                <div style={{ display: "flex", justifyContent: "space-evenly", marginTop: 30 }}>
                    {deleteMutation.isPending ? <p>Apagando...</p> : <button onClick={handleMutate}>Sim</button>}
                    <button onClick={closeModal}>Não</button>
                </div>
            </Modal>
        </Container>
    )
}
