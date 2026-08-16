import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  HEROES, EQUIPMENT, CONSUMABLES, MONSTERS, BOSSES, EVENTS,
  equipmentAffinity, equipmentRequiredLevel
} from '../src/store/game'

const publicRoot = 'https://felipe-dls-dev.github.io/Bangalores/'
const classNames:Record<string,string>={guerreiro:'Guerreiro',guardiao:'Guardião',cacadora:'Ladino',arcanista:'Mago'}
const slotNames:Record<string,string>={amuleto:'Amuleto',capacete:'Capacete',bolsa:'Bolsa',anel_1:'Anel 1',peitoral:'Peitoral',anel_2:'Anel 2',calcas:'Calças',mao_esquerda:'Mão esquerda',mao_direita:'Mão direita',botas:'Botas'}
const artOf=(card:any)=>card.arte??card.imagem??''
const row=(card:any,categoria:string,extra:Record<string,unknown>={})=>{
  const arte=artOf(card)
  return {
    ID:card.id??'',Nome:card.nome??'',Categoria:categoria,Subcategoria:'',Classe:'Universal',Slot:'',Raridade:card.raridade??'comum',
    'Nível mínimo':'',Preço:'',Ataque:card.ataque??'',Defesa:card.defesa??'',Vida:card.vida??'',Ouro:card.ouro??'',Valor:card.valor??'',Capacidade:card.capacidade??'',
    'Habilidade / descrição':card.habilidade??card.descricao??'','Caminho da arte':arte,'URL pública da arte':arte?publicRoot+arte:'','Imagem original':card.imagem??'',...extra
  }
}

const rows:any[]=[]
for(const card of HEROES) rows.push(row(card,'Herói',{Classe:classNames[card.id]??card.id,Raridade:card.raridade??'heroico'}))
for(const card of EQUIPMENT){
  const affinity=card.classeExclusiva??equipmentAffinity(card)
  rows.push(row(card,'Equipamento',{
    Subcategoria:card.tipoEquipamento??slotNames[card.slot]??card.slot,Classe:affinity?classNames[affinity]:'Universal',Slot:slotNames[card.slot]??card.slot,
    'Nível mínimo':equipmentRequiredLevel(card),Preço:card.preco
  }))
}
for(const card of CONSUMABLES) rows.push(row(card,'Consumível',{Subcategoria:card.tipo,Preço:card.preco}))
for(const card of MONSTERS){
  rows.push(row(card,'Monstro',{Subcategoria:'Comum','Nível mínimo':card.nivel??card.dificuldade}))
  rows.push(row({...card,id:`elite_${card.id}`,nome:`Elite: ${card.nome}`,ataque:Math.ceil(card.ataque*1.24),vida:Math.ceil(card.vida*1.55),ouro:Math.ceil(card.ouro*1.7),raridade:'raro',habilidade:`${card.habilidade} • Técnica de elite`},'Monstro',{Subcategoria:'Elite','Nível mínimo':card.nivel??card.dificuldade}))
}
for(const card of Object.values(BOSSES)) rows.push(row(card,'Monstro',{Subcategoria:'Chefe','Nível mínimo':card.nivel??card.dificuldade}))
for(const card of EVENTS) rows.push(row(card,'Evento',{Subcategoria:card.tipo}))

writeFileSync(resolve('tmp/card-catalog-data.json'),JSON.stringify(rows,null,2),'utf8')
console.log(`${rows.length} cartas exportadas.`)
