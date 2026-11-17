import React, { useContext } from 'react'
import { View, ScrollView, Linking, StyleSheet } from 'react-native'
import type { MaterialTopTabScreenProps } from '@react-navigation/material-top-tabs'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { version } from '../../package.json'
import type { RootStackParamList } from '../App'
import Text from '../components/Text'
import Setting from '../components/settings/Setting'
import DarkModeSetting from '../components/settings/DarkModeSetting'
import globalStyle from '../globalStyle'
import useDarkMode from '../context/useDarkMode'
import SettingsContext from '../context/settingsContext'

type StackProps = NativeStackScreenProps<RootStackParamList, 'Settings'>
type TabProps = MaterialTopTabScreenProps<RootStackParamList, 'Settings'>

const SettingScreen = ({ navigation }: StackProps | TabProps): React.JSX.Element => {
  const darkModeApp = useDarkMode()
  const { settings, setSettings } = useContext(SettingsContext)

  // TODO: Setting to disable autocomplete.
  return (
    <>
      <View style={darkModeApp ? globalStyle.darkHeader : globalStyle.header}>
        {navigation.getId() === 'StackNavigator' && (
          <View style={styles.backButton}>
            <Ionicons.Button
              name='chevron-back-sharp'
              iconStyle={styles.backButtonIcon}
              backgroundColor='#363636'
              onPress={() => navigation.goBack()}
            />
          </View>
        )}
        <Text style={globalStyle.title}>设置</Text>
      </View>
      <ScrollView>
        {/* <Text>Hermes in use: {(global as any).HermesInternal ? 'true' : 'false'}</Text> */}
        <DarkModeSetting
          value={settings.darkMode}
          setValue={darkMode => setSettings({ darkMode })}
        />
        <Setting
          multiline
          maxLength={256}
          name='进服消息'
          value={settings.joinMessage}
          setValue={joinMessage => setSettings({ joinMessage })}
        />
        <Setting
          name='自动发送进服消息'
          value={settings.sendJoinMessage}
          setValue={sendJoinMessage => setSettings({ sendJoinMessage })}
        />
        <Setting
          name='自动发送 /spawn 命令'
          value={settings.sendSpawnCommand}
          setValue={sendSpawnCommand => setSettings({ sendSpawnCommand })}
        />
        <Setting
          name='允许点击聊天中的链接'
          value={settings.webLinks}
          setValue={webLinks => setSettings({ webLinks })}
        />
        {/* <Setting
          name='Prompt on opening links'
          value={settings.linkPrompt}
          setValue={linkPrompt => setSettings({ linkPrompt })}
        /> */}
        <Setting
          name='启用 1.19 聊天签名'
          value={settings.enableChatSigning}
          setValue={enableChatSigning => setSettings({ enableChatSigning })}
        />
        <Setting
          name='关闭聊天输入自动纠错'
          value={settings.disableAutoCorrect}
          setValue={disableAutoCorrect => setSettings({ disableAutoCorrect })}
        />
        {/* TODO: Text Font, Font Size, Chat Theme */}
        <Setting
          name='版本'
          value={version}
          onClick={() => {
            const url = `https://github.com/retrixe/EnderChat/releases/${version}`
            Linking.openURL(url).catch(console.error)
          }}
        />
        <Setting
          name='反馈与支持'
          value='点击打开 GitHub Issues 页面，或加入我们的 Discord！'
          onClick={() => {
            const url = 'https://github.com/retrixe/EnderChat/issues'
            Linking.openURL(url).catch(console.error)
          }}
        />
        <Setting
          name='Discord 服务器'
          value='点击打开 Discord 服务器邀请链接。'
          onClick={() => {
            const url = 'https://discord.gg/MFSJa9TpPS'
            Linking.openURL(url).catch(console.error)
          }}
        />
        <Setting
          name='赞助作者，请我喝杯咖啡！'
          value='点击打开作者的 GitHub 赞助页面。'
          onClick={() => {
            const url = 'https://github.com/sponsors/retrixe'
            Linking.openURL(url).catch(console.error)
          }}
        />
        <Setting
          name='许可证'
          value='Mozilla Public License 2.0'
          onClick={() => {
            const url = 'https://www.mozilla.org/en-US/MPL/2.0/'
            Linking.openURL(url).catch(console.error)
          }}
        />
        <Setting
          name='隐私政策'
          value='点击在浏览器中打开隐私政策。'
          onClick={() => {
            const url = 'https://github.com/retrixe/EnderChat#privacy-policy'
            Linking.openURL(url).catch(console.error)
          }}
        />
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  backButton: { marginRight: 8 },
  backButtonIcon: { marginRight: 0 },
})

export default SettingScreen
