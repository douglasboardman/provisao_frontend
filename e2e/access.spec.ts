import { test, expect } from '@playwright/test'

test('visitante é redirecionado ao login e vê validação', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login$/)
  await page.getByRole('button', { name: /log in/i }).click()
  await expect(page.getByText('Informe sua senha.')).toBeVisible()
  await expect(page.getByText('Informe um e-mail válido.')).toBeVisible()
})

test('login envia a igreja selecionada junto ao e-mail', async ({ page }) => {
  const igreja = 'e0000000-0000-4000-8000-000000000001'
  await page.route(/\/igrejas(?:\?cadastro=1)?$/, route => route.fulfill({ json: [{ id: igreja, nome: 'Igreja Alfa' }], headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4179', 'Access-Control-Allow-Credentials': 'true' } }))
  let requestBody: Record<string, string> | undefined
  await page.route('**/auth/login', async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4179', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type,x-provisao-request' } })
    requestBody = route.request().postDataJSON()
    await route.fulfill({ status: 401, json: { statusCode: 401, message: 'Credenciais inválidas.' }, headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4179', 'Access-Control-Allow-Credentials': 'true' } })
  })
  await page.goto('/login')
  await page.getByLabel('Igreja').selectOption(igreja)
  await page.getByPlaceholder('E-mail').fill('teste@example.invalid')
  await page.getByPlaceholder('Senha').fill('senha')
  await page.getByRole('button', { name: /log in/i }).click()
  await expect(page.getByText('Credenciais inválidas.')).toBeVisible()
  expect(requestBody).toEqual({ igreja_id: igreja, login: 'teste@example.invalid', senha: 'senha' })
})

test('restaura perfil ao recarregar sem salvar token no navegador', async ({ page }) => {
  const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4179', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,x-provisao-request', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }
  await page.route('**/auth/profile', route => route.request().method() === 'OPTIONS'
    ? route.fulfill({ status: 204, headers })
    : route.fulfill({ headers, json: { sub: 'u', igreja_id: 'i', perfil: 'ADMINISTRADOR', username: 'Teste', login: 'teste@example.invalid' } }))
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByText('Teste').first()).toBeVisible()
  await page.reload()
  await expect(page.getByText('Teste').first()).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('provisao_token'))).toBeNull()
})

test('administrador confirma vínculo de pessoa', async ({ page }) => {
  const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4179', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,x-provisao-request', 'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS' }
  let linked: unknown
  await page.route('http://localhost:3000/**', async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const path = new URL(route.request().url()).pathname
    if (path === '/auth/profile') return route.fulfill({ headers, json: { sub: 'admin', igreja_id: 'igreja', perfil: 'ADMINISTRADOR', username: 'Admin', login: 'admin@example.invalid' } })
    if (path === '/usuarios/indicadores-fila') return route.fulfill({ headers, json: { pendentes: 0, processando: 0, falhas: 0, mais_antigo_pendente: null, falhas_recentes: [] } })
    if (path === '/usuarios' && route.request().method() === 'GET') return route.fulfill({ headers, json: [{ id: 'conta', nome_usuario: 'Conta Teste', email_login: 'conta@example.invalid', perfil: 'OPERADOR', ativo: true, pessoa_id: null }] })
    if (path === '/pessoas') return route.fulfill({ headers, json: [{ id: 'pessoa', nome_completo: 'Pessoa Teste' }] })
    if (path === '/usuarios/conta/pessoa') { linked = route.request().postDataJSON(); return route.fulfill({ headers, json: { pessoa_id: 'pessoa' } }) }
    return route.fulfill({ headers, json: [] })
  })
  await page.goto('/usuarios')
  await page.getByTitle('Vincular pessoa').click()
  await page.getByLabel('Pessoa', { exact: true }).click()
  await page.getByRole('option', { name: 'Pessoa Teste' }).click()
  await page.getByRole('button', { name: 'Salvar vínculo' }).click()
  await expect.poll(() => linked).toEqual({ pessoa_id: 'pessoa' })
})

test('abrir confirmação não consome token até ação explícita', async ({ page }) => {
  let calls = 0
  const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4179', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,x-provisao-request', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
  await page.route('**/auth/confirm-access', route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    calls++
    return route.fulfill({ headers, json: { message: 'E-mail confirmado.' } })
  })
  await page.goto(`/auth/confirm-access?token=${'a'.repeat(64)}`)
  await expect(page.getByRole('button', { name: 'Confirmar solicitação' })).toBeVisible()
  expect(calls).toBe(0)
  await page.getByRole('button', { name: 'Confirmar solicitação' }).click()
  await expect(page.getByText('E-mail confirmado. Sua solicitação aguarda análise.')).toBeVisible()
  expect(calls).toBe(1)
})

test('login solicita código somente na segunda etapa', async ({ page }) => {
  const church = 'e0000000-0000-4000-8000-000000000001'
  const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4179', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,x-provisao-request', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }
  let payload: unknown
  await page.route('http://localhost:3000/**', route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const url = new URL(route.request().url())
    if (url.pathname === '/igrejas') return route.fulfill({ headers, json: [{ id: church, nome: 'Igreja Alfa' }] })
    if (url.pathname === '/auth/login') {
      payload = route.request().postDataJSON()
      const code = (payload as Record<string, string>).mfa_code
      return route.fulfill({ status: 401, headers, json: code
        ? { statusCode: 401, message: 'Código inválido ou temporariamente bloqueado.' }
        : { statusCode: 401, code: 'MFA_REQUIRED', message: 'Código de autenticação necessário.' } })
    }
    return route.fulfill({ status: 404, headers })
  })
  await page.goto('/login')
  await expect(page.getByLabel('Código de autenticação', { exact: true })).toHaveCount(0)
  await page.getByLabel('Igreja').selectOption(church)
  await page.getByPlaceholder('E-mail').fill('teste@example.invalid')
  await page.getByPlaceholder('Senha').fill('senha')
  await page.getByRole('button', { name: /log in/i }).click()
  await expect(page.getByLabel('Igreja')).toHaveCount(0)
  await expect(page.getByPlaceholder('E-mail')).toHaveCount(0)
  await expect(page.getByPlaceholder('Senha')).toHaveCount(0)
  await page.getByLabel('Código de autenticação', { exact: true }).fill('123456')
  await page.getByRole('button', { name: 'Confirmar código' }).click()
  await expect(page.getByText('Código inválido ou temporariamente bloqueado.')).toBeVisible()
  expect(payload).toEqual({ igreja_id: church, login: 'teste@example.invalid', senha: 'senha', mfa_code: '123456' })
})

test('configuração de MFA apresenta códigos de recuperação após ativação', async ({ page }) => {
  const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4179', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,x-provisao-request', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }
  await page.route('http://localhost:3000/**', route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const path = new URL(route.request().url()).pathname
    if (path === '/auth/profile') return route.fulfill({ headers, json: { sub: 'admin', igreja_id: 'igreja', perfil: 'ADMINISTRADOR', username: 'Admin', login: 'admin@example.invalid' } })
    if (path === '/auth/mfa') return route.fulfill({ headers, json: { enabled: false } })
    if (path === '/auth/mfa/setup') return route.fulfill({ headers, json: { secret: 'CHAVEDETESTE', uri: 'otpauth://totp/teste' } })
    if (path === '/auth/mfa/activate') return route.fulfill({ headers, json: { recovery_codes: ['0123456789abcdef01234567'] } })
    if (path === '/oficiais/notificacoes') return route.fulfill({ headers, json: [] })
    return route.fulfill({ headers, json: {} })
  })
  await page.goto('/configuracoes')
  await page.getByRole('button', { name: 'Autenticação' }).click()
  await page.getByLabel('Confirme sua senha').fill('senha-sintetica')
  await page.getByRole('button', { name: 'Iniciar configuração' }).click()
  await expect(page.getByText('CHAVEDETESTE')).toBeVisible()
  await page.getByLabel('Código de seis dígitos').fill('123456')
  await page.getByRole('button', { name: 'Ativar autenticação' }).click()
  await expect(page.getByText('0123456789abcdef01234567')).toBeVisible()
})

test('administrador sem MFA obrigatório é conduzido à configuração', async ({ page }) => {
  const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4179', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,x-provisao-request', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }
  await page.route('http://localhost:3000/**', route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const path = new URL(route.request().url()).pathname
    if (path === '/auth/profile') return route.fulfill({ headers, json: { sub: 'admin', igreja_id: 'igreja', perfil: 'ADMINISTRADOR', username: 'Admin', login: 'admin@example.invalid', mfa_enrollment_required: true } })
    if (path === '/auth/mfa') return route.fulfill({ headers, json: { enabled: false, required: true } })
    return route.fulfill({ status: 403, headers })
  })
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/mfa-obrigatorio$/)
  await expect(page.getByRole('button', { name: 'Iniciar configuração' })).toBeVisible()
})

test('renovação de MFA pede confirmação de um código novo', async ({ page }) => {
  const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4179', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,x-provisao-request', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }
  const newCode = 'abcdef0123456789abcdef01'
  let confirmed: unknown
  await page.route('http://localhost:3000/**', route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const path = new URL(route.request().url()).pathname
    if (path === '/auth/profile') return route.fulfill({ headers, json: { sub: 'admin', igreja_id: 'igreja', perfil: 'ADMINISTRADOR', username: 'Admin', login: 'admin@example.invalid' } })
    if (path === '/auth/mfa') return route.fulfill({ headers, json: { enabled: true, required: false } })
    if (path === '/auth/mfa/recovery') return route.fulfill({ headers, json: { recovery_codes: [newCode] } })
    if (path === '/auth/mfa/recovery/confirm') { confirmed = route.request().postDataJSON(); return route.fulfill({ headers, json: { message: 'Confirmado' } }) }
    if (path === '/oficiais/notificacoes') return route.fulfill({ headers, json: [] })
    return route.fulfill({ headers, json: {} })
  })
  await page.goto('/configuracoes')
  await page.getByRole('button', { name: 'Autenticação' }).click()
  await page.getByLabel('Confirme sua senha').fill('senha-sintetica')
  await page.getByLabel('Código do autenticador ou de recuperação').fill('123456')
  await page.getByRole('button', { name: 'Renovar códigos de recuperação' }).click()
  await expect(page.getByText(/os demais códigos anteriores permanecem válidos/i)).toBeVisible()
  expect(confirmed).toBeUndefined()
  await page.getByLabel('Um código novo').fill(newCode)
  await page.getByRole('button', { name: 'Confirmar novos códigos' }).click()
  await expect.poll(() => confirmed).toEqual({ codigo: newCode })
})

test('sessão recente com último código permite preparar novo lote usando a senha', async ({ page }) => {
  const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4179', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,x-provisao-request', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }
  let payload: unknown
  await page.route('http://localhost:3000/**', route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const path = new URL(route.request().url()).pathname
    if (path === '/auth/profile') return route.fulfill({ headers, json: { sub: 'admin', igreja_id: 'igreja', perfil: 'ADMINISTRADOR', username: 'Admin', login: 'admin@example.invalid', mfa_recovery_recent: true } })
    if (path === '/auth/mfa') return route.fulfill({ headers, json: { enabled: true, required: true } })
    if (path === '/auth/mfa/recovery') { payload = route.request().postDataJSON(); return route.fulfill({ headers, json: { recovery_codes: ['abcdef0123456789abcdef01'] } }) }
    if (path === '/oficiais/notificacoes') return route.fulfill({ headers, json: [] })
    return route.fulfill({ headers, json: {} })
  })
  await page.goto('/configuracoes')
  await page.getByRole('button', { name: 'Autenticação' }).click()
  await page.getByLabel('Confirme sua senha').fill('senha-sintetica')
  await page.getByRole('button', { name: 'Renovar códigos de recuperação' }).click()
  await expect(page.getByText('abcdef0123456789abcdef01')).toBeVisible()
  expect(payload).toEqual({ senha: 'senha-sintetica' })
})

test('administrador registra competência com referência institucional', async ({ page }) => {
  const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4179', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,x-provisao-request', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }
  const manager = 'e1000000-0000-4000-8000-000000000010'
  let granted: unknown
  await page.route('http://localhost:3000/**', route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const path = new URL(route.request().url()).pathname
    if (path === '/auth/profile') return route.fulfill({ headers, json: { sub: 'admin', igreja_id: 'igreja', perfil: 'ADMINISTRADOR', username: 'Admin', login: 'admin@example.invalid' } })
    if (path === '/usuarios/indicadores-fila') return route.fulfill({ headers, json: { pendentes: 1, processando: 0, falhas: 1, mais_antigo_pendente: null, falhas_recentes: [{ criado_em: '2026-11-16T00:00:00Z', tentativas: 8, tipo: 'CONVITE', destinatario: 'teste@example.invalid' }] } })
    if (path === '/usuarios') return route.fulfill({ headers, json: [{ id: manager, nome_usuario: 'Gestor Teste', email_login: 'gestor@example.invalid', perfil: 'GESTOR', ativo: true, pessoa_id: 'pessoa' }] })
    if (path === '/solicitacoes-acesso/competencias' && route.request().method() === 'POST') { granted = route.request().postDataJSON(); return route.fulfill({ headers, json: { id: 'competencia' } }) }
    return route.fulfill({ headers, json: [] })
  })
  await page.goto('/usuarios')
  await expect(page.getByText('teste@example.invalid — convite; 8 tentativas')).toBeVisible()
  await page.getByLabel('Gestor vinculado a pessoa').click()
  await page.getByRole('option', { name: 'Gestor Teste' }).click()
  await page.getByLabel('Referência da evidência institucional').fill('Ata institucional 001/2026')
  await page.getByRole('button', { name: 'Registrar competência' }).click()
  await expect.poll(() => granted).toEqual({ usuario_id: manager, referencia: 'Ata institucional 001/2026' })
})

test('cancelamento exige ação explícita e apresenta erro no próprio link', async ({ page }) => {
  let calls = 0
  const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4179', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,x-provisao-request', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
  await page.route('**/auth/cancel-access', route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    calls++
    return route.fulfill({ status: 401, headers, json: { statusCode: 401, message: 'Link expirado' } })
  })
  await page.goto(`/auth/confirm-access?token=${'a'.repeat(64)}&cancel_token=${'b'.repeat(64)}`)
  expect(calls).toBe(0)
  await page.getByRole('button', { name: 'Cancelar solicitação' }).click()
  await expect(page.getByRole('alert')).toContainText('Link inválido')
  expect(calls).toBe(1)
  await expect(page).toHaveURL(/confirm-access/)
})
