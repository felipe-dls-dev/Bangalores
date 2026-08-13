import type { Equipment } from '../types'

const bag=(id:string,nome:string,capacidade:number,preco:number,nivelMinimo:number,raridade:Equipment['raridade'],arquivo:string):Equipment=>({
  id,nome,slot:'bolsa',preco,ataque:0,defesa:0,vida:0,capacidade,nivelMinimo,raridade,
  tipoEquipamento:'bolsa',habilidade:`Capacidade: permite guardar até ${capacidade} equipamentos.`,
  imagem:`assets/art/backpacks/${arquivo}`,arte:`assets/art/backpacks/${arquivo}`
})

export const BACKPACKS:Equipment[]=[
  bag('sacola_4','Sacola',4,8,1,'comum','sacola-4-espacos.png'),
  bag('bolsa_colo_6','Bolsa de Colo',6,14,1,'incomum','bolsa-colo-6-espacos.png'),
  bag('mochila_pequena_8','Mochila Pequena',8,22,1,'raro','mochila-pequena-8-espacos.png'),
  bag('mochila_grande_10','Mochila Grande',10,38,7,'epico','mochila-grande-10-espacos.png'),
  bag('mochila_viagem_12','Mochila de Viagem',12,58,12,'lendario','mochila-viagem-12-espacos.png')
]
