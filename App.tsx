import React, { useEffect } from "react";
import { StatusBar } from 'expo-status-bar';

import { Amplify } from "aws-amplify";
import { Authenticator } from "@aws-amplify/ui-react-native";

import outputs from "./amplify_outputs.json";
import { AppProvider } from './src/contexts/AppContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { isDevMode, DEV_CONFIG } from './src/config/dev';

Amplify.configure(outputs);

// 开发模式组件 - 跳过认证
const DevApp = () => {
  useEffect(() => {
    DEV_CONFIG.showDevModeAlert();
  }, []);

  return (
    <AppProvider>
      <StatusBar style="auto" />
      <AppNavigator />
    </AppProvider>
  );
};

// 生产模式组件 - 需要认证
const ProdApp = () => {
  return (
    <Authenticator.Provider>
      <Authenticator>
        <AppProvider>
          <StatusBar style="auto" />
          <AppNavigator />
        </AppProvider>
      </Authenticator>
    </Authenticator.Provider>
  );
};

const App = () => {
  return isDevMode() ? <DevApp /> : <ProdApp />;
};

export default App;