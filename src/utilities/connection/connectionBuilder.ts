import type { Accounts } from '../../context/accountsContext'
import type { DisconnectReason } from '../../context/connectionContext'
import type { Session, Sessions, SetSession } from '../../context/sessionStore'
import type { Servers } from '../../context/serversContext'
import type { Settings } from '../../context/settingsContext'
import {
  authenticateWithXsts,
  getXboxLiveTokenAndUserHash,
  getXstsTokenAndUserHash,
  refreshMSAuthToken,
} from '../../minecraft/api/microsoft'
import { getPlayerCertificates } from '../../minecraft/api/mojang'
import { refresh } from '../../minecraft/api/yggdrasil'
import initiateConnection, { type ServerConnection } from '../../minecraft/connection'
import { parseIp, protocolMap, resolveHostname } from '../../minecraft/utils'
import config from '../../../config.json'

export const getSession = async (
  version: number,
  accounts: Accounts,
  sessions: Sessions,
  setSession: SetSession,
  setLoading: (msg: string) => void,
  setAccounts: (accs: Accounts) => void,
): Promise<Session | string> => {
  const activeAccount = Object.keys(accounts).find(e => accounts[e].active)
  if (!activeAccount) {
    return '没有选择当前账号！请到“账号”页添加一个账号。'
  }
  const uuid = accounts[activeAccount].type ? activeAccount : undefined

  // Create an updated "session" containing access tokens and certificates.
  let session = sessions[activeAccount]
  const is119 = version >= protocolMap[1.19]
  // TODO: We should store session store in a persistent cache.
  // Certificates and access tokens should be updated regularly.
  if (uuid && (!session || (!session.certificate && is119))) {
    // We should probably lock access to them via a semaphore.
    try {
      // Create a session with the latest access token.
      const account = accounts[activeAccount]
      if (!session && account.type === 'microsoft') {
        setLoading('正在重新加载微软账号...')
        const [msAccessToken, msRefreshToken] = await refreshMSAuthToken(
          account.microsoftRefreshToken,
          config.clientId,
          config.scope,
        )
        const [xlt, xuh] = await getXboxLiveTokenAndUserHash(msAccessToken)
        const [xstsToken] = await getXstsTokenAndUserHash(xlt)
        const accessToken = await authenticateWithXsts(xstsToken, xuh)
        session = { accessToken }
        setAccounts({
          ...accounts,
          [activeAccount]: {
            ...account,
            accessToken,
            microsoftAccessToken: msAccessToken,
            microsoftRefreshToken: msRefreshToken,
          },
        })
      } else if (!session && account.type === 'mojang') {
        setLoading('正在重新加载 Mojang 账号...')
        const { accessToken, clientToken } = await refresh(
          account.accessToken,
          account.clientToken,
          false,
        )
        session = { accessToken }
        setAccounts({
          ...accounts,
          [activeAccount]: { ...account, accessToken, clientToken },
        })
      }
      // If connecting to 1.19, get player certificates.
      if (!session.certificate && is119) {
        const token = session.accessToken
        session.certificate = await getPlayerCertificates(token)
      }
      setSession(activeAccount, session)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      return '创建会话失败！你可能需要到“账号”页重新登录微软账号。'
    }
  }
  return session
}

export const createConnection = async (
  server: string,
  version: number,
  servers: Servers,
  session: Session | undefined,
  settings: Settings,
  accounts: Accounts,
  setConnection: (conn?: ServerConnection) => void,
  closeChatScreen: (reason?: DisconnectReason) => void,
): Promise<ServerConnection | string> => {
  let host: string
  let port: number
  try {
    const [hostname, portNumber] = parseIp(servers[server].address)
    ;[host, port] = await resolveHostname(hostname, portNumber)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return '无法解析服务器地址！'
  }

  const activeAccount = Object.keys(accounts).find(e => accounts[e].active)
  if (!activeAccount) {
    return '没有选择当前账号！请到“账号”页添加一个账号。'
  }
  const uuid = accounts[activeAccount].type ? activeAccount : undefined

  try {
    const newConn = await initiateConnection({
      serverName: server,
      host,
      port,
      username: accounts[activeAccount].username,
      protocolVersion: version,
      selectedProfile: uuid,
      accessToken: session?.accessToken,
      certificate: settings.enableChatSigning ? session?.certificate : undefined,
    })
    const onCloseOrError = (): void => {
      const reason = newConn.disconnectReason
      closeChatScreen(reason ? { server, reason } : undefined)
      setConnection(undefined)
    }
    newConn.on('close', onCloseOrError)
    newConn.on('error', onCloseOrError)
    return newConn
  } catch (e) {
    console.error(e)
    return '连接服务器失败！'
  }
}
