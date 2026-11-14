import {create} from "zustand"
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ResponseAuth } from "../pages/login"

interface UseAuthType{
    token:string
    usuario:{email:string, id:number, nome:string},
    setAuthData:(data:ResponseAuth)=>void
    clearUser:()=>void
}

export const useAuth = create<UseAuthType>()(
    persist(
        (set) => ({
            token:"", 
            usuario:{email:"", id:0, nome:"",  },
            setAuthData:(data)=>set({token:data.token, usuario:data.usuario}),
            clearUser:()=>set({token:"", usuario: {email:"", id:0, nome:"",  }})
        }),
        {
            name: "@auth",
            storage: createJSONStorage(() => localStorage)
        }
    )
)
