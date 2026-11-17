import React, { useContext, useState } from 'react'
import { StyleSheet, View, Pressable, Image } from 'react-native'

import MicrosoftLogin from './MicrosoftLogin'
import globalStyle from '../../globalStyle'
import Text from '../Text'
import Dialog, { dialogStyles } from '../Dialog'
import TextField from '../TextField'
import useDarkMode from '../../context/useDarkMode'
import UsersContext from '../../context/accountsContext'
import { authenticate } from '../../minecraft/api/yggdrasil'

import MicrosoftIcon from '../../assets/microsoft.png'

const AddAccountDialog = ({
  open,
  setOpen,
}: {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
}): React.JSX.Element => {
  const darkMode = useDarkMode()
  const { accounts, setAccounts } = useContext(UsersContext)

  const [userRed, setUserRed] = useState(false)
  // const [passRed, setPassRed] = useState(false)
  const [newUser, setNewUser] = useState('')
  const [password, setPassword] = useState<string | null>(null)
  const [dialogError, setDialogError] = useState('')
  const [microsoftLogin, setMicrosoftLogin] = useState(false)

  const invalidNewUser =
    !!newUser &&
    !/^[A-Za-z0-9_]{3,16}$/.test(newUser) &&
    (password === null ? true : !/^[^\s@]+@[^\s@]+$/.test(newUser))

  const cancelAddAccount = (): void => {
    setMicrosoftLogin(false)
    setOpen(false)
    setUserRed(false)
    // setPassRed(false)
    setNewUser('')
    setPassword(null) // setPassword('')
    setDialogError('')
  }
  const addAccount = (): void => {
    const accountExists =
      !!accounts[newUser] ||
      !!Object.keys(accounts).find(id => 'email' in accounts[id] && accounts[id].email === newUser)
    if (!newUser || invalidNewUser || password === '' || accountExists) {
      // setPassRed(password === '')
      setUserRed(!newUser)
      if (accountExists) {
        setDialogError('该账号已存在！请先删除它。')
      }
      return
    }
    if (password === null) {
      setAccounts({
        ...accounts,
        [newUser]: {
          username: newUser,
          active: Object.keys(accounts).length === 0,
        },
      })
      cancelAddAccount()
    } else {
      authenticate(newUser, password, true)
        .then(({ clientToken, accessToken, selectedProfile: { name, id } }) => {
          setAccounts({
            ...accounts,
            [id]: {
              active: Object.keys(accounts).length === 0,
              username: name,
              email: newUser,
              accessToken,
              clientToken,
              type: 'mojang',
            },
          })
          cancelAddAccount()
        })
        .catch((e: unknown) => {
          setUserRed(true)
          // setPassRed(true)
          setDialogError(
            e instanceof Error
              ? e.message.replace('Invalid credentials. ', '')
              : '发生未知错误！',
          )
        })
    }
  }

  return (
    <>
      {microsoftLogin && <MicrosoftLogin close={cancelAddAccount} />}
      <Dialog visible={open && !microsoftLogin} onRequestClose={cancelAddAccount}>
        <Text style={dialogStyles.modalTitle}>添加账号</Text>
        <Pressable
          style={styles.microsoftButton}
          android_ripple={{ color: '#aaa' }}
          onPress={() => setMicrosoftLogin(true)}
        >
          <Image source={MicrosoftIcon} />
          <Text style={styles.microsoftButtonText}>使用微软账号登录</Text>
        </Pressable>
        <Text style={styles.discontinued}>
          注意：Mojang 账号已停止使用，请先在电脑上迁移为微软账号再登录。
        </Text>
        <View style={styles.divider} />
        <Text style={styles.subheader}>离线模式（不推荐）</Text>
        <TextField
          red={userRed || invalidNewUser}
          value={newUser}
          onChangeText={setNewUser}
          keyboardType='email-address'
          placeholder={'用户名' + (password !== null ? '/邮箱' : '')}
        />
        {/* <Pressable
          style={styles.auth}
          onPress={() => setPassword(p => (p === null ? '' : null))}
        >
          <Text style={darkMode ? styles.authTextDark : styles.authText}>
            Offline Mode (discouraged)
          </Text>
          <View style={globalStyle.flexSpacer} />
          <Switch
            value={password === null}
            thumbColor='#ffaaaa'
            ios_backgroundColor='#ffaaaa'
            trackColor={{ true: '#ff0000', false: '#ffdddd' }}
            onValueChange={() => setPassword(p => (p === null ? '' : null))}
          />
        </Pressable>
        {typeof password === 'string' && (
          <TextField
            red={passRed}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder='Password'
          />
        )} */}
        {dialogError ? <Text style={styles.dialogError}>{dialogError}</Text> : false}
        <View style={dialogStyles.modalButtons}>
          <View style={globalStyle.flexSpacer} />
          <Pressable
            onPress={cancelAddAccount}
            android_ripple={{ color: '#aaa' }}
            style={dialogStyles.modalButton}
          >
            <Text
              style={
                darkMode
                  ? dialogStyles.modalButtonCancelDarkText
                  : dialogStyles.modalButtonCancelText
              }
            >
              取消
            </Text>
          </Pressable>
          <Pressable
            onPress={addAccount}
            android_ripple={{ color: '#aaa' }}
            style={dialogStyles.modalButton}
          >
            <Text style={dialogStyles.modalButtonText}>添加</Text>
          </Pressable>
        </View>
      </Dialog>
    </>
  )
}

const styles = StyleSheet.create({
  microsoftButton: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 3,
    padding: 8,
  },
  microsoftButtonText: { color: '#ffffff', fontWeight: 'bold', marginLeft: 8 },
  dialogError: { color: '#ff6666', marginTop: 10, marginBottom: 10 },
  auth: { marginTop: 8, flexDirection: 'row', alignItems: 'center' },
  authText: { fontSize: 14, color: '#666666' },
  authTextDark: { fontSize: 14, color: '#aaa' },
  divider: {
    marginTop: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#afafaf',
  },
  discontinued: { fontSize: 14, fontWeight: 'bold', marginTop: 8 },
  subheader: { fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
})

export default AddAccountDialog
