import { useState } from "react"
import { useNavigate } from "react-router"
import "./styles.css"
import {useAuth} from "../../hooks/useAuth"
import {api} from "../../services/api"
import {toastError} from "../../utils/toast"

export interface ResponseAuth {
    "token": string,
    "usuario": { "id": number, "nome": string, "email": string }
}

export default function Login() {
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");

    const {setAuthData} = useAuth();

    const navigate = useNavigate()

    async function authLogin() {
        try {
            const response = await api.post<ResponseAuth>("/auth/login",
                { email, senha }
            )

            setAuthData(response.data);
            api.defaults.headers.common["Authorization"] = `Bearer ${response.data.token}`
            navigate("/filmes")
        } catch {
            toastError("E-mail ou senha incorretos")
        }
    }

    function onsubmit() {
        authLogin()
    }

    return (
        <div className="container-login">
            <form className="container-form-login">
                <h1>Locadora</h1>

                <p>Informe seus dados corretamente para acessar o sistema.</p>

                <input placeholder="Digite o e-mail"
                    value={email} onChange={(evento) => setEmail(evento.target.value)} />

                <input type="password" placeholder="Digite a senha"
                    value={senha} onChange={(evento) => setSenha(evento.target.value)} />

                <button type="button" onClick={onsubmit}>Entrar</button>
            </form>
        </div>
    )
}
