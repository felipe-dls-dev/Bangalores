// Um único som ('hit') tocava pra todo tipo de ataque -- lâmina, garras, martelo e magia
// soavam idênticos. Agora cada AttackAnimType (ver game.ts) tem seu próprio arquivo; o mapa
// tipo→som fica em main.tsx (ATTACK_SFX), perto de onde AttackAnimType já é importado, pra
// este arquivo continuar sem depender da store.
const SFX_FILES={
 click:'assets/sfx/click.ogg',
 atkCorte:'assets/sfx/attack-corte.ogg',
 atkFacas:'assets/sfx/attack-facas.ogg',
 atkMartelo:'assets/sfx/attack-martelo.ogg',
 atkMagico:'assets/sfx/attack-magico.ogg',
 atkFuro:'assets/sfx/attack-furo.ogg',
 atkDisparo:'assets/sfx/attack-furo.ogg',
 atkGarras:'assets/sfx/attack-garras.ogg',
 atkEspinhos:'assets/sfx/attack-espinhos.ogg',
 coin:'assets/sfx/coin.ogg',
 levelup:'assets/sfx/levelup.ogg',
 forgeSuccess:'assets/sfx/forge-success.ogg',
 forgeFail:'assets/sfx/forge-fail.ogg',
 heal:'assets/sfx/forge-success.ogg',potion:'assets/sfx/levelup.ogg',defeat:'assets/sfx/forge-fail.ogg',
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
 if(id==='atkDisparo'&&typeof window!=='undefined'){
  const Ctx=window.AudioContext??(window as any).webkitAudioContext; if(Ctx){const ctx=new Ctx(),now=ctx.currentTime,g=ctx.createGain(),o=ctx.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(620,now);o.frequency.exponentialRampToValueAtTime(120,now+.16);g.gain.setValueAtTime(Math.max(.001,volume*.3),now);g.gain.exponentialRampToValueAtTime(.001,now+.16);o.connect(g).connect(ctx.destination);o.start(now);o.stop(now+.17);return}
 }
 let template=cache.get(id)
 if(!template){template=new Audio(sfxUrl(SFX_FILES[id]));template.preload='auto';cache.set(id,template)}
 const instance=template.cloneNode(true) as HTMLAudioElement
 instance.volume=volume
 instance.play().catch(()=>{})
}
