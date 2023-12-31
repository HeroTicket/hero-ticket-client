'use client';

import * as React from 'react';
import {
  RainbowKitProvider,
  getDefaultWallets,
  connectorsForWallets,
} from '@rainbow-me/rainbowkit';
import {
  argentWallet,
  trustWallet,
  ledgerWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { configureChains, createConfig, useAccount, WagmiConfig } from 'wagmi';
import {
  polygonMumbai,
} from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import axios, { AxiosError } from 'axios';
import { QueryClient, QueryClientProvider, useMutation, useQuery } from 'react-query';
import { alchemyProvider } from 'wagmi/providers/alchemy';
// ==================== Interfaces ====================

interface UserInfo {
  // 사용자 정보 타입 
  accountAddress: string;
  avatar: string;
  banner: string;
  bio: string;
  createdAt: number;
  id: string;
  isAdmin: boolean;
  name: string;
  tbaAddress: string;
  tbaTokenBalance: string;
  updatedAt: number;
}

interface UserInfoResponse {
  status: number;
  message: string;
  data: UserInfo;
}

interface UserRegistrationResponse {
  status: number;
  message: string;
  data: UserInfo;
}

// ==================== Context ====================

export const authContext = React.createContext({
  isLoading: true,
  isLoggedIn: false,
  isRegistered: false,
  addressMatched: false,
  accessToken: '',
  userInfo: {} as UserInfo | null,
  login: (tokenPair: any) => { },
  logout: () => { },
  registerUser: (): Promise<UserInfo> => {
    return new Promise<UserInfo>((resolve, reject) => {
      reject(new Error("registerUser not implemented"));
    });
  }
});

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [accessToken, setAccessToken] = React.useState<string>('');
  const [refreshIntervalId, setRefreshIntervalId] = React.useState<NodeJS.Timeout>();
  const [isRegistered, setIsRegistered] = React.useState<boolean>(false);
  const [userInfo, setUserInfo] = React.useState<UserInfo | null>(null);
  const [addressMatched, setAddressMatched] = React.useState<boolean>(false);

  const login = (tokenPair: any) => {
    sessionStorage.setItem('heroticket.jwtToken', JSON.stringify(tokenPair));
    setAccessToken(tokenPair.accessToken);
    setIsLoggedIn(true);

    const intervalId = setInterval(refreshAccessToken, 15 * 60 * 1000);
    setRefreshIntervalId(intervalId);
  }

  const logout = () => {
    sessionStorage.removeItem('heroticket.jwtToken');
    setAccessToken('');
    setIsLoggedIn(false);
    clearInterval(refreshIntervalId);
  };

  const refreshAccessToken = async () => {
    const jwtToken = sessionStorage.getItem('heroticket.jwtToken');
    if (!jwtToken) {
      throw new Error("No JWT Token found");
    }

    const tokenData = JSON.parse(jwtToken);
    const { refreshToken } = tokenData;

    // 서버로부터 새로운 토큰 쌍 받기
    const response = await axios.post(`${process.env.NEXT_PUBLIC_SERVER_URL}/users/refresh`, {
      refreshToken: refreshToken
    }, {
      headers: {
        "Content-Type": 'application/json',
      },
    });

    if (response.status !== 200) {
      throw new Error("Failed to refresh access token with status code " + response.status);
    }

    // 새 accessToken으로 jwtToken 업데이트
    const updatedTokenData = response.data.data;

    console.log("Successfully refreshed access token");

    // 업데이트된 jwtToken을 sessionStorage에 저장
    sessionStorage.setItem('heroticket.jwtToken', JSON.stringify(updatedTokenData));

    // 업데이트된 accessToken을 state에 저장
    setAccessToken(updatedTokenData.accessToken);

    setIsLoggedIn(true);
  }

  const registerUser = async (): Promise<UserInfo> => {
    const response = await axios.post<UserRegistrationResponse>(`${process.env.NEXT_PUBLIC_SERVER_URL}/users/register/${address}`, {}, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      timeout: 180000, // 3분
    });

    if (response.status !== 201) {
      throw new AxiosError(response.data.message, response.status.toString(), undefined, null, response)
    }

    return response.data.data;
  };

  const fetchUserInfo = async (): Promise<UserInfo> => {
    const response = await axios.get<UserInfoResponse>(`${process.env.NEXT_PUBLIC_SERVER_URL}/users/info`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status !== 200) {
      throw new Error("Failed to fetch user info with status code " + response.status);
    }

    return response.data.data;
  };

  const userInfoQuery = useQuery<UserInfo, AxiosError>(
    ['userInfo', accessToken, address],
    () => {
      // accessToken과 address가 유효한지 확인
      if (!accessToken || !address) {
        throw new Error("Missing accessToken or address");
      }
      return fetchUserInfo();
    },
    {
      // accessToken과 address가 모두 있는 경우에만 쿼리 활성화
      enabled: !!accessToken && !!address,
      onSuccess: (data) => {
        console.log('User info fetched:', data);
        setUserInfo(data);
        setIsRegistered(true);
      },
      onError: (error) => {
        // 404
        if (error.response?.status === 404) {
          setIsRegistered(false);
        }

        console.error('Error fetching user info:', error);
      },
    },
  );

  React.useEffect(() => {
    if (isConnected) {
      setIsLoading(true);

      refreshAccessToken().then(() => {
        const intervalId = setInterval(refreshAccessToken, 15 * 60 * 1000);

        setRefreshIntervalId(intervalId);

        return () => clearInterval(intervalId);
      }).catch((error) => {
        console.log(error);
        setIsLoggedIn(false);
        setAccessToken('');
        clearInterval(refreshIntervalId);
      }).finally(() => {
        setIsLoading(false);
      });
    } else {
      setIsLoggedIn(false);
      setAccessToken('');
      clearInterval(refreshIntervalId);
      setIsLoading(false);
    }
  }, [isConnected]);

  React.useEffect(() => {
    if (userInfo) {
      // address와 accessToken이 일치하는지 확인 => lowercase로 변환해서 비교
      const addressMatched = userInfo.accountAddress.toLowerCase() === address?.toLowerCase();

      setAddressMatched(addressMatched);
    }
  }, [userInfo]);


  return (
    <authContext.Provider value={{ isLoading, isLoggedIn, isRegistered, addressMatched, accessToken, userInfo, login, logout, registerUser }}>
      {children}
    </authContext.Provider>
  );
}

// ==================== Query Provider ====================

function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// ==================== Providers ====================

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [polygonMumbai],
  [alchemyProvider({ apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || '' }), publicProvider()]
);

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_ID || '';

const { wallets } = getDefaultWallets({
  appName: 'Hero Ticket Demo',
  projectId,
  chains,
});

const demoAppInfo = {
  appName: 'Hero Ticket Demo',
};

const connectors = connectorsForWallets([
  ...wallets,
  {
    groupName: 'Other',
    wallets: [
      argentWallet({ projectId, chains }),
      trustWallet({ projectId, chains }),
      ledgerWallet({ projectId, chains }),
    ],
  },
]);

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);


  React.useEffect(() => setMounted(true), []);
  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider chains={chains} appInfo={demoAppInfo}>
        {mounted && (
          <QueryProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </QueryProvider>
        )}
      </RainbowKitProvider>
    </WagmiConfig>
  );
}