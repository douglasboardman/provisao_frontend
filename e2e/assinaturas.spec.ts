import { expect, test } from '@playwright/test'

test('abrir o convite só consulta e assinar exige baixar a matriz e consentir', async ({ page }) => {
  const token = 'a'.repeat(64)
  const hash = 'b'.repeat(64)
  const versao = '073b1785-e281-41fa-b30a-6d4ebe245091'
  const escopo = { token, versao_id: versao, manifesto_sha256: hash }
  const consentimento = 'Li e concordo em assinar esta versão.'
  const decisoes: unknown[] = []
  const headers = {
    'Access-Control-Allow-Origin': 'http://127.0.0.1:4179',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type,x-provisao-request',
  }
  await page.route('**/assinaturas/convite/*', async route => {
    const req = route.request()
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    expect(req.url()).not.toContain(token)
    expect(req.method()).toBe('POST')
    const corpo = req.postDataJSON()
    if (req.url().endsWith('/consulta')) {
      expect(corpo).toEqual({ token })
      return route.fulfill({
        headers,
        json: {
          nome: 'Nome sintético', numero: '001/2026/AG', assunto: 'Ata sintética', versao: 2,
          versao_id: versao, manifesto_sha256: hash, matriz_sha256: 'c'.repeat(64),
          fuso_iana: 'America/Sao_Paulo', anexos: [], consentimento, codigo: null,
          estado: decisoes.length ? 'ASSINADO' : 'PENDENTE', assinatura_em: decisoes.length ? '2026-11-18T15:30:21Z' : null,
        },
      })
    }
    if (req.url().endsWith('/arquivo')) {
      expect(corpo).toEqual(escopo)
      return route.fulfill({ headers, contentType: 'application/pdf', body: '%PDF-1.7' })
    }
    decisoes.push(corpo)
    return route.fulfill({ headers, json: { estado: 'ASSINADO' } })
  })

  await page.goto(`/assinaturas/convite#${token}`)
  await expect(page.getByText('Ata sintética')).toBeVisible()
  await expect(page).toHaveURL(/\/assinaturas\/convite$/)
  expect(decisoes).toEqual([])
  const assinar = page.getByRole('button', { name: 'Confirmar assinatura' })
  await expect(assinar).toBeDisabled()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Baixar matriz aprovada para leitura' }).click()
  expect((await download).suggestedFilename()).toBe('matriz-aprovada.pdf')
  await expect(assinar).toBeDisabled()
  await page.getByLabel(consentimento).check()
  await assinar.click()
  await expect(page.getByText(/Assinatura eletrônica registrada/)).toBeVisible()
  expect(decisoes).toEqual([{ ...escopo, decisao: 'ASSINAR', consentimento: true }])
})
