// Firebase 설정을 export
export const firebaseConfig = {
    apiKey: "AIzaSyAyhRpZmtfCCa8IajLPUld43o3MIovI85A",
    authDomain: "hejdoohome-dashboard.firebaseapp.com",
    databaseURL: "https://hejdoohome-dashboard-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "hejdoohome-dashboard",
    storageBucket: "hejdoohome-dashboard.appspot.com",
    messagingSenderId: "824702367003",
    appId: "1:824702367003:web:ef829133d3e5f216354fbe",
    measurementId: "G-BD1SEL028K"
};

// 전역 변수로만 선언
window.CONFIG = {
    API: {
        KEY: 'AIzaSyD1I839Np6CFFysPqwSQlxBDYPiFzguBiM',
    },
    SHEETS: {
        ID: '1DuDFQ9cMU7Wfqc92YOcAK_591eMbEy7COGG9PQJE2JY',
        RANGES: {
            CHANNEL: 'channel!A2:E',
            SMARTSTORE: 'smartstore!A2:P',
            OHOUSE: 'ohouse!A2:AO',
            OHOUSE2: 'ohouse2!A2:AO',
            YTSHOPPING: 'YTshopping!A2:R',
            MAPPING: 'mapping!A2:F'
        },
        CHANNEL_COLUMNS: {
            PRODUCT: 0,
            OPTION: 1,
            SMARTSTORE: 2,
            OHOUSE: 3,
            YTSHOPPING: 4
        }
    },
    FIREBASE: firebaseConfig,
    SALES: {
        ZERO_SALES_STATUSES: ['취소', '반품', '미결제취소'],
        CHANNELS: {
            SMARTSTORE: '스마트스토어',
            OHOUSE: '오늘의집',
            YTSHOPPING: '유튜브쇼핑'
        },
        DEFAULT_COMMISSION_RATE: 0
    }
}; 