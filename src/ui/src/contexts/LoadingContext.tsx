// loadingContext.tsx

import { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';
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
    const startupFinishedRef = useRef(false);

    // Show the global loading overlay only during the initial app bootstrap.
    // After the first hide, subsequent "true" updates are ignored to prevent flicker.
    const setLoadingStatus = useCallback((status: boolean) => {
        setLoading((prev) => {
            if (status) {
                if (startupFinishedRef.current) return prev;
                return true;
            }

            startupFinishedRef.current = true;
            return false;
        });
    }, []);

    return (
        <LoadingContext.Provider value={{ setLoadingStatus, loading }}>
            {loading && <LoadingScreen />}
            {children}
        </LoadingContext.Provider>
    );
};

export default LoadingProvider;