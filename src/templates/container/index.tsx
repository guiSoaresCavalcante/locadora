import { useEffect } from "react";
import {useNavigate, Link} from "react-router";
import "./styles.css"

import { useAuth } from "../../hooks/useAuth";

interface ContainerProps {
    children: React.ReactNode;
}

export default function Container({children}:ContainerProps){

    const {token, clearUser} = useAuth();
    const navigate = useNavigate();

    useEffect(()=>{
        if(!token){
            navigate("/",{replace:true})
        }
    },[token, navigate])

    function logout(){
        clearUser();
        navigate("/",{replace:true})
    }

    return(
        <div className="container-content">
            <header className="container-header">
                <h1>Locadora</h1>

                <nav>
                    <ul>
                        <li><Link to="/filmes">Filmes</Link></li>
                        <li><Link to="/clientes">Clientes</Link></li>
                        <li><Link to="/locacoes">Locações</Link></li>
                        <li onClick={logout}>Sair</li>
                    </ul>
                </nav>
            </header>

            <div className="content-children">
                {children}
            </div>

            <footer className="container-footer">
                <p>Todos os direitos reservados</p>
            </footer>

        </div>
    )
}
