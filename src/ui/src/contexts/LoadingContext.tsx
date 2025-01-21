// loadingContext.tsx

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import LoadingScreen from '../components/frame/LoadingScreenComponent';

interface LoadingContextProps {
    setLoadingStatus: (status: boolean) => void;
    loading: boolean;
}

const LoadingContext = createContext<LoadingContextProps | undefined>(undefined);

export const useLoading = () => {
    const context = useContext(LoadingContext);
    if (!context) {
        throw new Error('useLoading must be used within a LoadingProvider');
    }
    return context;
};

interface LoadingProviderProps {
    children: ReactNode;
}

const LoadingProvider = ({ children }: LoadingProviderProps) => {
    const [loading, setLoading] = useState<boolean>(true);

    // `useCallback` per evitare la ricreazione della funzione ad ogni render
    const setLoadingStatus = useCallback((status: boolean) => {
        setLoading(status);
    }, []);

    return (
        <LoadingContext.Provider value={{ setLoadingStatus, loading }}>
            {loading && <LoadingScreen />}
            {children}
        </LoadingContext.Provider>
    );
};

export default LoadingProvider;