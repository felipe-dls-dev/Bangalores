const SFX_FILES={
 click:'assets/sfx/click.ogg',
 hit:'assets/sfx/hit.ogg',
 coin:'assets/sfx/coin.ogg',
 levelup:'assets/sfx/levelup.ogg',
 forgeSuccess:'assets/sfx/forge-success.ogg',
 forgeFail:'assets/sfx/forge-fail.ogg',
} as const
export type SfxId=keyof typeof SFX_FILES
const MUTE_KEY='bangalores-audio-muted'
let muted=typeof localStorage!=='undefined'&&localStorage.getItem(MUTE_KEY)==='1'
const cache=new Map<SfxId,HTMLAudioElement>()
function sfxUrl(path:string){return `${import.meta.env.BASE_URL}${path}`}
export function isAudioMuted(){return muted}
export function setAudioMuted(next:boolean){muted=next;try{localStorage.setItem(MUTE_KEY,next?'1':'0')}catch{}}
// Efeitos sonoros tocam via <audio> clonado a cada chamada (em vez de reiniciar a mesma
// instância) para permitir sobreposição -- dois acertos seguidos rápidos, por exemplo, não
// devem cortar um ao outro. O elemento original de cada id fica em cache só como "molde" a
// partir do qual clonar, evitando recriar o Audio() (e reler o arquivo) a cada chamada.
export function playSfx(id:SfxId,volume=.45){
 if(muted)return
 let template=cache.get(id)
 if(!template){template=new Audio(sfxUrl(SFX_FILES[id]));template.preload='auto';cache.set(id,template)}
 const instance=template.cloneNode(true) as HTMLAudioElement
 instance.volume=volume
 instance.play().catch(()=>{})
}
