import React from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, onlineConfigured, signUpWithEmail, signInWithEmail, signOutUser, signInWithGoogle, requestPasswordReset, fetchPlayerCampaigns, upsertPlayerCampaign, deletePlayerCampaigns } from './supabase'
import { useGame } from '../store/game'

type AuthStatus='loading'|'signedOut'|'signedIn'
type AuthContextValue={status:AuthStatus;user:User|null;busy:boolean;error:string;signUp:(email:string,password:string)=>Promise<boolean>;signIn:(email:string,password:string)=>Promise<boolean>;signInGoogle:()=>Promise<void>;signOut:()=>Promise<void>;resetPassword:(email:string)=>Promise<boolean>;clearError:()=>void}
const AuthContext=React.createContext<AuthContextValue|null>(null)

function translateAuthError(message:string){
 if(/already registered|already exists|user already/i.test(message))return 'Este e-mail já possui uma conta. Tente entrar.'
 if(/invalid login credentials/i.test(message))return 'E-mail ou senha incorretos.'
 if(/password.*(least|short|6 char)/i.test(message))return 'A senha precisa ter pelo menos 6 caracteres.'
 if(/rate limit/i.test(message))return 'Muitas tentativas. Aguarde um instante e tente novamente.'
 if(/email.*invalid|invalid.*email/i.test(message))return 'Digite um e-mail válido.'
 if(/failed to fetch|network|load failed/i.test(message))return 'Não foi possível conectar ao serviço de contas. Verifique sua internet e tente novamente.'
 if(/provider is not enabled|unsupported provider/i.test(message))return 'Login com Google ainda não foi habilitado neste projeto.'
 return message
}

export function AuthProvider({children}:{children:React.ReactNode}){
 const [status,setStatus]=React.useState<AuthStatus>(onlineConfigured?'loading':'signedOut')
 const [user,setUser]=React.useState<User|null>(null)
 const [busy,setBusy]=React.useState(false)
 const [error,setError]=React.useState('')
 const syncTimer=React.useRef<ReturnType<typeof setTimeout>|null>(null)

 const pullCampaigns=React.useCallback(async(uid:string)=>{
  try{
   const rows=await fetchPlayerCampaigns(uid)
   if(!rows.length)return
   const local=useGame.getState().campaigns
   const merged={...local}
   for(const row of rows){
    const existing=merged[row.id] as any,remoteSavedAt=(row.snapshot as any)?.savedAt??0
    if(!existing||(existing.savedAt??0)<remoteSavedAt)merged[row.id]=row.snapshot as any
   }
   useGame.setState({campaigns:merged} as any)
  }catch{/* melhor esforço: se a nuvem falhar, o jogo continua com o save local */}
 },[])

 const pushCampaigns=React.useCallback((uid:string)=>{
  if(syncTimer.current)clearTimeout(syncTimer.current)
  syncTimer.current=setTimeout(async()=>{
   const campaigns=useGame.getState().campaigns,ids=Object.keys(campaigns)
   try{
    await Promise.all(ids.map(id=>upsertPlayerCampaign(uid,id,(campaigns[id] as any)?.heroId,campaigns[id] as any)))
    const remote=await fetchPlayerCampaigns(uid),stale=remote.map(r=>r.id).filter(id=>!ids.includes(id))
    if(stale.length)await deletePlayerCampaigns(uid,stale)
   }catch{/* tenta de novo na próxima mudança de estado */}
  },1500)
 },[])

 React.useEffect(()=>{
  if(!onlineConfigured||!supabase){setStatus('signedOut');return}
  let active=true
  supabase.auth.getSession().then(async({data})=>{
   if(!active)return
   if(data.session?.user){setUser(data.session.user);setStatus('signedIn');await pullCampaigns(data.session.user.id)}
   else setStatus('signedOut')
  })
  const {data:sub}=supabase.auth.onAuthStateChange(async(_event,session)=>{
   if(!active)return
   if(session?.user){setUser(session.user);setStatus('signedIn');await pullCampaigns(session.user.id)}
   else{setUser(null);setStatus('signedOut')}
  })
  return()=>{active=false;sub.subscription.unsubscribe()}
 },[pullCampaigns])

 React.useEffect(()=>{
  if(status!=='signedIn'||!user)return
  return useGame.subscribe((state,previous)=>{if(state.campaigns!==previous.campaigns)pushCampaigns(user.id)})
 },[status,user,pushCampaigns])

 const signUp=async(email:string,password:string)=>{setBusy(true);setError('');try{await signUpWithEmail(email,password);return true}catch(err){setError(err instanceof Error?translateAuthError(err.message):'Não foi possível criar a conta.');return false}finally{setBusy(false)}}
 const signIn=async(email:string,password:string)=>{setBusy(true);setError('');try{await signInWithEmail(email,password);return true}catch(err){setError(err instanceof Error?translateAuthError(err.message):'Não foi possível entrar.');return false}finally{setBusy(false)}}
 const signInGoogle=async()=>{setBusy(true);setError('');try{await signInWithGoogle()}catch(err){setError(err instanceof Error?translateAuthError(err.message):'Não foi possível entrar com o Google.');setBusy(false)}}
 const signOut=async()=>{setBusy(true);try{await signOutUser()}finally{setBusy(false)}}
 const resetPassword=async(email:string)=>{setBusy(true);setError('');try{await requestPasswordReset(email);return true}catch(err){setError(err instanceof Error?translateAuthError(err.message):'Não foi possível enviar o e-mail.');return false}finally{setBusy(false)}}
 const clearError=()=>setError('')

 return <AuthContext.Provider value={{status,user,busy,error,signUp,signIn,signInGoogle,signOut,resetPassword,clearError}}>{children}</AuthContext.Provider>
}
export function useAuth(){const value=React.useContext(AuthContext);if(!value)throw new Error('AuthProvider não encontrado.');return value}
