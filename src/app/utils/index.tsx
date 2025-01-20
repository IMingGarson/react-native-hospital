import AsyncStorage from "@react-native-async-storage/async-storage";

interface Store {
    data: unknown;
    ttl: Date;
}

export const AsyncStorageRemoveItem = async (key: string) => {
    try {
        await AsyncStorage.removeItem(key);
    } catch (error) {
        console.error(error);
        return false;
    }
    return true;
}

export const AsyncStorageSetItem = async (key: string, data: string, ttl: number = 7 * 86400) => {
    try {
        const store: Store = { data, ttl: getExpireDatetime(ttl) }
        await AsyncStorage.setItem(key, JSON.stringify(store));
    } catch (error) {
        console.error(error);
        return false;
    }
    return true;
}

export const AsyncStorageGetItem = async (key: string) => {
    try {
        const store: string | null = await AsyncStorage.getItem(key);
        if (!store) {
            return null;
        }
        if (!isJsonString(store)) {
            return null;
        }
        const parsedData: Store = JSON.parse(store);
        if (new Date(parsedData.ttl) < (new Date())) {
            return null;
        }
        return parsedData.data;
    } catch (error) {
        console.error(error);
        return null;
    }
}

export const isJsonString = (data: string | null) => {
    if (!data) {
        return false;
    }
    try {
        JSON.parse(data);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e: unknown) {
        return false;
    }
    return true;
}


const getExpireDatetime = (seconds: number) => {
    const now = new Date();
    const expireTime = new Date(now);
    expireTime.setSeconds(now.getSeconds() + seconds);
    return expireTime;
}