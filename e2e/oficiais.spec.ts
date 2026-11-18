import { test, expect } from '@playwright/test'

test('consulta oficiais e exercício com a funcionalidade habilitada', async ({ page }) => {
  test.skip(process.env.VITE_FEATURE_GOVERNANCA !== 'true', 'A consulta exige a chave de governança na compilação.')
  const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4179', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,x-provisao-request', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }
  const oficialId = 'd0000000-0000-4000-8000-000000000001'
  let criacao: unknown
  let ordenacao: unknown
  let conferencia: unknown
  let mandato: unknown
  let historico: unknown
  await page.route('http://localhost:3000/**', route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const url = new URL(route.request().url())
    if (url.pathname === '/auth/profile') return route.fulfill({ headers, json: { sub: 'u', igreja_id: 'i', perfil: 'ADMINISTRADOR', username: 'Secretário', login: 's@example.invalid' } })
    if (url.pathname === '/pessoas') return route.fulfill({ headers, json: [{ id: 'p', nome_completo: 'Pessoa Sintética' }] })
    if (url.pathname === '/oficiais' && route.request().method() === 'POST') { criacao = route.request().postDataJSON(); return route.fulfill({ status: 201, headers, json: { id: 'novo' } }) }
    if (url.pathname === '/oficiais') return route.fulfill({ headers, json: { itens: [{ id: oficialId, tipo: 'DIACONO', pessoa: { id: 'p', nome_completo: 'Pessoa Sintética' } }], proximo_cursor: null } })
    if (url.pathname === `/oficiais/${oficialId}/acervo-historico` && route.request().method() === 'POST') { historico = route.request().postDataJSON(); return route.fulfill({ status: 201, headers, json: { id: 'historico' } }) }
    if (url.pathname === `/oficiais/${oficialId}/acervo-historico`) return route.fulfill({ headers, json: [] })
    if (url.pathname === `/oficiais/${oficialId}/periodos`) return route.fulfill({ headers, json: { mandatos: [], vinculos: [] } })
    if (url.pathname === '/oficiais/politicas') return route.fulfill({ headers, json: [{ id: 'pol', versao: '1', fonte: 'Norma local', vigente_desde: '2020-01-01', vigente_ate: null }] })
    if (url.pathname === '/oficiais/conferencias/p') return route.fulfill({ headers, json: [{ id: 'conf', politica_id: 'pol', data_eleicao: '2026-01-01', mandato: null }] })
    if (url.pathname === '/oficiais/conferencias' && route.request().method() === 'POST') { conferencia = route.request().postDataJSON(); return route.fulfill({ status: 201, headers, json: { id: 'conf' } }) }
    if (url.pathname === `/oficiais/${oficialId}/mandatos` && route.request().method() === 'POST') { mandato = route.request().postDataJSON(); return route.fulfill({ status: 201, headers, json: { id: 'mandato' } }) }
    if (url.pathname === `/oficiais/${oficialId}/eventos` && route.request().method() === 'POST') { ordenacao = route.request().postDataJSON(); return route.fulfill({ status: 201, headers, json: { id: 'evento' } }) }
    if (url.pathname === '/oficiais/meu-acesso-sensivel') return route.fulfill({ headers, json: { pode_consultar: false, pode_registrar: false } })
    if (url.pathname === '/oficiais/alertas') return route.fulfill({ headers, json: [] })
    if (url.pathname === `/oficiais/${oficialId}/exercicio`) return route.fulfill({ headers, json: { situacao: 'EM_EXERCICIO', data_referencia: url.searchParams.get('data') } })
    return route.fulfill({ headers, json: [] })
  })
  await page.goto('/oficiais')
  await expect(page.getByText('Pessoa Sintética')).toBeVisible()
  await page.getByRole('button', { name: 'Consultar exercício' }).click()
  await expect(page.getByText(/Em exercício em/)).toBeVisible()
  await expect(page.getByText(/não substitui a verificação de competência/)).toBeVisible()
  await page.getByRole('button', { name: 'Registrar ofício' }).click()
  await page.getByLabel('Pessoa', { exact: true }).selectOption('p')
  await page.getByLabel('Ofício', { exact: true }).selectOption('PRESBITERO_REGENTE')
  await page.getByRole('button', { name: 'Salvar ofício' }).click()
  await expect.poll(() => criacao).toEqual({ pessoa_id: 'p', tipo: 'PRESBITERO_REGENTE' })
  await page.getByRole('button', { name: 'Gerir registros' }).click()
  await expect(page.getByText('Nenhum período registrado.')).toBeVisible()
  await page.getByLabel('Data da ordenação').fill('2026-01-01')
  await page.getByLabel('Ordem do ato no dia').fill('1')
  await page.getByLabel('Autoridade do ato').fill('Conselho')
  await page.getByLabel('Referência ou evidência').fill('Ata externa')
  await page.getByRole('button', { name: 'Salvar registro' }).click()
  await expect.poll(() => ordenacao).toEqual({ tipo: 'ORDENACAO', data_efeito: '2026-01-01', ordem: 1, autoridade: 'Conselho', evidencia: 'Ata externa' })
  await expect(page.getByRole('status')).toHaveText('Registro salvo.')
  await page.getByLabel('Operação').selectOption('conferencia')
  await page.getByLabel('Política vigente').selectOption('pol')
  await page.getByLabel('Data da eleição', { exact: true }).fill('2026-01-01')
  await page.getByLabel('Data documental da recepção').fill('2024-01-01')
  await page.getByLabel('Evidência da recepção').fill('Livro')
  await page.getByLabel('Capacidade confirmada').check()
  await page.getByLabel('Evidência da capacidade').fill('Declaração')
  await page.getByRole('button', { name: 'Salvar registro' }).click()
  await expect.poll(() => conferencia).toEqual({ pessoa_id: 'p', politica_id: 'pol', data_eleicao: '2026-01-01', data_recepcao: '2024-01-01', evidencia_recepcao: 'Livro', capacidade_confirmada: true, evidencia_capacidade: 'Declaração' })
  await page.getByLabel('Operação').selectOption('mandato')
  await page.getByLabel('Conferência da eleição').selectOption('conf')
  await page.getByLabel('Data da posse').fill('2026-02-01')
  await page.getByLabel('Evidência de capacidade na posse').fill('Declaração')
  await page.getByLabel('Autoridade do ato').fill('Assembleia')
  await page.getByLabel('Evidência do ato').fill('Ata')
  await page.getByRole('button', { name: 'Salvar registro' }).click()
  await expect.poll(() => mandato).toEqual({ conferencia_id: 'conf', data_posse: '2026-02-01', autoridade: 'Assembleia', evidencia: 'Ata', evidencia_capacidade_posse: 'Declaração' })
  await page.getByLabel('Operação').selectOption('acervo')
  await page.getByLabel('Data aproximada ou lacuna (opcional)').fill('Década de 1980')
  await page.getByLabel('Situação documental').selectOption('EXTERNO_CONFERIDO')
  await page.getByLabel('Referência externa (obrigatória se conferida)').fill('Livro histórico')
  await page.getByRole('button', { name: 'Salvar registro' }).click()
  await expect.poll(() => historico).toMatchObject({ tipo: 'ELEICAO', data_evento: null, data_descricao: 'Década de 1980', situacao_documental: 'EXTERNO_CONFERIDO', referencia_externa: 'Livro histórico', autoridade: null, idempotencia: expect.any(String) })
})


test('auditor com concessão consulta histórico restrito sem acesso de escrita', async ({ page }) => {
  test.skip(process.env.VITE_FEATURE_GOVERNANCA !== 'true', 'A consulta exige a chave de governança na compilação.')
  const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4179', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,x-provisao-request', 'Access-Control-Allow-Methods': 'GET, OPTIONS' }
  const id = 'd0000000-0000-4000-8000-000000000001'
  await page.route('http://localhost:3000/**', route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const url = new URL(route.request().url())
    if (url.pathname === '/auth/profile') return route.fulfill({ headers, json: { sub: 'aud', igreja_id: 'i', perfil: 'AUDITOR', username: 'Auditor', login: 'a@example.invalid' } })
    if (url.pathname === '/oficiais') return route.fulfill({ headers, json: { itens: [{ id, tipo: 'DIACONO', pessoa: { id: 'p', nome_completo: 'Pessoa Restrita' } }], proximo_cursor: null } })
    if (url.pathname === '/oficiais/meu-acesso-sensivel') return route.fulfill({ headers, json: { pode_consultar: true, pode_registrar: false } })
    if (url.pathname === `/oficiais/${id}/eventos-sensiveis`) return route.fulfill({ headers, json: [{ id: 'ev', tipo: 'SUSPENSAO', data_efeito: '2026-01-01', ordem: 1, autoridade: 'Conselho', evidencia: 'Ata restrita', observacoes: null, evento_restaurado_id: null }] })
    return route.fulfill({ headers, json: [] })
  })
  await page.goto('/oficiais')
  await page.getByRole('button', { name: 'Eventos restritos' }).click()
  await expect(page.getByText('Evidência: Ata restrita')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Registrar evento' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Registrar ofício' })).toHaveCount(0)
})

test('administrador concede acesso específico a outro usuário', async ({ page }) => {
  test.skip(process.env.VITE_FEATURE_GOVERNANCA !== 'true', 'A consulta exige a chave de governança na compilação.')
  const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4179', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,x-provisao-request', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }
  let enviado: unknown
  await page.route('http://localhost:3000/**', route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const path = new URL(route.request().url()).pathname
    if (path === '/auth/profile') return route.fulfill({ headers, json: { sub: 'admin', igreja_id: 'i', perfil: 'ADMINISTRADOR', username: 'Admin', login: 'a@example.invalid' } })
    if (path === '/oficiais') return route.fulfill({ headers, json: { itens: [], proximo_cursor: null } })
    if (path === '/oficiais/alertas') return route.fulfill({ headers, json: [] })
    if (path === '/oficiais/meu-acesso-sensivel') return route.fulfill({ headers, json: { pode_consultar: false, pode_registrar: false } })
    if (path === '/usuarios') return route.fulfill({ headers, json: [{ id: 'sec', nome_usuario: 'Secretário', email_login: 's@example.invalid', perfil: 'SECRETARIO', ativo: true }] })
    if (path === '/oficiais/acessos-sensiveis' && route.request().method() === 'POST') { enviado = route.request().postDataJSON(); return route.fulfill({ status: 201, headers, json: { id: 'grant' } }) }
    if (path === '/oficiais/acessos-sensiveis') return route.fulfill({ headers, json: [] })
    return route.fulfill({ headers, json: [] })
  })
  await page.goto('/oficiais')
  await page.getByRole('button', { name: 'Gerir acessos a eventos restritos' }).click()
  await page.getByRole('combobox', { name: 'Usuário' }).selectOption('sec')
  await page.getByLabel('Consultar eventos restritos').check()
  await page.getByLabel('Fundamento da concessão').fill('Ato de autorização')
  await page.getByRole('button', { name: 'Conceder acesso' }).click()
  await expect.poll(() => enviado).toEqual({ usuario_id: 'sec', pode_consultar: true, pode_registrar: false, fundamento: 'Ato de autorização' })
  await expect(page.getByRole('status')).toHaveText('Acesso concedido.')
})

test('correção de data exige prévia e confirmação explícita', async ({ page }) => {
  test.skip(process.env.VITE_FEATURE_GOVERNANCA !== 'true', 'A consulta exige a chave de governança na compilação.')
  const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4179', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,x-provisao-request', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }
  const id = 'd0000000-0000-4000-8000-000000000001', hash = 'a'.repeat(64)
  let aplicado: unknown
  await page.route('http://localhost:3000/**', route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const url = new URL(route.request().url())
    if (url.pathname === '/auth/profile') return route.fulfill({ headers, json: { sub: 'u', igreja_id: 'i', perfil: 'SECRETARIO', username: 'Secretário', login: 's@example.invalid' } })
    if (url.pathname === '/oficiais') return route.fulfill({ headers, json: { itens: [{ id, tipo: 'DIACONO', pessoa: { id: 'p', nome_completo: 'Pessoa Teste' } }], proximo_cursor: null } })
    if (url.pathname === '/oficiais/meu-acesso-sensivel') return route.fulfill({ headers, json: { pode_consultar: true, pode_registrar: true } })
    if (url.pathname === '/oficiais/alertas' || url.pathname === `/oficiais/${id}/eventos-sensiveis` || url.pathname === `/oficiais/${id}/correcoes-data`) return route.fulfill({ headers, json: [] })
    if (url.pathname === '/oficiais/pessoas/p/eventos-para-ordem') return route.fulfill({ headers, json: [{ id: 'evento', tipo_evento: 'ADMISSAO', data_evento: '2024-01-01', rol: 'COMUNGANTES' }] })
    if (url.pathname.endsWith('/correcoes-data/previa')) return route.fulfill({ headers, json: { hash, data_anterior: '2024-01-01', data_nova: '2024-01-02', bloqueada: false, observacao: 'Comparação de rol.', mandatos: [], conferencias: [] } })
    if (url.pathname.endsWith('/correcoes-data/aplicar')) { aplicado = route.request().postDataJSON(); return route.fulfill({ status: 201, headers, json: { id: 'correcao' } }) }
    return route.fulfill({ headers, json: [] })
  })
  await page.goto('/oficiais')
  await page.getByRole('button', { name: 'Eventos restritos' }).click()
  await page.getByRole('button', { name: 'Conferir correção de data de membresia' }).click()
  await page.getByLabel('Evento de membresia').selectOption('evento')
  await page.getByLabel('Data corrigida').fill('2024-01-02')
  await expect(page.getByRole('button', { name: 'Confirmar correção' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Gerar prévia' }).click()
  await expect(page.getByText('Comparação de rol.')).toBeVisible()
  await page.getByLabel('Justificativa').fill('Livro conferido')
  await page.getByLabel('Autoridade que determinou a correção').fill('Conselho')
  await page.getByLabel('Evidência da correção').fill('Livro')
  await page.getByLabel('Conferi a prévia e a evidência.').check()
  await page.getByRole('button', { name: 'Confirmar correção' }).click()
  await expect.poll(() => aplicado).toMatchObject({ evento_id: 'evento', nova_data: '2024-01-02', hash_previa: hash, justificativa: 'Livro conferido', autoridade: 'Conselho', evidencia: 'Livro', ciente: true, idempotencia: expect.any(String) })
})

test('referência pastoral usa código exibido uma vez e confirmação local', async ({ page }) => {
  test.skip(process.env.VITE_FEATURE_GOVERNANCA !== 'true', 'A consulta exige a chave de governança na compilação.')
  const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4179', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,x-provisao-request', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }
  const id = 'd0000000-0000-4000-8000-000000000001', codigo = 'a'.repeat(64)
  let recebido: unknown, ligado = false
  await page.route('http://localhost:3000/**', route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const url = new URL(route.request().url()), path = url.pathname
    if (path === '/auth/profile') return route.fulfill({ headers, json: { sub: 'u', igreja_id: 'i', perfil: 'SECRETARIO', username: 'Secretário', login: 's@example.invalid' } })
    if (path === '/igrejas') return route.fulfill({ headers, json: [{ id: 'i', nome: 'Igreja A' }, { id: 'j', nome: 'Igreja B' }] })
    if (path === '/oficiais') return route.fulfill({ headers, json: { itens: [{ id, tipo: 'PRESBITERO_DOCENTE', pessoa: { id: 'p', nome_completo: 'Docente Sintético' } }], proximo_cursor: null } })
    if (path === '/oficiais/meu-acesso-sensivel') return route.fulfill({ headers, json: { pode_consultar: false, pode_registrar: false } })
    if (path === '/oficiais/alertas' || path === `/oficiais/${id}/acervo-historico`) return route.fulfill({ headers, json: [] })
    if (path === `/oficiais/${id}/periodos`) return route.fulfill({ headers, json: { mandatos: [], vinculos: [] } })
    if (path === `/oficiais/${id}/identidade-pastoral`) return route.fulfill({ headers, json: { referencia: ligado ? { id: 'ref', criado_em: '2026-01-01T00:00:00Z' } : null } })
    if (path === `/oficiais/${id}/identidade-pastoral/convites`) return route.fulfill({ status: 201, headers, json: { codigo, expira_em: '2099-01-01T00:00:00Z' } })
    if (path === `/oficiais/${id}/identidade-pastoral/receber`) { recebido = route.request().postDataJSON(); ligado = true; return route.fulfill({ status: 201, headers, json: { id: 'ref' } }) }
    return route.fulfill({ headers, json: [] })
  })
  await page.goto('/oficiais')
  await page.getByRole('button', { name: 'Gerir registros' }).click()
  await page.getByRole('button', { name: 'Referência entre igrejas' }).click()
  const convite = page.locator('form').filter({ has: page.getByRole('heading', { name: 'Criar código para outra igreja' }) })
  await convite.getByLabel('Igreja destinatária').selectOption('j')
  await convite.getByLabel('Autoridade local').fill('Conselho')
  await convite.getByLabel('Evidência da autorização').fill('Ata')
  await convite.getByRole('button', { name: 'Criar código' }).click()
  await expect(page.getByText(codigo)).toBeVisible()
  await page.getByRole('button', { name: 'Ocultar código' }).click()
  await expect(page.getByText(codigo)).toHaveCount(0)
  const confirmar = page.locator('form').filter({ has: page.getByRole('heading', { name: 'Confirmar código recebido' }) })
  await confirmar.getByLabel('Código recebido').fill(codigo)
  await confirmar.getByLabel('Autoridade local').fill('Conselho')
  await confirmar.getByLabel('Evidência da conferência').fill('Ata')
  await confirmar.getByRole('button', { name: 'Confirmar referência' }).click()
  await expect.poll(() => recebido).toEqual({ codigo, autoridade: 'Conselho', evidencia: 'Ata' })
  await expect(page.getByText('Referência local registrada.')).toBeVisible()
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(codigo)
})

test('avisos internos exigem configuração e destinatário escolhido', async ({ page }) => {
  test.skip(process.env.VITE_FEATURE_GOVERNANCA !== 'true', 'A consulta exige a chave de governança na compilação.')
  const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4179', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,x-provisao-request', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS' }
  let politica: Record<string, unknown> | null = null, adicionado: unknown, lido = false
  await page.route('http://localhost:3000/**', route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const path = new URL(route.request().url()).pathname, method = route.request().method()
    if (path === '/auth/profile') return route.fulfill({ headers, json: { sub: 'admin', igreja_id: 'i', perfil: 'ADMINISTRADOR', username: 'Admin', login: 'a@example.invalid' } })
    if (path === '/oficiais') return route.fulfill({ headers, json: { itens: [], proximo_cursor: null } })
    if (path === '/oficiais/alertas' || path === '/oficiais/acessos-sensiveis') return route.fulfill({ headers, json: [] })
    if (path === '/oficiais/meu-acesso-sensivel') return route.fulfill({ headers, json: { pode_consultar: false, pode_registrar: false } })
    if (path === '/oficiais/notificacoes') return route.fulfill({ headers, json: [{ id: 'aviso', nome: 'Pessoa Sintética', tipo: 'DIACONO', data_termino: '2030-12-31', lido_em: lido ? '2026-01-01T00:00:00Z' : null }] })
    if (path === '/oficiais/notificacoes/aviso/lida') { lido = true; return route.fulfill({ headers, json: { lida: true } }) }
    if (path === '/oficiais/configuracao-alertas' && method === 'POST') { politica = { ...route.request().postDataJSON(), atualizado_em: '2026-01-01T00:00:00Z' }; return route.fulfill({ status: 201, headers, json: politica }) }
    if (path === '/oficiais/configuracao-alertas') return route.fulfill({ headers, json: { politica, destinatarios: [], execucao: null } })
    if (path === '/usuarios') return route.fulfill({ headers, json: [{ id: 'sec', nome_usuario: 'Secretário', email_login: 's@example.invalid', perfil: 'SECRETARIO', ativo: true }] })
    if (path === '/oficiais/destinatarios-alertas') { adicionado = route.request().postDataJSON(); return route.fulfill({ status: 201, headers, json: { id: 'inscricao' } }) }
    return route.fulfill({ headers, json: [] })
  })
  await page.goto('/oficiais')
  await expect(page.getByText(/Pessoa Sintética — término/)).toBeVisible()
  await expect(page.getByLabel('1 aviso não lido')).toBeVisible()
  await page.getByRole('button', { name: 'Marcar como lido' }).click()
  await expect(page.getByLabel('1 aviso não lido')).toHaveCount(0)
  await expect(page.getByText(/Pessoa Sintética — término.*\(lido\)/)).toBeVisible()
  await page.getByRole('button', { name: 'Configurar avisos de mandatos' }).click()
  await page.getByLabel('Habilitar avisos').check()
  await page.getByLabel('Dias de antecedência').fill('90')
  await page.getByLabel('Dias após o término').fill('15')
  await page.getByLabel('Fuso horário IANA').fill('America/Sao_Paulo')
  await page.getByLabel('Autoridade da configuração').fill('Conselho')
  await page.getByLabel('Fundamento da configuração').fill('Ata externa')
  await page.getByRole('button', { name: 'Salvar configuração' }).click()
  await expect.poll(() => politica).toMatchObject({ ativo: true, dias_antecedencia: 90, dias_apos_termino: 15, fuso_iana: 'America/Sao_Paulo', autoridade: 'Conselho', fundamento: 'Ata externa' })
  await page.getByRole('combobox', { name: 'Destinatário' }).selectOption('sec')
  await page.getByRole('button', { name: 'Adicionar destinatário' }).click()
  await expect.poll(() => adicionado).toEqual({ usuario_id: 'sec' })
})

test('ordenação do mesmo dia exige sequência explícita e prévia', async ({ page }) => {
  test.skip(process.env.VITE_FEATURE_GOVERNANCA !== 'true', 'A consulta exige a chave de governança na compilação.')
  const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4179', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,x-provisao-request', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }
  const id = 'd0000000-0000-4000-8000-000000000001', hash = 'b'.repeat(64)
  let aplicado: unknown
  await page.route('http://localhost:3000/**', route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const path = new URL(route.request().url()).pathname
    if (path === '/auth/profile') return route.fulfill({ headers, json: { sub: 'u', igreja_id: 'i', perfil: 'SECRETARIO', username: 'Secretário', login: 's@example.invalid' } })
    if (path === '/oficiais') return route.fulfill({ headers, json: { itens: [{ id, tipo: 'DIACONO', pessoa: { id: 'p', nome_completo: 'Pessoa Teste' } }], proximo_cursor: null } })
    if (path === '/oficiais/meu-acesso-sensivel') return route.fulfill({ headers, json: { pode_consultar: true, pode_registrar: true } })
    if (path === '/oficiais/alertas' || path === '/oficiais/notificacoes' || path === `/oficiais/${id}/eventos-sensiveis` || path === `/oficiais/${id}/ordenacoes-dia`) return route.fulfill({ headers, json: [] })
    if (path === '/oficiais/pessoas/p/eventos-para-ordem') return route.fulfill({ headers, json: [{ id: 'evento-1', tipo_evento: 'ADMISSAO', data_evento: '2024-01-01', ordem_dia: null, rol: 'NAO_COMUNGANTES' }, { id: 'evento-2', tipo_evento: 'MUDANCA_DE_ROL', data_evento: '2024-01-01', ordem_dia: null, rol: 'COMUNGANTES' }] })
    if (path.endsWith('/ordenacoes-dia/previa')) return route.fulfill({ headers, json: { hash, data_evento: '2024-01-01', itens: [], bloqueada: false, observacao: 'Sequência conferida.', inconsistencias_rol_origem: [], mandatos: [] } })
    if (path.endsWith('/ordenacoes-dia/aplicar')) { aplicado = route.request().postDataJSON(); return route.fulfill({ status: 201, headers, json: { id: 'ordem' } }) }
    return route.fulfill({ headers, json: [] })
  })
  await page.goto('/oficiais')
  await page.getByRole('button', { name: 'Eventos restritos' }).click()
  await page.getByRole('button', { name: 'Conferir ordem de atos no mesmo dia' }).click()
  await page.getByLabel('Data com atos a ordenar').selectOption('2024-01-01')
  const primeira = page.getByLabel(/Ordem para ADMISSAO/), segunda = page.getByLabel(/Ordem para MUDANCA_DE_ROL/)
  await expect(primeira).toHaveValue(''); await expect(segunda).toHaveValue('')
  await primeira.fill('1'); await segunda.fill('2')
  await page.getByRole('button', { name: 'Gerar prévia da ordem' }).click()
  await expect(page.getByText('Sequência conferida.')).toBeVisible()
  await page.getByLabel('Justificativa da sequência').fill('Livro conferido')
  await page.getByLabel('Autoridade da sequência').fill('Conselho')
  await page.getByLabel('Evidência da sequência').fill('Livro')
  await page.getByLabel('Conferi a sequência e o impacto.').check()
  await page.getByRole('button', { name: 'Confirmar ordem' }).click()
  await expect.poll(() => aplicado).toMatchObject({ data_evento: '2024-01-01', itens: [{ evento_id: 'evento-1', ordem: 1 }, { evento_id: 'evento-2', ordem: 2 }], hash_previa: hash, justificativa: 'Livro conferido', autoridade: 'Conselho', evidencia: 'Livro', ciente: true, idempotencia: expect.any(String) })
})

test('rol não aplica evento futuro e sinaliza atos simultâneos sem ordem', async ({ page }) => {
  const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4179', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,x-provisao-request', 'Access-Control-Allow-Methods': 'GET, OPTIONS' }
  await page.route('http://localhost:3000/**', route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const path = new URL(route.request().url()).pathname
    if (path === '/auth/profile') return route.fulfill({ headers, json: { sub: 'u', igreja_id: 'i', perfil: 'SECRETARIO', username: 'Secretário', login: 's@example.invalid' } })
    if (path === '/pessoas') return route.fulfill({ headers, json: [{ id: 'a', nome_completo: 'Alice Futura', data_nascimento: '1990-01-01', sexo: 'FEMININO' }, { id: 'b', nome_completo: 'Bruno Ambíguo', data_nascimento: '1990-01-01', sexo: 'MASCULINO' }] })
    if (path === '/eventos-membresia') return route.fulfill({ headers, json: [
      { id: 'f', pessoa_id: 'a', tipo_evento: 'DEMISSAO', rol: 'EXCLUIDOS', motivacao_evento: 'EXCLUSAO_A_PEDIDO', data_evento: '2099-01-01', ordem_dia: null },
      { id: 'a', pessoa_id: 'a', tipo_evento: 'ADMISSAO', rol: 'COMUNGANTES', motivacao_evento: 'PROFISSAO_DE_FE', data_evento: '2020-01-01', ordem_dia: null },
      { id: 'b1', pessoa_id: 'b', tipo_evento: 'ADMISSAO', rol: 'COMUNGANTES', motivacao_evento: 'PROFISSAO_DE_FE', data_evento: '2020-01-01', ordem_dia: null },
      { id: 'b2', pessoa_id: 'b', tipo_evento: 'DEMISSAO', rol: 'EXCLUIDOS', motivacao_evento: 'EXCLUSAO_A_PEDIDO', data_evento: '2020-01-01', ordem_dia: null },
    ] })
    return route.fulfill({ headers, json: [] })
  })
  await page.goto('/rol-membros')
  await expect(page.getByRole('row').filter({ hasText: 'Alice Futura' })).toContainText('Comungantes')
  await expect(page.getByRole('row').filter({ hasText: 'Bruno Ambíguo' })).toContainText('Histórico indeterminado')
})

test('decisão formal autoriza apenas prévia eleitoral e mantém sinalização de revisão', async ({ page }) => {
  test.skip(process.env.VITE_FEATURE_GOVERNANCA !== 'true', 'A consulta exige a chave de governança na compilação.')
  const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4179', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,x-provisao-request', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }
  const id = 'd0000000-0000-4000-8000-000000000001', hash = 'c'.repeat(64)
  let decisao: unknown, aplicado: unknown
  await page.route('http://localhost:3000/**', route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const path = new URL(route.request().url()).pathname, method = route.request().method()
    if (path === '/auth/profile') return route.fulfill({ headers, json: { sub: 'u', igreja_id: 'i', perfil: 'SECRETARIO', username: 'Secretário', login: 's@example.invalid' } })
    if (path === '/oficiais') return route.fulfill({ headers, json: { itens: [{ id, tipo: 'DIACONO', pessoa: { id: 'p', nome_completo: 'Pessoa Teste' } }], proximo_cursor: null } })
    if (path === '/oficiais/meu-acesso-sensivel') return route.fulfill({ headers, json: { pode_consultar: true, pode_registrar: true } })
    if (path === '/oficiais/pessoas/p/eventos-para-ordem') return route.fulfill({ headers, json: [{ id: 'evento', tipo_evento: 'ADMISSAO', data_evento: '2024-01-01', ordem_dia: null, rol: 'COMUNGANTES' }] })
    if (path === '/oficiais/pessoas/p/correcoes-data/previa') return route.fulfill({ headers, json: { hash, data_anterior: '2024-01-01', data_nova: '2024-03-01', bloqueada: true, origens_invalidadas: [], observacao: 'Há impacto eleitoral.', mandatos: [], conferencias: [] } })
    if (path === '/oficiais/pessoas/p/revisoes-eleitorais' && method === 'POST') { decisao = route.request().postDataJSON(); return route.fulfill({ status: 201, headers, json: { id: 'decisao' } }) }
    if (path === '/oficiais/pessoas/p/correcoes-data/aplicar') { aplicado = route.request().postDataJSON(); return route.fulfill({ status: 201, headers, json: { id: 'correcao' } }) }
    return route.fulfill({ headers, json: [] })
  })
  await page.goto('/oficiais')
  await page.getByRole('button', { name: 'Eventos restritos' }).click()
  await page.getByRole('button', { name: 'Conferir correção de data de membresia' }).click()
  await page.getByLabel('Evento de membresia').selectOption('evento')
  await page.getByLabel('Data corrigida').fill('2024-03-01')
  await page.getByRole('button', { name: 'Gerar prévia', exact: true }).click()
  await expect(page.getByText('Há impacto eleitoral.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confirmar correção' })).toHaveCount(0)
  await page.getByLabel('Autoridade da decisão eleitoral').fill('Concílio')
  await page.getByLabel('Evidência da decisão eleitoral').fill('Ata formal')
  await page.getByLabel('Fundamento da decisão eleitoral').fill('Autoriza correção e revisão')
  await page.getByLabel('A autoridade autorizou esta correção e a revisão dos atos afetados.').check()
  await page.getByRole('button', { name: 'Registrar decisão formal' }).click()
  await expect.poll(() => decisao).toMatchObject({ operacao: 'DATA', hash_previa: hash, autoridade: 'Concílio', evidencia: 'Ata formal', proposta: { evento_id: 'evento', nova_data: '2024-03-01' }, ciente: true })
  await page.getByLabel('Justificativa', { exact: true }).fill('Livro conferido')
  await page.getByLabel('Autoridade que determinou a correção').fill('Conselho')
  await page.getByLabel('Evidência da correção').fill('Livro')
  await page.getByLabel('Conferi a prévia e a evidência.').check()
  await page.getByRole('button', { name: 'Confirmar correção' }).click()
  await expect.poll(() => aplicado).toMatchObject({ evento_id: 'evento', nova_data: '2024-03-01', hash_previa: hash, decisao_id: 'decisao' })
})
