const corpoAta = 'Local: {{LOCAL}}.\nPauta: {{PAUTA}}.\nRegistro da reunião: {{REGISTRO}}.'
export const biblioteca = [
  { nome: 'Ata de reunião', tipo: 'ATA', finalidade: 'ATA_REUNIAO', perfil: 'ATA_PADRAO', livro: true, corpo: corpoAta, campos: ['LOCAL', 'PAUTA', 'REGISTRO'] },
  { nome: 'Ata de Assembleia Geral Ordinária', tipo: 'ATA', finalidade: 'ATA_AGO', perfil: 'ATA_ASSEMBLEIA', livro: true, corpo: corpoAta, campos: ['LOCAL', 'PAUTA', 'REGISTRO'] },
  { nome: 'Ata de Assembleia Geral Extraordinária', tipo: 'ATA', finalidade: 'ATA_AGE', perfil: 'ATA_ASSEMBLEIA', livro: true, corpo: corpoAta, campos: ['LOCAL', 'PAUTA', 'REGISTRO'] },
  { nome: 'Convocação', tipo: 'OUTRO', finalidade: 'CONVOCACAO', perfil: 'CORRESPONDENCIA', livro: false, corpo: 'Convocamos {{DESTINATARIOS}} para reunião em {{DATA_PREVISTA_REUNIAO}}, às {{HORARIO_PREVISTO_REUNIAO}}, em {{LOCAL_REUNIAO}}, para tratar de {{PAUTA_REUNIAO}}.', campos: ['DESTINATARIOS', 'DATA_PREVISTA_REUNIAO', 'HORARIO_PREVISTO_REUNIAO', 'LOCAL_REUNIAO', 'PAUTA_REUNIAO'] },
  { nome: 'Relatório', tipo: 'OUTRO', finalidade: 'RELATORIO', perfil: 'CORRESPONDENCIA', livro: false, corpo: 'Período: {{PERIODO}}.\nAtividades: {{ATIVIDADES}}.\nResultados: {{RESULTADOS}}.', campos: ['PERIODO', 'ATIVIDADES', 'RESULTADOS'] },
  { nome: 'Ofício', tipo: 'OUTRO', finalidade: 'OFICIO', perfil: 'CORRESPONDENCIA', livro: false, corpo: 'A {{DESTINATARIO}}.\nAssunto: {{ASSUNTO}}.\n{{MENSAGEM}}\nAtenciosamente,', campos: ['DESTINATARIO', 'ASSUNTO', 'MENSAGEM'] },
  { nome: 'Carta', tipo: 'OUTRO', finalidade: 'CARTA', perfil: 'CORRESPONDENCIA', livro: false, corpo: 'A {{DESTINATARIO}}.\n{{MENSAGEM}}\nCordialmente,', campos: ['DESTINATARIO', 'MENSAGEM'] },
  { nome: 'Termo de abertura', tipo: 'OUTRO', finalidade: 'TERMO_ABERTURA', perfil: 'TERMO', livro: false, corpo: 'Abre-se o Livro nº {{NUMERO_LIVRO}}, com {{CAPACIDADE_FOLHAS_LIVRO}} folhas, destinado ao registro das atas de {{TITULAR_LIVRO}}. Secretário responsável: {{NOME_SECRETARIO_LIVRO}}.', campos: ['NUMERO_LIVRO', 'CAPACIDADE_FOLHAS_LIVRO', 'TITULAR_LIVRO', 'NOME_SECRETARIO_LIVRO'] },
  { nome: 'Termo de exame', tipo: 'OUTRO', finalidade: 'TERMO_EXAME', perfil: 'TERMO', livro: false, corpo: 'Exame realizado por {{AUTORIDADE}}.\nObservações: {{OBSERVACOES}}.', campos: ['AUTORIDADE', 'OBSERVACOES'] },
  { nome: 'Termo de encerramento', tipo: 'OUTRO', finalidade: 'TERMO_ENCERRAMENTO', perfil: 'TERMO', livro: false, corpo: 'Encerra-se o Livro nº {{NUMERO_LIVRO}} de {{TITULAR}}, com {{FOLHAS_UTILIZADAS}} folhas utilizadas e {{TOTAL_ATAS}} atas registradas.', campos: ['NUMERO_LIVRO', 'TITULAR', 'FOLHAS_UTILIZADAS', 'TOTAL_ATAS'] },
] as const
export const tiposEspecificos = [
  ['CONVOCACAO', 'Convocação'],
  ['TERMO_ABERTURA', 'Termo de abertura'], ['TERMO_EXAME', 'Termo de exame'],
  ['TERMO_ENCERRAMENTO', 'Termo de encerramento'], ['RETIFICACAO', 'Retificação'],
] as const

export function nomeFinalidade(codigo: string) {
  return tiposEspecificos.find(([id]) => id === codigo)?.[1] ?? biblioteca.find(m => m.finalidade === codigo)?.nome ?? codigo
}
