const express = require('express');
const cors = require('cors');
const { Client } = require('@notionhq/client');

const app = express();
const port = process.env.PORT || 8080;

// CORS 설정을 더 명시적으로 구성
app.use(cors({
    origin: [
        'https://hejdoohome-dashboard.web.app',
        'https://hejdoohome-dashboard.firebaseapp.com',
        'http://localhost:5173'
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
}));

// OPTIONS 요청에 대한 처리 추가
app.options('*', cors());

app.use(express.json());

// Notion 클라이언트 초기화
const notion = new Client({ 
    auth: process.env.NOTION_API_KEY
});

// 헬스 체크 엔드포인트
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Notion API 서버가 정상적으로 실행 중입니다.' });
});

// Notion API 엔드포인트
app.post('/api/notion/query', async (req, res) => {
    try {
        const { databaseId } = req.body;
        
        if (!databaseId) {
            return res.status(400).json({ 
                error: '잘못된 요청',
                message: 'database_id가 필요합니다'
            });
        }

        console.log('Notion API 요청:', { databaseId });
        
        const response = await notion.databases.query({
            database_id: databaseId,
            page_size: 100
        });

        console.log('Notion API 응답 성공');
        res.json(response);
    } catch (error) {
        console.error('Notion API 에러:', error);
        res.status(500).json({ 
            error: '서버 에러',
            message: error.message
        });
    }
});

// 서버 시작
app.listen(port, () => {
    console.log(`서버가 포트 ${port}에서 실행 중입니다`);
}); 