const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const { Client } = require('@notionhq/client');
const admin = require('firebase-admin');

admin.initializeApp();

const app = express();

// CORS 설정을 더 명시적으로 구성
app.use(cors({
    origin: [
        'https://hejdoohome-dashboard.web.app',
        'https://hejdoohome-dashboard.firebaseapp.com',
        'http://localhost:3000'
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());

const notion = new Client({ 
    auth: functions.config().notion.api_key
});

app.post('/api/notion/query', async (req, res) => {
    try {
        const { databaseId } = req.body;
        
        if (!databaseId) {
            return res.status(400).json({ 
                error: '잘못된 요청',
                message: 'database_id가 필요합니다'
            });
        }

        const response = await notion.databases.query({
            database_id: databaseId,
            page_size: 100
        });

        res.json(response);
    } catch (error) {
        console.error('Notion API 에러:', error);
        res.status(500).json({ 
            error: '서버 에러',
            message: error.message
        });
    }
});

exports.api = functions.https.onRequest(app); 