import axios from "axios"
import {useAuth} from "../hooks/useAuth"

export const api = axios.create({ baseURL: "http://localhost:3001" })

const {token} = useAuth.getState();

if(token){
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`
}
