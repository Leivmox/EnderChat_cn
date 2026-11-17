export const loginUrl =
  'https://login.live.com/oauth20_authorize.srf' +
  '?client_id={CLIENT_ID}' +
  '&response_type=code' +
  '&scope={SCOPE}' +
  '&redirect_uri=https%3A%2F%2Flogin.live.com%2Foauth20_desktop.srf'
export const redirectUrlPrefix = 'https://login.live.com/oauth20_desktop.srf?code='
const authTokenUrl = 'https://login.live.com/oauth20_token.srf'
const redirectUri = 'https://login.live.com/oauth20_desktop.srf'
const xblAuthUrl = 'https://user.auth.xboxlive.com/user/authenticate'
const xstsAuthUrl = 'https://xsts.auth.xboxlive.com/xsts/authorize'
const mcLoginUrl = 'https://api.minecraftservices.com/authentication/login_with_xbox'
const mcStoreUrl = 'https://api.minecraftservices.com/entitlements/mcstore'
const mcProfileUrl = 'https://api.minecraftservices.com/minecraft/profile'

export const getMSAuthToken = async (
  authorizationCode: string,
  clientId: string,
  scope: string,
): Promise<[string, string]> => {
  const body = `client_id=${clientId}
 &scope=${encodeURIComponent(scope)}
 &code=${encodeURIComponent(authorizationCode)}
 &grant_type=authorization_code
 &redirect_uri=${encodeURIComponent(redirectUri)}`
  const req = await fetch(authTokenUrl, {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  if (!req.ok) throw new Error('Failed to request auth token from Microsoft!')
  const res = (await req.json()) as { access_token: string; refresh_token: string }
  // { "expires_in":86400 }
  return [res.access_token, res.refresh_token]
}

export const refreshMSAuthToken = async (
  refreshToken: string,
  clientId: string,
  scope: string,
): Promise<[string, string]> => {
  const body = `client_id=${clientId}
 &scope=${encodeURIComponent(scope)}
 &refresh_token=${encodeURIComponent(refreshToken)}
 &grant_type=refresh_token
 &redirect_uri=${encodeURIComponent(redirectUri)}`
  const req = await fetch(authTokenUrl, {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  if (!req.ok) throw new Error('Failed to request auth token from Microsoft!')
  const res = (await req.json()) as { access_token: string; refresh_token: string }
  // { "expires_in":86400 }
  return [res.access_token, res.refresh_token]
}

export const getXboxLiveTokenAndUserHash = async (authToken: string): Promise<[string, string]> => {
  const req = await fetch(xblAuthUrl, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    method: 'POST',
    body: JSON.stringify({
      Properties: {
        AuthMethod: 'RPS',
        SiteName: 'user.auth.xboxlive.com',
        RpsTicket: authToken, // sometimes it needs t= or d= prefix lol
      },
      RelyingParty: 'http://auth.xboxlive.com',
      TokenType: 'JWT',
    }),
  })
  if (!req.ok) throw new Error('Failed to request auth token from Xbox Live!')
  const res = (await req.json()) as { Token: string; DisplayClaims: { xui: [{ uhs: string }] } }
  // {"IssueInstant":"2020-12-07T19:52:08.4463796Z", "NotAfter":"2020-12-21T19:52:08.4463796Z"}
  return [res.Token, res.DisplayClaims.xui[0].uhs]
}

export const getXstsTokenAndUserHash = async (xboxLiveToken: string): Promise<[string, string]> => {
  const req = await fetch(xstsAuthUrl, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    method: 'POST',
    body: JSON.stringify({
      Properties: { SandboxId: 'RETAIL', UserTokens: [xboxLiveToken] },
      RelyingParty: 'rp://api.minecraftservices.com/',
      TokenType: 'JWT',
    }),
  })
  if (req.status === 401) throw new XstsError((await req.json()) as XstsErrorInterface)
  if (!req.ok) throw new Error('Failed to request XSTS token from Xbox Live!')
  const res = (await req.json()) as { Token: string; DisplayClaims: { xui: [{ uhs: string }] } }
  // {"IssueInstant":"2020-12-07T19:52:08.4463796Z", "NotAfter":"2020-12-21T19:52:08.4463796Z"}
  return [res.Token, res.DisplayClaims.xui[0].uhs]
}

export const authenticateWithXsts = async (
  xstsToken: string,
  xboxUserHash: string,
): Promise<string> => {
  const req = await fetch(mcLoginUrl, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    method: 'POST',
    body: JSON.stringify({
      identityToken: `XBL3.0 x=${xboxUserHash};${xstsToken}`,
    }),
  })
  if (!req.ok) throw new Error('Failed to authenticate with Mojang via MSA!')
  const res = (await req.json()) as { access_token: string }
  // {"expires_in":86400}
  return res.access_token
}

export const checkGameOwnership = async (accessToken: string): Promise<boolean> => {
  const req = await fetch(mcStoreUrl, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })
  if (!req.ok) throw new Error('Failed to check if user owns Minecraft game!')
  const res = (await req.json()) as { items: { name: string }[] }
  return !!(
    res.items.length >= 2 &&
    res.items.find(item => item.name === 'game_minecraft') &&
    res.items.find(item => item.name === 'product_minecraft')
  )
}

interface GameProfile {
  id: string
  name: string
  capes: {
    id: string
    url: string
    alias?: string
    state?: 'ACTIVE'
  }[]
  skins: {
    id: string
    url: string
    state?: 'ACTIVE'
    alias?: 'STEVE' | 'ALEX'
    variant: 'CLASSIC' | 'SLIM'
  }[]
}

export const getGameProfile = async (accessToken: string): Promise<GameProfile> => {
  const req = await fetch(mcProfileUrl, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })
  if (!req.ok && req.status !== 404) {
    throw new Error('Failed to check if user owns Minecraft game!')
  }
  const res = (await req.json()) as GameProfile | { error: string; errorMessage: string }
  if (
    'error' in res &&
    res.error === 'NOT_FOUND' &&
    res.errorMessage === 'The server has not found anything matching the request URI'
  ) {
    throw new Error('该用户没有购买 Minecraft！')
  } else if ('error' in res) throw new Error(`${res.error}: ${res.errorMessage}`)
  return res
}

export const XstsErrorCodes: Record<string, string> = {
  2148916235: '该账号所在的国家/地区无法使用 Xbox Live（已被封禁）。',
  2148916238:
    '该账号是儿童账号（未满 18 岁），必须由成年人将其加入家庭组后才能继续。' +
    '这通常只在使用自建 Microsoft Azure 应用时出现；' +
    '使用 Minecraft 启动器的客户端 ID 时不会触发。',
  2148916233:
    '该账号还没有 Xbox 账号。注册 Xbox 账号后' +
    '（或在 minecraft.net 登录以创建）即可继续登录。' +
    '已经用微软账号购买过 Minecraft 的账号通常不会遇到这个问题，' +
    '因为购买时已经走完了 Xbox 注册流程。',
}

interface XstsErrorInterface {
  XErr: keyof XstsError
  Code: number
  Message: string
}

export class XstsError extends Error {
  Code = 401
  XErrMessage = '暂无详细信息。'
  XErr: keyof XstsError
  constructor(response: XstsErrorInterface) {
    super(response.Message)
    this.XErr = response.XErr
    this.Code = response.Code
    this.XErrMessage = XstsErrorCodes[this.XErr] || '暂无详细信息。'
  }
}
