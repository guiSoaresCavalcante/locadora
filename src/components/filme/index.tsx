import "./styles.css"
import { useNavigate } from "react-router"

interface FilmeProps {
    filme: {
        "id": number;
        "titulo": string,
        "genero": string,
        "valorDiaria": number,
        "imagem": string,
        "disponivel": boolean
    }
}

export default function Filme({ filme }: FilmeProps) {
    const { titulo, genero, valorDiaria, imagem, disponivel, id } = filme

    const navigate = useNavigate();

    function onNavigate() {
        navigate(`/filmes/${id}`)
    }

    return (
        <div className="container-product" onClick={onNavigate}>
            <h2>{titulo}</h2>

            <div className="content-img">
                <img src={imagem} />
            </div>

            <p className="fabricante">{genero}</p>

            <p className="preco">R$ {valorDiaria}</p>

            <p className="fabricante">{disponivel ? "Disponível" : "Alugado"}</p>
        </div>
    )
}
